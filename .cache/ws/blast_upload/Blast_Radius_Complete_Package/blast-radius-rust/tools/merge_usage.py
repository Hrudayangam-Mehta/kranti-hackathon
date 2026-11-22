#!/usr/bin/env python3
"""Union separately observed baseline class/registry consumers into the map."""
import argparse
import hashlib
import json
from pathlib import Path
from compact_map import compact


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--map", required=True, type=Path)
    parser.add_argument("--usage", required=True, type=Path)
    args = parser.parse_args()
    data = json.loads(args.map.read_text())
    usage = json.loads(args.usage.read_text())
    provenance = usage["provenance"]
    if provenance["base_commit"] != data["base_commit"] or provenance["test_ids"] != data["test_ids"]:
        raise SystemExit("Baseline/catalog mismatch")
    if provenance["pytest_exit"] != 0 or any(
        provenance["statuses"].get(name) != "passed" for name in data["test_ids"]
    ):
        raise SystemExit("Usage map is incomplete or failed baseline validation")
    indices = {name: i for i, name in enumerate(data["test_ids"])}
    sets = data.get("sets", [])
    added_edges = 0
    for path, names in usage["modules"].items():
        if path not in data["files"]:
            raise SystemExit(f"Unknown observed baseline module: {path}")
        consumers = {indices[name] for name in names}
        record = data["files"][path]
        for field in ("all", "importers"):
            old = record.get(field, [])
            old = set(sets[old] if isinstance(old, int) else old)
            if field == "all":
                added_edges += len(consumers - old)
            record[field] = sorted(old | consumers)
    data["provenance"]["usage"] = {
        "generator": "tools/build_usage.py", "baseline_only": True,
        "base_commit": provenance["base_commit"],
        "tests_passed": len(data["test_ids"]), "modules": len(usage["modules"]),
        "added_module_test_edges": added_edges,
        "artifact_sha256": hashlib.sha256(args.usage.read_bytes()).hexdigest(),
        "python": provenance.get("python"),
        "profile_wall_seconds": provenance.get("profile_wall_seconds"),
    }
    compact(data)
    temporary = args.map.with_suffix(".new")
    temporary.write_text(json.dumps(data, separators=(",", ":")))
    temporary.replace(args.map)
    print(json.dumps({"map_bytes": args.map.stat().st_size, "modules": len(usage["modules"]),
                      "added_module_test_edges": added_edges}))


if __name__ == "__main__":
    main()
