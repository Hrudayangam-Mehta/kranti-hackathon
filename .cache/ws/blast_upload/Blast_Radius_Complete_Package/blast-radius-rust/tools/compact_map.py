#!/usr/bin/env python3
"""Intern repeated baseline dependency sets without changing their meaning."""
import argparse
import json
from pathlib import Path


def compact(data):
    old_sets = data.get("sets", [])
    sets, indices = [], {}

    def intern(value):
        values = old_sets[value] if isinstance(value, int) else value
        key = tuple(sorted(set(values)))
        if key not in indices:
            indices[key] = len(sets)
            sets.append(list(key))
        return indices[key]

    for record in data["files"].values():
        for name in ("all", "importers", "source_sensitive"):
            record[name] = intern(record.get(name, []))
        record["lines"] = {line: intern(tests) for line, tests in record.get("lines", {}).items()}
        for function in record.get("functions", []):
            function["tests"] = intern(function.get("tests", []))
    data["sets"] = sets
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map", type=Path)
    args = parser.parse_args()
    data = compact(json.loads(args.map.read_text()))
    temp = args.map.with_suffix(".new")
    temp.write_text(json.dumps(data, separators=(",", ":")))
    temp.replace(args.map)
    print(json.dumps({"bytes": args.map.stat().st_size, "unique_sets": len(data["sets"])}))
