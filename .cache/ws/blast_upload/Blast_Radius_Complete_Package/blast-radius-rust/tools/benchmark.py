#!/usr/bin/env python3
"""Benchmark a native selector with the organizer's unchanged local scorer.

Example (argv after -- is executed directly, never through a shell):
  python tools/benchmark.py --kit ../research/starter \
    --output-dir ../research/final-bench --runs 3 -- \
    python tools/entrypoint.py --data '{data}' \
    --map maps/impact-map.json --selector target/release/blast-radius-selector

An expanded run duplicates the public patches under new IDs; it tests scaling,
not generalization. --expanded 45 always performs one run. A {data} placeholder
or an explicit --data argument is required so the command uses that temporary
dataset. Sample answers are only read for evaluation and never embedded in the
submission runtime or copied into its repository.
"""
from __future__ import annotations

import argparse
from contextlib import ExitStack
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import re
import resource
import shutil
import signal
import subprocess
import sys
import tempfile
import time


STDOUT_LIMIT = 2_000_000
SELECTOR_STATS = re.compile(
    r"(?P<commits>\d+) commits; (?P<tests>\d+) scheduled tests; "
    r"(?P<fallbacks>\d+) fallbacks; simulated selection cost "
    r"(?P<seconds>\d+)\.(?P<milliseconds>\d{3})s"
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_scorer(path: Path):
    spec = importlib.util.spec_from_file_location("blast_radius_organizer_score", path)
    if spec is None or spec.loader is None:
        raise ValueError("could not import the organizer's score.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    expected = {
        "WORKER_COST_MILLISECONDS": 2_000,
        "MISS_PENALTY_MILLISECONDS": 300_000,
        "MAXIMUM_WORKERS": 8,
    }
    for key, value in expected.items():
        if getattr(module, key, None) != value:
            raise ValueError(f"unexpected organizer scoring constant {key}")
    if not callable(getattr(module, "evaluate_run", None)) or not callable(getattr(module, "run_total_microseconds", None)):
        raise ValueError("organizer scorer lacks the expected evaluation functions")
    return module


def batch_digest(patches: list[Path]) -> str:
    digest = hashlib.sha256()
    for patch in patches:
        digest.update(patch.name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(bytes.fromhex(sha256_file(patch)))
    return digest.hexdigest()


def command_for_data(command: list[str], data: Path, expanded: bool) -> list[str]:
    result = [arg.replace("{data}", str(data)) for arg in command]
    had_placeholder = any("{data}" in arg for arg in command)
    locations = [i for i, arg in enumerate(result) if arg == "--data"]
    inline = [i for i, arg in enumerate(result) if arg.startswith("--data=")]
    if len(locations) + len(inline) > 1:
        raise ValueError("command contains ambiguous repeated --data options")
    for i in locations:
        if i + 1 >= len(result):
            raise ValueError("command --data needs a directory")
        if expanded:
            result[i + 1] = str(data)
        elif Path(result[i + 1]).resolve() != data:
            raise ValueError("command --data differs from the dataset being scored; use {data}")
    for i in inline:
        if expanded:
            result[i] = "--data=" + str(data)
        elif Path(result[i].split("=", 1)[1]).resolve() != data:
            raise ValueError("command --data differs from the dataset being scored; use {data}")
    if expanded and not had_placeholder and not locations and not inline:
        raise ValueError("expanded runs require {data} or --data in the executed command")
    return result


def stop_process_group(process: subprocess.Popen) -> None:
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait()
    # A leader may exit before its descendants; remove any remaining group.
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def stderr_summary(path: Path) -> dict:
    size = path.stat().st_size
    with path.open("rb") as stream:
        if size > 16_384:
            stream.seek(size - 16_384)
        tail = stream.read().decode("utf-8", errors="replace")
    matches = list(SELECTOR_STATS.finditer(tail))
    selected = None
    if matches:
        values = matches[-1].groupdict()
        selected = {
            "commits": int(values["commits"]),
            "scheduled_tests": int(values["tests"]),
            "fallbacks": int(values["fallbacks"]),
            "selection_cost_milliseconds_before_misses_and_cpu":
                int(values["seconds"]) * 1000 + int(values["milliseconds"]),
        }
    return {"bytes": size, "sha256": sha256_file(path), "selector": selected,
            "tail": tail, "tail_truncated": size > 16_384}


def run_once(index: int, command: list[str], output_dir: Path, timeout: float,
             scorer, tests: list[dict], answers: dict) -> dict:
    stdout_path = output_dir / f"run-{index:02d}.stdout.jsonl"
    stderr_path = output_dir / f"run-{index:02d}.stderr.log"
    before = resource.getrusage(resource.RUSAGE_CHILDREN)
    started = time.perf_counter()
    stop_reason = None
    with tempfile.TemporaryDirectory(prefix="blast-benchmark-run-") as temporary:
        environment = os.environ.copy()
        environment["TMPDIR"] = temporary
        with stdout_path.open("xb") as stdout, stderr_path.open("xb") as stderr:
            process = subprocess.Popen(command, stdout=stdout, stderr=stderr,
                                       start_new_session=True, env=environment)
            deadline = started + timeout
            while True:
                remaining = deadline - time.perf_counter()
                if remaining <= 0:
                    stop_reason = "wall_timeout"
                    stop_process_group(process)
                    break
                try:
                    process.wait(timeout=min(0.05, remaining))
                    break
                except subprocess.TimeoutExpired:
                    if stdout_path.stat().st_size > STDOUT_LIMIT:
                        stop_reason = "stdout_limit_exceeded"
                        stop_process_group(process)
                        break
            # A well-behaved command waits for its workers. An orphaned group
            # would make process-tree CPU accounting incomplete; reject it.
            try:
                os.killpg(process.pid, 0)
            except ProcessLookupError:
                pass
            else:
                if stop_reason is None:
                    stop_reason = "descendants_left_running"
                stop_process_group(process)
    wall_seconds = time.perf_counter() - started
    after = resource.getrusage(resource.RUSAGE_CHILDREN)
    user_cpu_us = max(0, round((after.ru_utime - before.ru_utime) * 1_000_000))
    system_cpu_us = max(0, round((after.ru_stime - before.ru_stime) * 1_000_000))
    cpu_us = user_cpu_us + system_cpu_us
    stdout_bytes = stdout_path.stat().st_size
    if stdout_bytes > STDOUT_LIMIT:
        evaluation = {"ok": False, "code": "stdout_limit_exceeded", "line": None}
    else:
        # All JSON shape, UTF-8, duplicate-ID, all-failing-test, integer-duration,
        # and worker-cost semantics come from the organizer's scorer itself.
        evaluation = scorer.evaluate_run(stdout_path.read_bytes(), tests, answers)
    valid = process.returncode == 0 and stop_reason is None and evaluation["ok"]
    simulated_ms = evaluation.get("simulated_milliseconds") if evaluation["ok"] else None
    total_us = scorer.run_total_microseconds(simulated_ms, cpu_us) if valid else None
    return {
        "run": index, "argv": command, "exit_code": process.returncode,
        "stop_reason": stop_reason, "valid": bool(valid),
        "wall_seconds": round(wall_seconds, 6),
        "cpu_user_microseconds": user_cpu_us,
        "cpu_system_microseconds": system_cpu_us,
        "cpu_total_microseconds": cpu_us,
        "cpu_total_seconds": cpu_us / 1_000_000,
        "organizer_evaluation": evaluation,
        "simulated_milliseconds": simulated_ms,
        "simulated_seconds": simulated_ms / 1000 if simulated_ms is not None else None,
        "misses": len(evaluation["missed_commits"]) if evaluation["ok"] else None,
        "local_total_microseconds": total_us,
        "local_total_seconds": total_us / 1_000_000 if total_us is not None else None,
        "stdout": {"path": str(stdout_path), "bytes": stdout_bytes,
                   "sha256": sha256_file(stdout_path)},
        "stderr": {"path": str(stderr_path), **stderr_summary(stderr_path)},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--kit", required=True, type=Path, help="directory containing the official score.py and sample/")
    parser.add_argument("--data", type=Path, help="evaluation data; defaults to KIT/sample")
    parser.add_argument("--answers", type=Path, help="local evaluation labels; defaults to DATA/answers.json")
    parser.add_argument("--output-dir", type=Path, help="new receipts directory; defaults to a fresh external temporary directory")
    parser.add_argument("--runs", type=int, default=3, help="positive odd repeat count; default 3")
    parser.add_argument("--expanded", type=int, metavar="PATCH_COUNT", help="one run of deterministic duplicate patches with new IDs")
    parser.add_argument("--timeout", type=float, help="per-run wall limit; default 180 s, or 270 s for expanded runs")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error("provide the native command after --")
    if args.runs < 1 or args.runs % 2 == 0:
        parser.error("--runs must be a positive odd number")
    if args.expanded is not None and args.expanded < 1:
        parser.error("--expanded must be positive")
    if args.timeout is not None and (not 0 < args.timeout <= 86_400):
        parser.error("--timeout must be positive and at most one day")

    kit = args.kit.resolve()
    source_data = (args.data or kit / "sample").resolve()
    answers_path = (args.answers or source_data / "answers.json").resolve()
    scorer_path = kit / "score.py"
    scorer = load_scorer(scorer_path)
    tests_path = source_data / "tests.json"
    tests = json.loads(tests_path.read_text(encoding="utf-8"))["tests"]
    original_answers = json.loads(answers_path.read_text(encoding="utf-8"))["commits"]
    original_patches = sorted((source_data / "commits").glob("*.patch"))
    if {path.stem for path in original_patches} != set(original_answers):
        raise ValueError("evaluation labels do not cover exactly the patch filenames")
    if args.expanded is not None and not original_patches:
        raise ValueError("cannot expand an empty source batch")
    output_dir = args.output_dir.resolve() if args.output_dir else Path(tempfile.mkdtemp(prefix="blast-radius-benchmark-"))
    output_dir.mkdir(parents=True, exist_ok=True)
    if (output_dir / "results.json").exists() or list(output_dir.glob("run-*.stdout.jsonl")) or list(output_dir.glob("run-*.stderr.log")):
        raise ValueError("output directory already contains benchmark receipts; choose a new directory")
    repeat_count = 1 if args.expanded is not None else args.runs
    timeout = args.timeout or (270.0 if args.expanded is not None else 180.0)
    dataset = {
        "source_data": str(source_data), "source_patch_count": len(original_patches),
        "test_count": len(tests), "tests_sha256": sha256_file(tests_path),
        "original_patches_sha256": batch_digest(original_patches),
        "labels_sha256": sha256_file(answers_path),
        "expanded": args.expanded is not None,
        "correctness_novelty": "none: deterministic copies of the same public patches" if args.expanded is not None else "official public sample only",
    }
    with ExitStack() as stack:
        data = source_data
        answers = original_answers
        if args.expanded is not None:
            data = Path(stack.enter_context(tempfile.TemporaryDirectory(prefix="blast-radius-expanded-")))
            (data / "commits").mkdir()
            shutil.copyfile(tests_path, data / "tests.json")
            answers = {}
            mapping = {}
            for number in range(args.expanded):
                source_patch = original_patches[number % len(original_patches)]
                new_id = f"scale_{number:05d}_{source_patch.stem}"
                shutil.copyfile(source_patch, data / "commits" / f"{new_id}.patch")
                answers[new_id] = original_answers[source_patch.stem]
                mapping[new_id] = source_patch.stem
            # Labels remain in evaluator memory. They are never written into the
            # temporary runtime dataset, the image, or the submission repository.
            dataset["copy_to_original_commit"] = mapping
        patches = sorted((data / "commits").glob("*.patch"))
        dataset["patch_count"] = len(patches)
        dataset["effective_patches_sha256"] = batch_digest(patches)
        resolved_command = command_for_data(command, data, args.expanded is not None)
        runs = []
        for index in range(1, repeat_count + 1):
            print(f"Native local benchmark run {index}/{repeat_count}", file=sys.stderr)
            runs.append(run_once(index, resolved_command, output_dir, timeout, scorer, tests, answers))
    all_valid = all(run["valid"] for run in runs)
    totals = sorted(run["local_total_microseconds"] for run in runs) if all_valid else []
    median_us = totals[len(totals) // 2] if totals else None
    report = {
        "schema_version": 1,
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "mode": "duplicate_scale_check" if args.expanded is not None else "native_local_sample_benchmark",
        "official_score": None,
        "interpretation": "Local hardware measurement using the organizer's scorer; not an organizer submission or leaderboard score.",
        "hardware": {"platform": platform.platform(), "machine": platform.machine(), "logical_cpus": os.cpu_count()},
        "measurement": {
            "cpu": "delta RUSAGE_CHILDREN user + system; includes descendants waited for by the executed command",
            "wall": "parent monotonic clock including process launch and final fresh-temp cleanup",
            "container_limits_enforced": False,
            "fresh_tmp_per_run": True,
            "wall_limit_seconds": timeout,
            "conservative_stdout_limit_bytes": STDOUT_LIMIT,
            "caveat": "Native resource accounting is not the organizer's container cgroup measurement; detached descendants and hardware differences preclude official-score equivalence.",
        },
        "scorer": {"path": str(scorer_path), "sha256": sha256_file(scorer_path),
                   "worker_cost_milliseconds": scorer.WORKER_COST_MILLISECONDS,
                   "miss_penalty_milliseconds": scorer.MISS_PENALTY_MILLISECONDS,
                   "maximum_workers": scorer.MAXIMUM_WORKERS},
        "dataset": dataset,
        "input_command": command,
        "requested_runs": args.runs, "executed_runs": repeat_count,
        "all_runs_valid": all_valid,
        "stdout_identical_across_runs": len({run["stdout"]["sha256"] for run in runs}) == 1,
        "median_local_total_microseconds": median_us,
        "median_local_total_seconds": median_us / 1_000_000 if median_us is not None else None,
        "median_local_rounded_score_seconds": ((median_us + 50_000) // 100_000) / 10 if median_us is not None else None,
        "expanded_dataset_removed": args.expanded is not None,
        "runs": runs,
        "output_directory": str(output_dir),
    }
    destination = output_dir / "results.json"
    destination.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, allow_nan=False))
    return 0 if all_valid else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"benchmark error: {error}", file=sys.stderr)
        raise SystemExit(2)
