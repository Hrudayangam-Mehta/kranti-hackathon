#!/usr/bin/env python3
"""Compare a new binary with retained, separately computed fresh-seed references.

This does not regenerate input or recompute reference semantics. It validates
the prior successful receipt, input hashes, and frozen expected output hashes,
then executes the candidate and the exact comparator in separate processes.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import time

from fresh_seed_check import sha

HERE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--reference-receipt", type=Path, default=HERE / "fresh-final.json")
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--seed", type=int, action="append")
    parser.add_argument("--mode", action="append", help="NCPU[:scalar], defaults to 8")
    args = parser.parse_args()
    for name in ("binary", "reference_receipt", "root", "report"):
        setattr(args, name, getattr(args, name).resolve())
    source = json.loads(args.reference_receipt.read_text())
    if not source["passed"]:
        parser.error("reference receipt must describe a completed successful computation")
    seeds = [s for s in source["seeds"] if not args.seed or s["seed"] in args.seed]
    if not seeds or (args.seed and len(seeds) != len(set(args.seed))):
        parser.error("every requested seed must be present in the successful reference receipt")
    if args.root.exists() and any(args.root.iterdir()):
        parser.error("use a new empty --root to avoid stale candidate output")
    args.root.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    modes = args.mode or ["8"]
    report = {"scope": "Reuse of independently computed complete medium-seed expectations; no reference regeneration and no official score claim.", "started_utc": dt.datetime.now(dt.timezone.utc).isoformat(), "binary": str(args.binary), "binary_sha256": sha(args.binary), "reference_receipt": str(args.reference_receipt), "reference_receipt_sha256": sha(args.reference_receipt), "reference_sha256": source["reference_sha256"], "generator_sha256": source["generator_sha256"], "runner_sha256": sha(Path(__file__)), "modes": modes, "seeds": [], "passed": False}
    save = lambda: args.report.write_text(json.dumps(report, indent=2))
    save()
    try:
        for seed in seeds:
            number = seed["seed"]
            folder = args.root / f"seed-{number}"
            folder.mkdir()
            data = Path(seed["reference_receipt"]["data"])
            reference = Path(seed["reference_receipt"]["output"])
            assert sha(data / "manifest.json") == seed["manifest_sha256"]
            for f in seed["input_files"]:
                path = data / f["path"]
                assert path.stat().st_size == f["bytes"] and sha(path) == f["sha256"], "changed input: " + str(path)
            expected = {str(p): sha(p) for p in sorted(reference.rglob("*.parquet"))}
            assert expected, "missing expected Parquet"
            entry = {"seed": number, "data": str(data), "reference": str(reference), "expected_sha256": expected, "manifest": seed["manifest"], "requested_events": seed["requested_events"], "requested_clicks": seed["requested_clicks"], "comparisons": [], "passed": False}
            report["seeds"].append(entry)
            save()
            for mode in modes:
                ncpu, *flags = mode.split(":")
                label = "candidate-" + mode.replace(":", "-")
                output = folder / label
                output.mkdir()
                env = os.environ.copy()
                for name in ("SESSIONS_PATH", "SESSIONS_SCALAR", "SESSIONS_BIN_THRESHOLD"):
                    env.pop(name, None)
                env.update(DATA_DIR=str(data), OUTPUT_DIR=str(output), NCPU=ncpu)
                if flags:
                    if flags != ["scalar"]:
                        raise ValueError("unsupported mode: " + mode)
                    env["SESSIONS_SCALAR"] = "1"
                started = time.monotonic()
                run = subprocess.run([str(args.binary)], env=env, capture_output=True, timeout=120)
                (folder / (label + ".stderr.log")).write_bytes(run.stderr)
                (folder / (label + ".stdout.log")).write_bytes(run.stdout)
                receipt = {"mode": mode, "exit": run.returncode, "stdout_bytes": len(run.stdout), "wall_seconds": time.monotonic() - started}
                assert run.returncode == 0 and not run.stdout, receipt
                comparison_path = folder / (label + "-comparison.json")
                with (folder / (label + "-comparison.log")).open("wb") as log:
                    compare = subprocess.run([sys.executable, str(HERE / "external_compare.py"), str(reference), str(output), "--memory-limit", "256MB", "--threads", "1", "--report", str(comparison_path)], stdout=log, stderr=subprocess.STDOUT, timeout=180)
                receipt["comparison"] = json.loads(comparison_path.read_text())
                entry["comparisons"].append(receipt)
                save()
                assert compare.returncode == 0 and receipt["comparison"]["equal"], "exact output comparison failed"
            for path, digest in expected.items():
                assert sha(Path(path)) == digest, "expected output changed during comparison"
            entry["passed"] = True
            save()
            print(json.dumps({"seed": number, "passed": True, "modes": modes}), flush=True)
        assert sha(args.binary) == report["binary_sha256"], "candidate binary changed during gate"
        report["passed"] = True
    except Exception as error:
        report["error"] = str(error)
    report["finished_utc"] = dt.datetime.now(dt.timezone.utc).isoformat()
    save()
    print(json.dumps({"passed": report["passed"], "report": str(args.report), "error": report.get("error")}), flush=True)
    return int(not report["passed"])


if __name__ == "__main__":
    raise SystemExit(main())
