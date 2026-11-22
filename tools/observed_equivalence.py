#!/usr/bin/env python3
"""Derive optional comparison-equivalence certificates at request time.

The committed observation input contains only unchanged-baseline operand facts.
This module combines those facts with the current AST-certified comparison edits;
it never reads a failure manifest, sample answer, or a precomputed edit answer.
An incomplete or inconsistent observation profile disables this optimization.
"""
from __future__ import annotations

import argparse
import ast
from copy import deepcopy
from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path
import re
import sys


BASE_COMMIT = "eb11aec4be8cb2122afe713a4816662c3f0fb2fa"
FACT_SCHEMA = [
    "left:[exact_primitive,eq_slot,ne_slot,canonical_enum_string]",
    "right:[exact_primitive,eq_slot,ne_slot,canonical_enum_string]",
    "same_type", "same_object",
]
PAIRS = {("Is", "Eq"), ("Eq", "Is"), ("IsNot", "NotEq"), ("NotEq", "IsNot")}
OPERATIONS = {operation for pair in PAIRS for operation in pair}
PRIMITIVE_SLOTS = {
    "none": ("object", "object"), "bool": ("unknown", "unknown"),
    "int": ("unknown", "unknown"), "float": ("unknown", "unknown"),
    "complex": ("unknown", "unknown"), "str": ("str", "str"),
    "bytes": ("unknown", "unknown"),
}
SLOTS = {"object", "str", "unknown"}
COORDINATES = re.compile(r"([1-9][0-9]*):(0|[1-9][0-9]*):([1-9][0-9]*):(0|[1-9][0-9]*)\Z")
SHA256 = re.compile(r"[0-9a-f]{64}\Z")


class InvalidProfile(ValueError):
    """The baseline observation input cannot support a completeness claim."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise InvalidProfile(message)


def is_integer(value) -> bool:
    return type(value) is int


def test_numbers(value, count: int, label: str) -> frozenset[int]:
    require(type(value) is list, f"{label} must be an array")
    require(all(is_integer(number) and 0 <= number < count for number in value),
            f"{label} contains an invalid test number")
    require(value == sorted(set(value)), f"{label} must be unique and sorted")
    return frozenset(value)


def coordinates(value: str) -> tuple[int, int, int, int]:
    require(type(value) is str and COORDINATES.fullmatch(value) is not None,
            "invalid baseline comparison coordinates")
    start, column, end, end_column = (int(part) for part in value.split(":"))
    require(end > start or (end == start and end_column > column),
            "empty or reversed baseline comparison span")
    return start, column, end, end_column


def valid_path(path) -> bool:
    return (type(path) is str and path.endswith(".py") and not path.startswith("/")
            and "\\" not in path and not any(character.isspace() or ord(character) < 32 for character in path)
            and all(part not in ("", ".", "..") for part in path.split("/")))


def validate_operand(value) -> tuple:
    require(type(value) is list and len(value) == 4, "operand fact must have four fields")
    primitive, equal, unequal, enum_string = value
    require(type(primitive) is str and primitive in {*PRIMITIVE_SLOTS, "other"},
            "unknown primitive fact tag")
    require(type(equal) is str and equal in SLOTS and type(unequal) is str and unequal in SLOTS,
            "unknown comparison slot fact tag")
    require(enum_string is None or type(enum_string) is str, "invalid enum scalar fact")
    if primitive in PRIMITIVE_SLOTS:
        require((equal, unequal) == PRIMITIVE_SLOTS[primitive] and enum_string is None,
                "inconsistent exact primitive slots")
    if enum_string is not None:
        require(primitive == "other" and equal == unequal == "str",
                "enum scalar requires both original str comparison slots")
    return primitive, equal, unequal, enum_string


def fact_proves_equivalence(value) -> bool:
    """Prove the four supported operator swaps from one neutral observation.

    BOTH equality and inequality slots are checked, including the right operand:
    a reflected comparison, custom __ne__, or NaN cannot be assumed harmless.
    This function never executes either comparison on a profiled program object.
    """
    require(type(value) is list and len(value) == 4, "comparison fact must have four fields")
    left, right = validate_operand(value[0]), validate_operand(value[1])
    same_type, same_object = value[2:]
    require(type(same_type) is bool and type(same_object) is bool,
            "type and identity facts must be booleans")
    require(not same_object or same_type, "identical operands must have identical types")
    if left[0] != "other" or right[0] != "other":
        require(same_type == (left[0] == right[0]), "inconsistent exact primitive type relation")
    if left[0] == right[0] == "none":
        require(same_object, "None operands must be the same singleton")
    if same_object:
        require(left == right, "identical operands have inconsistent type or scalar facts")
    # None compares unequally to every exact primitive of a different type.
    # Unlike an isinstance check, these tags exclude user-defined subclasses.
    if left[0] == "none" and right[0] in PRIMITIVE_SLOTS:
        return True
    if right[0] == "none" and left[0] in PRIMITIVE_SLOTS:
        return True
    if left[0] == right[0] == "bool":
        return True  # The two bool values are language-level singletons.
    if left[1:3] == right[1:3] == ("object", "object"):
        return True
    # Canonical members can still share an underlying string without being
    # aliases. Check that actual string equality agrees with observed identity.
    if (same_type and left[1:3] == right[1:3] == ("str", "str")
            and left[3] is not None and right[3] is not None):
        return (left[3] == right[3]) == same_object
    return False


@dataclass(frozen=True)
class Site:
    operation: str
    observed: frozenset[int]
    overflow: frozenset[int]
    facts: tuple[tuple[int, frozenset[int]], ...]


class ObservationProfile:
    def __init__(self, document: dict, impact_map: dict, catalog: dict,
                 catalog_sha256: str | None = None):
        require(type(impact_map) is dict and type(catalog) is dict, "missing map or catalog object")
        require(type(impact_map.get("version")) is int and impact_map["version"] == 1,
                "unsupported impact map version")
        require(impact_map.get("base_commit") == BASE_COMMIT, "impact map baseline mismatch")
        tests = catalog.get("tests")
        require(type(tests) is list and bool(tests), "empty or malformed test catalog")
        self.count = len(tests)
        ids = []
        for number, test in enumerate(tests):
            require(type(test) is dict and is_integer(test.get("number")) and test["number"] == number,
                    "test catalog numbers must be contiguous")
            require(type(test.get("id")) is str and bool(test["id"]), "invalid test identity")
            ids.append(test["id"])
        require(len(set(ids)) == self.count, "duplicate test identities")
        require(is_integer(impact_map.get("test_count")) and impact_map["test_count"] == self.count
                and impact_map.get("test_ids") == ids, "impact map catalog mismatch")
        self.files = impact_map.get("files")
        require(type(self.files) is dict, "missing baseline source map")
        require(type(document) is dict and is_integer(document.get("version")) and document["version"] == 1,
                "unsupported observation profile version")
        require(document.get("base_commit") == BASE_COMMIT and document.get("test_ids") == ids,
                "observation baseline or catalog mismatch")
        provenance = document.get("provenance")
        require(type(provenance) is dict, "missing observation provenance")
        require(provenance.get("base_commit") == BASE_COMMIT, "provenance baseline mismatch")
        require(provenance.get("baseline_only") is True and provenance.get("fresh_interpreter_per_test") is True,
                "observations were not collected independently on the unchanged baseline")
        require(is_integer(provenance.get("tests_passed")) and provenance["tests_passed"] == self.count
                and provenance.get("unresolved") == [], "incomplete baseline test run")
        complete = test_numbers(provenance.get("trace_complete_tests"), self.count, "trace completeness receipts")
        require(len(complete) == self.count, "missing per-test observation receipt")
        for key in ("catalog_sha256", "generator_sha256", "support_sha256"):
            require(type(provenance.get(key)) is str and SHA256.fullmatch(provenance[key]) is not None,
                    f"invalid {key} provenance")
        if catalog_sha256 is not None:
            require(provenance["catalog_sha256"] == catalog_sha256, "catalog byte fingerprint mismatch")
        require(type(provenance.get("python")) is str and provenance["python"].startswith("3.13."),
                "observations require the pinned Python 3.13 semantics")
        seconds = provenance.get("wall_seconds")
        require(type(seconds) in (int, float) and math.isfinite(seconds) and seconds >= 0,
                "invalid profile timing provenance")
        require(document.get("fact_schema") == FACT_SCHEMA, "unsupported neutral fact schema")
        pool = document.get("facts")
        require(type(pool) is list, "neutral facts must be an array")
        self.proven = tuple(fact_proves_equivalence(value) for value in pool)
        self.opaque = test_numbers(document.get("opaque_tests"), self.count, "opaque tests")
        self.sites: dict[str, Site] = {}
        self.baseline_sites: dict[str, dict[str, str]] = {}
        source_lengths: dict[str, list[int]] = {}
        raw_sites = document.get("sites")
        require(type(raw_sites) is dict, "comparison sites must be an object")
        for full_key, record in raw_sites.items():
            require(type(full_key) is str and type(record) is dict, "malformed comparison site")
            path, key = record.get("path"), record.get("key")
            require(valid_path(path) and full_key == f"{path}@{key}", "comparison site path mismatch")
            start, column, end, end_column = coordinates(key)
            source = self.files.get(path)
            require(type(source) is dict and type(source.get("source")) is str,
                    "comparison site has no pinned baseline source")
            if path not in source_lengths:
                source_lengths[path] = [len(line.encode("utf-8")) for line in source["source"].split("\n")]
            lengths = source_lengths[path]
            require(end <= len(lengths) and column <= lengths[start - 1] and end_column <= lengths[end - 1],
                    "comparison coordinates exceed pinned baseline source")
            require(is_integer(record.get("line")) and record["line"] == start
                    and is_integer(record.get("end_line")) and record["end_line"] == end,
                    "comparison span metadata mismatch")
            operation = record.get("operation")
            require(type(operation) is str and operation in OPERATIONS, "unsupported baseline comparison")
            observed = test_numbers(record.get("observed"), self.count, "observed tests")
            overflow = test_numbers(record.get("overflow"), self.count, "overflow tests")
            require(overflow <= observed, "overflow test has no site observation")
            raw_facts = record.get("facts")
            require(type(raw_facts) is dict, "site fact references must be an object")
            covered: set[int] = set()
            facts = []
            for fact_id, test_ids in raw_facts.items():
                require(type(fact_id) is str and fact_id.isascii() and fact_id.isdecimal()
                        and str(int(fact_id)) == fact_id and int(fact_id) < len(self.proven),
                        "invalid neutral fact reference")
                numbers = test_numbers(test_ids, self.count, "fact test references")
                require(bool(numbers) and numbers <= observed, "fact test lacks a site observation")
                covered.update(numbers)
                facts.append((int(fact_id), numbers))
            require(observed <= covered | overflow, "observed test lacks facts or an explicit overflow")
            self.sites[full_key] = Site(operation, observed, overflow, tuple(facts))

    def equivalent_tests(self, path: str, changes: list) -> list[int]:
        """All changed sites must be harmless for each individually certified test."""
        require(valid_path(path) and type(changes) is list and bool(changes), "missing recognized comparison edits")
        source_record = self.files.get(path)
        require(type(source_record) is dict and type(source_record.get("source")) is str,
                "comparison delta lacks pinned source")
        if path not in self.baseline_sites:
            tree = ast.parse(self.files[path]["source"], filename=path, type_comments=True)
            self.baseline_sites[path] = {
                f"{node.lineno}:{node.col_offset}:{node.end_lineno}:{node.end_col_offset}": type(node.ops[0]).__name__
                for node in ast.walk(tree) if isinstance(node, ast.Compare) and len(node.ops) == 1
            }
        safe = set(range(self.count)) - self.opaque
        seen: set[str] = set()
        for change in changes:
            require(type(change) is dict and set(change) == {"site", "old_operator", "new_operator"},
                    "malformed recognized comparison edit")
            key = change["site"]
            coordinates(key)
            require(key not in seen, "duplicate changed comparison site")
            seen.add(key)
            old, new = change["old_operator"], change["new_operator"]
            require(type(old) is str and type(new) is str and (old, new) in PAIRS,
                    "unsupported comparison operator change")
            site = self.sites.get(f"{path}@{key}")
            require(site is not None and site.operation == old, "missing or mismatched baseline comparison site")
            require(self.baseline_sites[path].get(key) == old, "comparison site differs from pinned baseline AST")
            safe.difference_update(site.overflow)
            for fact_id, numbers in site.facts:
                if not self.proven[fact_id]:
                    safe.difference_update(numbers)
        return sorted(safe)


def strip_certificates(analysis: dict) -> dict:
    require(type(analysis) is dict and type(analysis.get("commits")) is dict, "invalid analysis document")
    output = deepcopy(analysis)
    for commit in output["commits"].values():
        if type(commit) is dict and type(commit.get("files")) is dict:
            for flags in commit["files"].values():
                if type(flags) is dict:
                    flags.pop("equivalent_tests", None)
    return output


def enrich_analysis(analysis: dict, profile: ObservationProfile) -> dict:
    output = strip_certificates(analysis)
    for commit in output["commits"].values():
        if (type(commit) is not dict or commit.get("force_all") is not False
                or type(commit.get("files")) is not dict or len(commit["files"]) != 1):
            continue
        path, flags = next(iter(commit["files"].items()))
        if (type(flags) is not dict or flags.get("syntax_error") is not False
                or flags.get("ast_equal") is not False or type(flags.get("changed_functions")) is not list
                or not flags["changed_functions"]
                or not all(is_integer(line) and line > 0 for line in flags["changed_functions"])):
            continue
        try:
            equivalent = profile.equivalent_tests(path, flags.get("comparison_changes"))
        except (InvalidProfile, TypeError, ValueError, SyntaxError, OverflowError):
            continue
        if equivalent:
            flags["equivalent_tests"] = equivalent
    return output


def unique_object(items):
    result = {}
    for key, value in items:
        require(key not in result, "duplicate JSON object field")
        result[key] = value
    return result


def load_json(path: Path):
    return json.loads(path.read_bytes(), object_pairs_hook=unique_object)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("map", "tests", "observations", "analysis", "output"):
        parser.add_argument("--" + name, required=True, type=Path)
    args = parser.parse_args()
    try:
        output = strip_certificates(load_json(args.analysis))
    except (OSError, ValueError, TypeError, RecursionError) as error:
        print(f"observation proof skipped: unusable analysis: {error}", file=sys.stderr)
        return 1
    try:
        raw_catalog = args.tests.read_bytes()
        profile = ObservationProfile(load_json(args.observations), load_json(args.map),
                                     json.loads(raw_catalog, object_pairs_hook=unique_object),
                                     hashlib.sha256(raw_catalog).hexdigest())
        output = enrich_analysis(output, profile)
    except (OSError, ValueError, TypeError, KeyError, OverflowError, RecursionError) as error:
        print(f"observation proof disabled: {type(error).__name__}: {error}", file=sys.stderr)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
    temporary.replace(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
