#!/usr/bin/env python3
"""Build a dialect consumer map from only the pinned unchanged source/catalog.

All wrappers preserve actual return values, call arguments, and exceptions. The
collector records class definitions and component MRO modules, including cached
registry lookups, direct dialect instances, and direct uppercase class attributes.
No patch directory or answer file is accepted by this command.
"""
from __future__ import annotations

import argparse
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
    parser.add_argument("--reuse", action="store_true", help="Reassemble only verified baseline traces from this exact source/catalog")
    args = parser.parse_args()
    source, work = args.source.resolve(), args.work.resolve()
    tests_file, output = args.tests.resolve(), args.output.resolve()
    raw_catalog = tests_file.read_bytes()
    catalog = json.loads(raw_catalog)["tests"]
    identities = [test["id"] for test in catalog]
    known = set(identities)
    if len(known) != len(identities) or [test["number"] for test in catalog] != list(range(len(catalog))):
        raise SystemExit("Catalog identities must be unique and numbers contiguous")
    head = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
    if head != BASE_COMMIT:
        raise SystemExit(f"Expected pinned baseline {BASE_COMMIT}, got {head}")
    changed = subprocess.check_output(["git", "-C", str(source), "diff", "--name-only", "HEAD"], text=True)
    if changed.strip():
        raise SystemExit("Pinned baseline tracked files must be unchanged")
    untracked = subprocess.check_output(["git", "-C", str(source), "ls-files", "--others", "--exclude-standard"], text=True).splitlines()
    if any(path.endswith(".py") or path.startswith("tests/fixtures/") for path in untracked):
        raise SystemExit("Untracked baseline Python or fixtures are not permitted")
    work.mkdir(parents=True, exist_ok=True)
    if args.reuse:
        provenance = json.loads((work / "usage-meta.json").read_text())
        if (provenance.get("base_commit") != head or provenance.get("test_ids") != identities
                or provenance.get("catalog_sha256") != hashlib.sha256(raw_catalog).hexdigest()
                or provenance.get("pytest_exit") != 0 or provenance.get("unresolved")
                or any(provenance.get("statuses", {}).get(identity) != "passed" for identity in identities)):
            raise SystemExit("Saved usage traces are not a complete passing profile of this baseline/catalog")
        write_output(provenance, identities, catalog, work, output)
        return
    if list(work.glob("usage-*.json")):
        raise SystemExit("Choose an empty work directory for a fresh profile")
    os.environ.update(BLAST_USAGE_ROOT=str(source), BLAST_USAGE_DIR=str(work),
                      SKIP_INTEGRATION="0", PYTHONDONTWRITEBYTECODE="1")
    sys.path.insert(0, str(source))
    os.chdir(source)
    import pytest
    import usage_support as usage
    usage.install_pool_instrumentation()
    usage.install()
    statuses = {}

    class Collector:
        @pytest.hookimpl(hookwrapper=True, tryfirst=True)
        def pytest_runtest_protocol(self, item, nextitem):
            usage.set_context(item.nodeid)
            try:
                yield
            finally:
                usage.set_context("@collection")

        @pytest.hookimpl(hookwrapper=True, tryfirst=True)
        def pytest_fixture_setup(self, fixturedef, request):
            before = usage.CONTEXT
            if request.scope != "function":
                usage.set_context("@scope:" + request.scope + ":" + request.node.nodeid)
            try:
                yield
            finally:
                usage.set_context(before)

        def pytest_collection_modifyitems(self, items):
            items[:] = [item for item in items if item.nodeid in known]
            missing = known - {item.nodeid for item in items}
            if missing:
                raise pytest.UsageError(f"Missing catalog tests: {sorted(missing)}")

        def pytest_runtest_logreport(self, report):
            if report.when == "call" or report.failed or report.skipped:
                if statuses.get(report.nodeid) != "failed":
                    statuses[report.nodeid] = report.outcome

    start = time.monotonic()
    files = sorted({test["file"] for test in catalog})
    code = pytest.main(["-q", "--tb=short", "-p", "no:cacheprovider", *files], plugins=[Collector()])
    usage.save()
    unresolved = [identity for identity in identities if statuses.get(identity) != "passed"]
    provenance = {"base_commit": head, "test_ids": identities,
                  "catalog_sha256": hashlib.sha256(raw_catalog).hexdigest(),
                  "pytest_exit": int(code), "statuses": statuses,
                  "unresolved": unresolved, "python": sys.version,
                  "profile_wall_seconds": round(time.monotonic() - start, 6)}
    (work / "usage-meta.json").write_text(json.dumps(provenance, indent=2))
    if code != 0 or unresolved:
        raise SystemExit(f"Baseline usage collection failed: exit {code}, {len(unresolved)} unresolved tests")
    write_output(provenance, identities, catalog, work, output)


def write_output(provenance, identities, catalog, work, output):
    known = set(identities)
    by_file = collections.defaultdict(set)
    for test in catalog:
        by_file[test["file"]].add(test["id"])

    def expand(context):
        if context in known:
            return {context}
        if context.startswith("@file:"):
            return by_file.get(context[len("@file:"):], set())
        if context.startswith("@scope:"):
            _, scope, prefix = context.split(":", 2)
            if scope == "session":
                return known
            return {identity for identity in known if identity == prefix or identity.startswith(prefix + "::")}
        return set()

    consumers = collections.defaultdict(set)
    for trace in sorted(work.glob("usage-[0-9]*.json")):
        for path, contexts in json.loads(trace.read_text()).items():
            for context in contexts:
                consumers[path].update(expand(context))
    payload = {"version": 1, "provenance": provenance,
               "modules": {path: sorted(ids) for path, ids in sorted(consumers.items()) if ids}}
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, separators=(",", ":")))
    temporary.replace(output)
    print(json.dumps({"output": str(output), "modules": len(payload["modules"]),
                      "tests_passed": len(identities), "wall_seconds": provenance["profile_wall_seconds"],
                      "bytes": output.stat().st_size}), file=sys.stderr)


if __name__ == "__main__":
    main()
