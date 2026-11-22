#!/usr/bin/env python3
"""Sequential fresh-seed generation, plain-reference computation, exact comparison.

Run only in a coordinator-approved CPU window. The original official generator
is used; no production pipeline semantics or competitor code enter the oracle.
These correctness runs are not timing benchmarks or official scores.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
WORKSPACE = HERE.parents[1]


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while block := stream.read(1 << 20):
            digest.update(block)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--generator", type=Path, default=WORKSPACE / "kit/generator/target/release/generate")
    parser.add_argument("--reference", type=Path, default=WORKSPACE / "handoff/tracks/shopping-sessions/verify/ref.py")
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--seed", action="append", help="SEED:REQUESTED_CLICKS; defaults to 249:100000,355:350000,1234:800000")
    parser.add_argument("--mode", action="append", help="NCPU[:scalar], default 1 and 8")
    args = parser.parse_args()
    for name in ("binary", "generator", "reference", "root", "report"):
        setattr(args, name, getattr(args, name).resolve())
    if args.root.exists() and any(args.root.iterdir()):
        parser.error("use a new empty --root to retain provenance and avoid stale input/output files")
    args.root.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    seeds = [tuple(map(int, text.split(":"))) for text in (args.seed or ["249:100000", "355:350000", "1234:800000"])]
    modes = args.mode or ["1", "8"]
    report = {
        "scope": "Fresh official-generator medium datasets, unchanged independent Python semantics, exact schema/multiset comparisons; not official scores or a 60M semantic proof.",
        "started_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "binary": str(args.binary), "binary_sha256": sha(args.binary),
        "generator": str(args.generator), "generator_sha256": sha(args.generator),
        "reference": str(args.reference), "reference_sha256": sha(args.reference),
        "wrapper_sha256": sha(HERE / "reference_parquet.py"),
        "comparator_sha256": sha(HERE / "external_compare.py"),
        "runner_sha256": sha(Path(__file__)), "modes": modes, "seeds": [], "passed": False,
    }
    save = lambda: args.report.write_text(json.dumps(report, indent=2))
    save()

    def stage(folder, label, command, env=None, stdout_empty=False, timeout=600):
        started = time.monotonic()
        log_out = folder / (label + ".stdout.log")
        log_err = folder / (label + ".stderr.log")
        metrics = folder / (label + ".usage.json")
        with log_out.open("wb") as out, log_err.open("wb") as err:
            process = subprocess.Popen(list(map(str, command)), env=env, stdout=out, stderr=err, start_new_session=True)
            while True:
                waited, status, usage = os.wait4(process.pid, os.WNOHANG)
                if waited:
                    process.returncode = os.waitstatus_to_exitcode(status)
                    break
                if time.monotonic() - started > timeout:
                    os.killpg(process.pid, signal.SIGKILL)
                    _, status, usage = os.wait4(process.pid, 0)
                    process.returncode = os.waitstatus_to_exitcode(status)
                    raise TimeoutError("stage exceeded timeout: " + label)
                time.sleep(0.01)
        measured = {"maxrss_kib": usage.ru_maxrss, "user_seconds": usage.ru_utime, "system_seconds": usage.ru_stime, "measurement": "Linux wait4 resource usage for this child"}
        metrics.write_text(json.dumps(measured, indent=2))
        receipt = {"command": list(map(str, command)), "exit": process.returncode, "wall_seconds": time.monotonic() - started, "stdout_bytes": log_out.stat().st_size, "stdout": str(log_out), "stderr": str(log_err), **measured}
        if process.returncode:
            raise RuntimeError(json.dumps(receipt))
        if stdout_empty and receipt["stdout_bytes"]:
            raise RuntimeError("candidate wrote stdout: " + json.dumps(receipt))
        return receipt

    try:
        for seed, clicks in seeds:
            folder = args.root / f"seed-{seed}"
            folder.mkdir()
            data = folder / "input"
            reference_output = folder / "reference"
            entry = {"seed": seed, "requested_events": 1_000_000, "requested_clicks": clicks, "comparisons": [], "passed": False}
            report["seeds"].append(entry)
            entry["generation"] = stage(folder, "generate", [args.generator, "--seed", seed, "--events", 1_000_000, "--clicks", clicks, "--output", data, "--threads", 1])
            inventory = []
            for path in sorted(data.rglob("*.csv")):
                if path.is_file():
                    inventory.append({"path": str(path.relative_to(data)), "bytes": path.stat().st_size, "sha256": sha(path)})
            entry["input_files"] = inventory
            entry["manifest"] = json.loads((data / "manifest.json").read_text())
            entry["manifest_sha256"] = sha(data / "manifest.json")
            save()
            oracle_report = folder / "reference.json"
            entry["reference"] = stage(folder, "reference", [sys.executable, HERE / "reference_parquet.py", data, reference_output, "--reference", args.reference, "--report", oracle_report])
            entry["reference_receipt"] = json.loads(oracle_report.read_text())
            save()
            for mode in modes:
                ncpu, *flags = mode.split(":")
                output = folder / ("candidate-" + mode.replace(":", "-"))
                output.mkdir()
                env = os.environ.copy()
                env.pop("SESSIONS_PATH", None)
                env.pop("SESSIONS_SCALAR", None)
                env.pop("SESSIONS_BIN_THRESHOLD", None)
                env.update(DATA_DIR=str(data), OUTPUT_DIR=str(output), NCPU=ncpu)
                if flags:
                    if flags != ["scalar"]:
                        raise ValueError("unsupported mode: " + mode)
                    env["SESSIONS_SCALAR"] = "1"
                label = "candidate-" + mode.replace(":", "-")
                receipt = {"mode": mode, "execution": stage(folder, label, [args.binary], env=env, stdout_empty=True, timeout=120)}
                comparison = folder / (label + "-comparison.json")
                receipt["comparison_run"] = stage(folder, label + "-compare", [sys.executable, HERE / "external_compare.py", reference_output, output, "--memory-limit", "256MB", "--threads", 1, "--report", comparison])
                receipt["comparison"] = json.loads(comparison.read_text())
                assert receipt["comparison"]["equal"]
                entry["comparisons"].append(receipt)
                save()
            entry["passed"] = True
            save()
            print(json.dumps({"seed": seed, "passed": True, "rows": entry["reference_receipt"]["rows"], "modes": modes}), flush=True)
        assert sha(args.binary) == report["binary_sha256"], "binary changed during verification"
        assert sha(args.generator) == report["generator_sha256"], "generator changed during verification"
        assert sha(args.reference) == report["reference_sha256"], "reference changed during verification"
        report["passed"] = True
    except Exception as error:
        report["error"] = str(error)
    report["finished_utc"] = dt.datetime.now(dt.timezone.utc).isoformat()
    save()
    print(json.dumps({"passed": report["passed"], "report": str(args.report), "error": report.get("error")}), flush=True)
    return int(not report["passed"])


if __name__ == "__main__":
    raise SystemExit(main())
