#!/usr/bin/env python3
"""Create a dependency map from ONLY the pinned, unchanged baseline.

Inputs: baseline checkout and test catalog. No patch or answer-label option.
"""
from __future__ import annotations
import argparse
import ast
import collections
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

BASE_COMMIT = "eb11aec4be8cb2122afe713a4816662c3f0fb2fa"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--tests", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--work", type=Path, required=True)
    parser.add_argument("--reuse", action="store_true")
    args = parser.parse_args()
    source, work = args.source.resolve(), args.work.resolve()
    tests_path, output_path = args.tests.resolve(), args.output.resolve()
    catalog = json.loads(tests_path.read_text())["tests"]
    identities = [t["id"] for t in catalog]
    if [t["number"] for t in catalog] != list(range(len(catalog))):
        raise SystemExit("Test numbers must be contiguous in catalog order")
    actual = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
    if actual != BASE_COMMIT:
        raise SystemExit(f"Expected {BASE_COMMIT}, got {actual}")
    changed = subprocess.check_output(["git", "-C", str(source), "diff", "--name-only", "HEAD"], text=True)
    if changed.strip():
        raise SystemExit("Baseline tracked files must be unchanged")
    untracked = subprocess.check_output(
        ["git", "-C", str(source), "ls-files", "--others", "--exclude-standard"], text=True).splitlines()
    relevant_untracked = [p for p in untracked if p.endswith(".py") or p.startswith("tests/fixtures/")]
    if relevant_untracked:
        raise SystemExit(f"Untracked baseline code/data must be removed: {relevant_untracked}")
    work.mkdir(parents=True, exist_ok=True)
    os.environ.update(BLAST_PROFILE_ROOT=str(source), BLAST_PROFILE_DIR=str(work),
                      SKIP_INTEGRATION="0", PYTHONDONTWRITEBYTECODE="1", COVERAGE_CORE="ctrace")
    sys.path.insert(0, str(source))
    os.chdir(source)
    began = time.monotonic()
    statuses = {}
    if not args.reuse:
        if list(work.glob(".coverage*")):
            raise SystemExit("Choose an empty --work directory or explicitly --reuse")
        import pytest
        import profile_support as ps
        ps.install_pool_instrumentation()
        ps.start()

        class Collector:
            @pytest.hookimpl(hookwrapper=True, tryfirst=True)
            def pytest_runtest_protocol(self, item, nextitem):
                ps.set_context(item.nodeid)
                try:
                    yield
                finally:
                    ps.set_context("@collection")

            @pytest.hookimpl(hookwrapper=True, tryfirst=True)
            def pytest_fixture_setup(self, fixturedef, request):
                before = ps.CONTEXT
                if request.scope != "function":
                    ps.set_context("@scope:" + request.scope + ":" + request.node.nodeid)
                try:
                    yield
                finally:
                    ps.set_context(before)

            def pytest_collection_modifyitems(self, items):
                known = set(identities)
                items[:] = [i for i in items if i.nodeid in known]
                missing = known - {i.nodeid for i in items}
                if missing:
                    raise pytest.UsageError(f"Catalog tests missing: {sorted(missing)}")

            def pytest_runtest_logreport(self, report):
                if report.when == "call" or report.failed or report.skipped:
                    if statuses.get(report.nodeid) != "failed":
                        statuses[report.nodeid] = report.outcome

        files = sorted({t["file"] for t in catalog})
        code = pytest.main(["-q", "--tb=short", "-p", "no:cacheprovider", *files], plugins=[Collector()])
        ps.save()
        meta = {"base_commit": actual, "test_ids": identities, "pytest_exit": int(code),
                "statuses": statuses, "profile_wall_seconds": time.monotonic() - began,
                "python": sys.version}
        (work / "profile-meta.json").write_text(json.dumps(meta, indent=2))
        if code not in (0, 1):
            raise SystemExit(f"Baseline infrastructure failed with code {code}")
    meta = json.loads((work / "profile-meta.json").read_text())
    if meta["base_commit"] != actual or meta["test_ids"] != identities:
        raise SystemExit("Saved traces have a different baseline/catalog")
    statuses = meta["statuses"]
    unresolved = sorted(i for i in identities if statuses.get(i) != "passed")
    unprofiled = [identities.index(i) for i in unresolved]
    if unresolved:
        print(f"WARNING: {len(unresolved)} baseline tests not observed passing", file=sys.stderr)

    import coverage
    cov = coverage.Coverage(data_file=str(work / ".coverage"), config_file=False)
    cov.combine(data_paths=[str(work)], keep=True)
    cov.save()
    data = cov.get_data()
    by_id = {name: n for n, name in enumerate(identities)}
    by_file = collections.defaultdict(set)
    for t in catalog:
        by_file[t["file"]].add(t["number"])

    def expand(context):
        if context in by_id:
            return {by_id[context]}
        if context.startswith("@scope:"):
            _, scope, prefix = context.split(":", 2)
            if scope == "session":
                return set(range(len(catalog)))
            return {n for n, name in enumerate(identities)
                    if name == prefix or name.startswith(prefix + "::")}
        return set()

    records, asts = {}, {}
    tracked = subprocess.check_output(["git", "-C", str(source), "ls-files"], text=True).splitlines()
    source_files = [source / p for p in tracked if p.endswith(".py") and p.startswith(("sqlglot/", "tests/"))]
    for p in sorted(source_files):
        relative = p.relative_to(source).as_posix()
        text = p.read_text(encoding="utf-8")
        try:
            tree = ast.parse(text, type_comments=True)
        except SyntaxError:
            continue
        asts[relative] = tree
        line_sets = {}
        for line, contexts in data.contexts_by_lineno(str(p)).items():
            ids = set().union(*(expand(c) for c in contexts))
            if ids and line > 0:
                line_sets[line] = ids
        touched = set().union(*line_sets.values()) if line_sets else set()
        touched |= by_file.get(relative, set())
        functions = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
                start = min([node.lineno, *[d.lineno for d in getattr(node, "decorator_list", [])]])
                end = node.end_lineno
                tests = set().union(*(line_sets.get(i, set()) for i in range(start, end + 1)))
                body = getattr(node, "body", None)
                header_end = max(start, body[0].lineno - 1) if isinstance(body, list) and body else start
                functions.append({"start": start, "end": end, "header_end": header_end,
                                  "tests": sorted(tests)})
        records[relative] = {"lines": {str(i): sorted(s) for i, s in sorted(line_sets.items())},
                             "all": sorted(touched), "functions": sorted(functions, key=lambda f:(f["start"],f["end"])),
                             "importers": [], "source_sensitive": [], "source": text}

    for p in sorted(work.glob("reads-*.json")):
        obj = json.loads(p.read_text())
        for kind in ("reads", "source_reads"):
            for relative, contexts in obj[kind].items():
                ids = set().union(*(expand(c) for c in contexts))
                record = records.setdefault(relative, {"lines": {}, "all": [], "functions": [],
                                                       "importers": [], "source_sensitive": []})
                record["all"] = sorted(set(record["all"]) | ids)
                if kind == "source_reads":
                    record["source_sensitive"] = sorted(set(record["source_sensitive"]) | ids)

    module_paths = {}
    for path in asts:
        module = path[:-3].replace("/", ".")
        if module.endswith(".__init__"):
            module = module[:-9]
        module_paths[module] = path
    # The dialect package exports classes lazily through __getattr__.
    # Resolve its baseline class aliases instead of treating BigQuery, for
    # example, as a nonexistent submodule named "BigQuery".
    for path, tree in asts.items():
        if path.startswith("sqlglot/dialects/") and path != "sqlglot/dialects/__init__.py":
            for node in tree.body:
                if isinstance(node, ast.ClassDef):
                    module_paths["sqlglot.dialects." + node.name] = path
    imports = collections.defaultdict(set)
    for path, tree in asts.items():
        module = path[:-3].replace("/", ".")
        package = module.rsplit(".", 1)[0]
        if path.endswith("/__init__.py"):
            package = module[:-9]
        for node in ast.walk(tree):
            targets = []
            if isinstance(node, ast.Import):
                targets += [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                base = node.module or ""
                if node.level:
                    parts = package.split(".")
                    base = ".".join(parts[:len(parts)-node.level+1] + ([base] if base else []))
                targets.append(base)
                targets += [base + "." + a.name for a in node.names]
            for target in targets:
                for end in range(1, len(target.split(".")) + 1):
                    dependency = module_paths.get(".".join(target.split(".")[:end]))
                    if dependency:
                        imports[path].add(dependency)
    importer_sets = {p: set(r["all"]) for p, r in records.items()}
    for testfile, ids in by_file.items():
        seen, stack = set(), [testfile]
        while stack:
            path = stack.pop()
            if path in seen:
                continue
            seen.add(path)
            importer_sets.setdefault(path, set()).update(ids)
            stack.extend(imports[path] - seen)
    for path, record in records.items():
        record["importers"] = sorted(importer_sets.get(path, set()))
        record["source_sensitive"] = sorted(set(record["source_sensitive"]) | set(unprofiled))

    # Raw source reads are not the only way to observe source positions or code
    # objects. Conservatively retain numbered tests in modules using inspection.
    metadata_terms = ("co_firstlineno", "co_linetable", "co_positions", "tb_lineno",
                      "f_lineno", "getsource", "getsourcelines", "__code__",
                      "__traceback__", "linecache", "traceback", "get_instructions")
    metadata_sensitive = set()
    for path, ids in by_file.items():
        text = records.get(path, {}).get("source", "")
        if any(term in text for term in metadata_terms):
            metadata_sensitive.update(ids)
    for path, record in records.items():
        if path.endswith(".py"):
            record["source_sensitive"] = sorted(set(record["source_sensitive"]) | metadata_sensitive)

    output = {"version": 1, "base_commit": actual, "test_count": len(catalog),
              "test_ids": identities, "files": records,
              "provenance": {"generator": "tools/build_map.py", "baseline_only": True,
                             "profile": meta, "unprofiled": unprofiled,
                             "catalog_sha256": hashlib.sha256(tests_path.read_bytes()).hexdigest()}}
    from compact_map import compact
    compact(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"map": str(output_path), "files": len(records),
                      "bytes": output_path.stat().st_size, "unprofiled": unprofiled,
                      "wall_seconds": round(time.monotonic()-began, 2)}), file=sys.stderr)


if __name__ == "__main__":
    main()
