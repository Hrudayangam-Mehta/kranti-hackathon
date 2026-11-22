#!/usr/bin/env python3
"""Parse Python safely once per batch, then replace this process with Rust."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import tempfile

from analyze_changes import Analyzer


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="/data", type=Path)
    parser.add_argument("--map", default="/opt/impact-map.json", type=Path)
    parser.add_argument("--selector", default="/app/blast-radius-selector", type=Path)
    parser.add_argument("--policy", choices=("function", "line"), default="function",
                        help="line is an experimental, less conservative policy")
    parser.add_argument("--mode", choices=("impact", "baseline-all"), default="impact")
    args = parser.parse_args()
    command = [str(args.selector.resolve()), "--data", str(args.data.resolve()),
               "--map", str(args.map.resolve()), "--policy", args.policy,
               "--mode", args.mode]
    if args.mode != "baseline-all":
        try:
            document = json.loads(args.map.read_text(encoding="utf-8"))
            analyzer = Analyzer(document["files"])
            commits = {}
            for path in sorted((args.data / "commits").glob("*.patch")):
                try:
                    with path.open("rb") as stream:
                        patch = stream.read(8 * 1024 * 1024 + 1)
                    commits[path.stem] = analyzer.analyze(patch)
                except (OSError, MemoryError):
                    commits[path.stem] = {"files": {}, "force_all": True}
            with tempfile.NamedTemporaryFile(
                mode="w", prefix="blast-analysis-", suffix=".json",
                encoding="utf-8", delete=False,
            ) as target:
                json.dump({"commits": commits}, target, separators=(",", ":"))
                analysis_path = target.name
            command += ["--analysis", analysis_path]
        except (OSError, ValueError, KeyError, TypeError, MemoryError) as error:
            print(f"semantic analysis unavailable; using all tests: {error}", file=sys.stderr)
            command[command.index("--mode") + 1] = "baseline-all"
    # No application logs or JSON diagnostics may appear on stdout.
    sys.stdout.flush()
    sys.stderr.flush()
    os.execv(command[0], command)


if __name__ == "__main__":
    main()
