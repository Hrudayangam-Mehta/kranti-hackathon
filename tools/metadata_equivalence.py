#!/usr/bin/env python3
"""Use complete baseline metadata reads to refine blanket reader retention."""
from __future__ import annotations

import argparse
import ast
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import sys

from observed_equivalence import BASE_COMMIT, InvalidProfile, SHA256, is_integer, load_json, require, test_numbers


METADATA_TERMS = ("co_firstlineno", "co_linetable", "co_positions", "tb_lineno",
                  "f_lineno", "getsource", "getsourcelines", "__code__",
                  "__traceback__", "linecache", "traceback", "get_instructions")
UNSUPPORTED_CALLS = {"eval", "exec", "compile", "globals", "locals", "vars", "dir",
                     "_getframe", "_current_frames", "_current_exceptions", "settrace", "setprofile"}
HELPER = "_blast_note_code_owner_20261122"


def relative_path(value) -> bool:
    return (type(value) is str and bool(value) and not value.startswith("/") and "\\" not in value
            and not any(character.isspace() or ord(character) < 32 for character in value)
            and all(part not in ("", ".", "..") for part in value.split("/")))


def code_call(node: ast.AST) -> bool:
    """Recognized __code__ lookup forms, with their object in argument zero."""
    if not isinstance(node, ast.Call) or len(node.args) not in (2, 3) or node.keywords:
        return False
    if not isinstance(node.args[1], ast.Constant) or node.args[1].value != "__code__":
        return False
    if isinstance(node.func, ast.Name):
        return node.func.id == "getattr" or (node.func.id == "hasattr" and len(node.args) == 2)
    return (len(node.args) == 2 and isinstance(node.func, ast.Attribute)
            and node.func.attr == "__getattribute__" and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "object")


def inspect_reader(source: str) -> dict:
    """A strict source classifier; unsupported reflection stays global."""
    terms = [term for term in METADATA_TERMS if term in source]
    result = {"candidate": bool(terms), "eligible": False, "terms": terms, "accesses": 0}
    if terms != ["__code__"]:
        return result
    try:
        tree = ast.parse(source, type_comments=True)
    except (SyntaxError, ValueError, RecursionError):
        return result
    constants = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and (node.id == HELPER or node.id in UNSUPPORTED_CALLS):
            return result
        if isinstance(node, ast.Attribute):
            if node.attr in UNSUPPORTED_CALLS:
                return result
            if node.attr == "__code__":
                if not isinstance(node.ctx, ast.Load):
                    return result
                result["accesses"] += 1
        if isinstance(node, ast.Call):
            if code_call(node):
                constants.add(id(node.args[1]))
                result["accesses"] += 1
            elif isinstance(node.func, ast.Name) and node.func.id in {"getattr", "hasattr"}:
                if (len(node.args) < 2 or not isinstance(node.args[1], ast.Constant)
                        or type(node.args[1].value) is not str):
                    return result
            elif isinstance(node.func, ast.Attribute) and node.func.attr == "__getattribute__":
                return result
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and node.value == "__code__" and id(node) not in constants:
            return result
    result["eligible"] = bool(result["accesses"])
    return result


def classify_readers(files: dict, tests: list[dict]) -> tuple[list[int], list[int], dict[str, dict]]:
    modules = {}
    candidates, eligible = [], []
    for test in tests:
        path = test["id"].split("::", 1)[0]
        require(relative_path(path) and path.endswith(".py"), "invalid numbered test source path")
        if "file" in test:
            require(test["file"] == path, "test catalog file differs from its identity")
        if path not in modules:
            record = files.get(path)
            require(type(record) is dict and type(record.get("source")) is str,
                    "numbered test lacks pinned source for metadata classification")
            modules[path] = inspect_reader(record["source"])
        if modules[path]["candidate"]:
            candidates.append(test["number"])
        if modules[path]["eligible"]:
            eligible.append(test["number"])
    return candidates, eligible, modules


class MetadataProfile:
    def __init__(self, document: dict, impact_map: dict, catalog: dict,
                 catalog_sha256: str | None = None):
        require(type(catalog) is dict and type(catalog.get("tests")) is list and bool(catalog["tests"]),
                "missing numbered test catalog")
        tests = catalog["tests"]
        self.count = len(tests)
        ids = []
        for index, test in enumerate(tests):
            require(type(test) is dict and is_integer(test.get("number")) and test["number"] == index,
                    "metadata catalog numbers must be contiguous")
            require(type(test.get("id")) is str and bool(test["id"]), "invalid test identity")
            ids.append(test["id"])
        require(len(set(ids)) == self.count, "duplicate metadata test identity")
        self.test_files = tuple(identity.split("::", 1)[0] for identity in ids)
        require(type(impact_map) is dict and type(impact_map.get("version")) is int
                and impact_map["version"] == 1 and impact_map.get("base_commit") == BASE_COMMIT,
                "metadata impact map baseline mismatch")
        require(type(impact_map.get("test_count")) is int and impact_map["test_count"] == self.count
                and impact_map.get("test_ids") == ids and type(impact_map.get("files")) is dict,
                "metadata impact map catalog mismatch")
        self.files = impact_map["files"]
        candidates, eligible, _ = classify_readers(self.files, tests)
        require(type(document) is dict and type(document.get("version")) is int and document["version"] == 1,
                "unsupported metadata profile version")
        require(document.get("base_commit") == BASE_COMMIT and document.get("test_ids") == ids,
                "metadata profile baseline or catalog mismatch")
        require(document.get("reader_tests") == candidates and document.get("eligible_tests") == eligible,
                "metadata reader classification differs from pinned source")
        # Validate integer types as well as equality: bool must never stand in
        # for index 0/1 in a JSON receipt.
        test_numbers(document["reader_tests"], self.count, "metadata reader tests")
        test_numbers(document["eligible_tests"], self.count, "eligible metadata tests")
        provenance = document.get("provenance")
        require(type(provenance) is dict and provenance.get("base_commit") == BASE_COMMIT,
                "missing metadata baseline provenance")
        require(provenance.get("baseline_only") is True and provenance.get("fresh_interpreter_per_test") is True,
                "metadata profile was not collected fresh on the unchanged baseline")
        require(type(provenance.get("tests_passed")) is int and provenance["tests_passed"] == len(eligible)
                and provenance.get("unresolved") == [], "incomplete metadata reader run")
        receipt = test_numbers(provenance.get("trace_complete_tests"), self.count, "metadata completeness receipts")
        require(receipt == frozenset(eligible), "missing metadata per-test receipt")
        require(type(provenance.get("python")) is str and provenance["python"].startswith("3.13."),
                "metadata profile requires pinned Python 3.13 semantics")
        for field in ("catalog_sha256", "generator_sha256", "support_sha256"):
            require(type(provenance.get(field)) is str and SHA256.fullmatch(provenance[field]) is not None,
                    f"invalid metadata {field}")
        if catalog_sha256 is not None:
            require(provenance["catalog_sha256"] == catalog_sha256, "metadata catalog fingerprint mismatch")
        observations = document.get("observations")
        require(type(observations) is dict and set(observations) == {str(index) for index in eligible},
                "metadata observations do not match eligible readers")
        self.dependencies: dict[int, frozenset[str]] = {}
        for index in eligible:
            record = observations[str(index)]
            require(type(record) is dict and record.get("complete") is True and type(record.get("opaque")) is bool,
                    "incomplete metadata observation")
            dependencies = set()
            for field in ("code_files", "source_files"):
                paths = record.get(field)
                require(type(paths) is list and all(relative_path(path) for path in paths)
                        and paths == sorted(set(paths)), "malformed metadata file dependency")
                if field == "code_files":
                    require(all(path.endswith(".py") and type(self.files.get(path)) is dict
                                and type(self.files[path].get("source")) is str for path in paths),
                            "metadata code dependency lacks pinned Python source")
                dependencies.update(paths)
            if not record["opaque"]:
                self.dependencies[index] = frozenset(dependencies)

    def unaffected_tests(self, path: str) -> set[int]:
        require(relative_path(path) and path.endswith(".py") and type(self.files.get(path)) is dict
                and type(self.files[path].get("source")) is str and not path.startswith("tests/fixtures/"),
                "metadata delta lacks supported pinned Python source")
        return {index for index, dependencies in self.dependencies.items()
                if path not in dependencies and path != self.test_files[index]}


def strip_metadata_certificates(analysis: dict) -> dict:
    require(type(analysis) is dict and type(analysis.get("commits")) is dict, "invalid analysis document")
    output = deepcopy(analysis)
    for commit in output["commits"].values():
        if type(commit) is dict and type(commit.get("files")) is dict:
            for flags in commit["files"].values():
                if type(flags) is dict:
                    flags.pop("metadata_unaffected_tests", None)
    return output


def enrich_metadata(analysis: dict, profile: MetadataProfile) -> dict:
    output = strip_metadata_certificates(analysis)
    for commit in output["commits"].values():
        if (type(commit) is not dict or commit.get("force_all") is not False
                or type(commit.get("files")) is not dict or len(commit["files"]) != 1):
            continue
        path, flags = next(iter(commit["files"].items()))
        if type(flags) is not dict or flags.get("syntax_error") is not False:
            continue
        try:
            unaffected = profile.unaffected_tests(path)
            if flags.get("ast_equal") is not True:
                functions = flags.get("changed_functions")
                require(type(functions) is list and bool(functions)
                        and all(is_integer(line) and line > 0 for line in functions),
                        "metadata comparison proof lacks validated function scope")
                require(type(flags.get("comparison_changes")) is list and bool(flags["comparison_changes"]),
                        "metadata comparison proof lacks recognized operator delta")
                equivalent = test_numbers(flags.get("equivalent_tests"), profile.count, "equivalent tests")
                unaffected.intersection_update(equivalent)
            if unaffected:
                flags["metadata_unaffected_tests"] = sorted(unaffected)
        except (InvalidProfile, TypeError, ValueError):
            continue
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("map", "tests", "metadata", "analysis", "output"):
        parser.add_argument("--" + name, required=True, type=Path)
    args = parser.parse_args()
    try:
        output = strip_metadata_certificates(load_json(args.analysis))
    except (OSError, ValueError, TypeError, RecursionError) as error:
        print(f"metadata proof skipped: unusable analysis: {error}", file=sys.stderr)
        return 1
    try:
        raw = args.tests.read_bytes()
        profile = MetadataProfile(load_json(args.metadata), load_json(args.map), load_json(args.tests),
                                  hashlib.sha256(raw).hexdigest())
        output = enrich_metadata(output, profile)
    except (OSError, ValueError, TypeError, KeyError, OverflowError, RecursionError) as error:
        print(f"metadata proof disabled: {type(error).__name__}: {error}", file=sys.stderr)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
    temporary.replace(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
