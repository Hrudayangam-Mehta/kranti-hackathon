#!/usr/bin/env python3
"""Check the source package's concrete submission constraints."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
IGNORE = {".git", "target", "__pycache__", ".starter-kit", "output", ".profile"}
LIMIT = 20_000_000
REQUIRED = ("Dockerfile", "submission.rs", "maps/impact-map.json",
            "tools/entrypoint.py", "tools/analyze_changes.py", "LICENSE",
            "THIRD_PARTY_NOTICES.md")


def main():
    failures = []
    for relative in REQUIRED:
        if not (ROOT / relative).is_file():
            failures.append("Missing " + relative)
    files = [p for p in ROOT.rglob("*") if p.is_file()
             and not any(part in IGNORE for part in p.relative_to(ROOT).parts)
             and p.suffix != ".pyc"]
    size = sum(p.stat().st_size for p in files)
    if size > LIMIT:
        failures.append(f"Source package exceeds {LIMIT:,} bytes: {size:,}")
    for p in files:
        if p.name == "answers.json" or p.suffix == ".patch":
            failures.append("Evaluation patch/answer file present: " + str(p.relative_to(ROOT)))
        if p.is_symlink():
            failures.append("Unexpected symlink: " + str(p.relative_to(ROOT)))
    data = json.loads((ROOT / "maps/impact-map.json").read_text())
    if data.get("base_commit") != "eb11aec4be8cb2122afe713a4816662c3f0fb2fa":
        failures.append("Wrong SQLGlot baseline")
    if not data.get("provenance", {}).get("baseline_only"):
        failures.append("Missing baseline-only map provenance")
    if data.get("provenance", {}).get("unprofiled"):
        failures.append("Some baseline tests did not pass profiling")
    if len(data["test_ids"]) != data["test_count"]:
        failures.append("Map test identity count mismatch")
    result = {"ok": not failures, "source_bytes": size, "limit_bytes": LIMIT,
              "files": len(files), "map_bytes": (ROOT / "maps/impact-map.json").stat().st_size,
              "map_sha256": hashlib.sha256((ROOT / "maps/impact-map.json").read_bytes()).hexdigest(),
              "baseline_test_count": data["test_count"], "failures": failures}
    print(json.dumps(result, indent=2))
    return int(bool(failures))


if __name__ == "__main__":
    sys.exit(main())
