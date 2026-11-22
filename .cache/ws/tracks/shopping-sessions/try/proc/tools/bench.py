#!/usr/bin/env python3
"""Interleaved timing of one or more binaries.

bench.py --data DIR --cpus 2,3 --ncpu 2 --runs 5 [--log FILE] NAME=BIN [NAME=BIN ...]

Each run: fresh empty OUTPUT_DIR (removed before, not timed), env like the
scorer, taskset to the given cpus. Wall time is measured from just before
fork to wait4 return (includes exec, start-up and exit teardown). CPU times,
max RSS and fault counts come from wait4 rusage. Phase laps are parsed from
the binary's stderr (cumulative ms since fast::run start).
"""
import argparse
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import time

LAP = re.compile(rb"^(setup|parse|dedup|people|write|users|campaign|exit|clean|start|unmap|free|drain|pdrain)\s+([0-9.]+) ms(?:\s+cpu\s+([0-9.]+) ms)?\s*$")
START = re.compile(rb"^start_ns\s+([0-9]+)(?:\s+cpu\s+([0-9.]+) ms)?\s*$")
LINKS = re.compile(rb"^links\s+([0-9.]+) ms")
BUSY = re.compile(rb"^thread 0 parse busy\s+([0-9.]+) ms")


def cpu_busy(window=0.15):
    def read():
        with open("/proc/stat") as f:
            v = list(map(int, f.readline().split()[1:]))
        return sum(v), v[3] + v[4]
    t0, i0 = read()
    time.sleep(window)
    t1, i1 = read()
    return 1.0 - (i1 - i0) / max(1, t1 - t0)


QUIET = float(os.environ.get("BENCH_QUIET", "0"))


def wait_quiet():
    if QUIET <= 0:
        return 0.0
    busy = 1.0
    for _ in range(80):
        busy = cpu_busy()
        if busy <= QUIET:
            break
    return busy


def one(bin_path, data, out, cpus, ncpu, extra_env):
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    scratch = out + ".scratch"
    os.makedirs(scratch, exist_ok=True)
    env = {
        "DATA_DIR": data,
        "OUTPUT_DIR": out,
        "SCRATCH_DIR": scratch,
        "HOME": scratch,
        "NCPU": str(ncpu),
        "MEM_GB": "24",
        "PATH": "/usr/bin:/bin",
    }
    env.update(extra_env)
    argv = [bin_path]
    errfile = out + ".stderr"
    cpuset = set()
    for part in cpus.split(","):
        if "-" in part:
            lo, hi = part.split("-")
            cpuset.update(range(int(lo), int(hi) + 1))
        else:
            cpuset.add(int(part))
    busy_before = wait_quiet()
    saved = os.sched_getaffinity(0)
    with open(errfile, "wb") as err:
        os.sched_setaffinity(0, cpuset)
        try:
            t0n = time.monotonic_ns()
            pid = os.posix_spawn(bin_path, argv, env, file_actions=[(os.POSIX_SPAWN_DUP2, err.fileno(), 2)])
        finally:
            os.sched_setaffinity(0, saved)
        _, status, ru = os.wait4(pid, 0)
        t1n = time.monotonic_ns()
        wall = (t1n - t0n) / 1e9
    with open(errfile, "rb") as f:
        stderr = f.read()
    laps = {}
    for line in stderr.splitlines():
        m = LAP.match(line)
        if m:
            laps[m.group(1).decode()] = float(m.group(2))
            if m.group(3):
                laps["cpu_" + m.group(1).decode()] = float(m.group(3))
        m = LINKS.match(line)
        if m:
            laps["links_ms"] = float(m.group(1))
        m = BUSY.match(line)
        if m:
            laps["busy0"] = float(m.group(1))
        m = START.match(line)
        if m:
            start_ns = int(m.group(1))
            laps["startup_ms"] = (start_ns - t0n) / 1e6
            laps["_start_ns"] = start_ns
            if m.group(2):
                laps["startup_cpu_ms"] = float(m.group(2))
    if "_start_ns" in laps and "exit" in laps:
        laps["teardown_ms"] = (t1n - laps["_start_ns"]) / 1e6 - laps["exit"]
    if "cpu_exit" in laps:
        laps["teardown_cpu_ms"] = (ru.ru_utime + ru.ru_stime) * 1e3 - laps["cpu_exit"]
    laps.pop("_start_ns", None)
    return {
        "status": status,
        "wall": wall,
        "user": ru.ru_utime,
        "sys": ru.ru_stime,
        "maxrss_mb": ru.ru_maxrss / 1024,
        "minflt": ru.ru_minflt,
        "majflt": ru.ru_majflt,
        "nvcsw": ru.ru_nvcsw,
        "nivcsw": ru.ru_nivcsw,
        "laps": laps,
        "busy_before": busy_before,
        "stderr_tail": stderr[-600:].decode(errors="replace"),
    }


def med(xs):
    return statistics.median(xs) if xs else float("nan")


def summarize(name, runs):
    w = [r["wall"] for r in runs]
    cpu = [r["user"] + r["sys"] for r in runs]
    out = {
        "name": name,
        "n": len(runs),
        "wall_med": med(w),
        "wall_min": min(w),
        "wall_max": max(w),
        "user_med": med([r["user"] for r in runs]),
        "sys_med": med([r["sys"] for r in runs]),
        "cpu_med": med(cpu),
        "rss_med": med([r["maxrss_mb"] for r in runs]),
        "minflt_med": med([r["minflt"] for r in runs]),
    }
    keys = sorted({k for r in runs for k in r["laps"]})
    for k in keys:
        vals = [r["laps"][k] for r in runs if k in r["laps"]]
        out["lap_" + k] = med(vals)
    seq = ["setup", "parse", "dedup", "people", "write", "exit"]
    for prefix in ("", "cpu_"):
        derived = {}
        for r in runs:
            laps = r["laps"]
            prev = laps.get("startup_cpu_ms", 0.0) if prefix else 0.0
            for name in seq:
                key = prefix + name
                if key in laps:
                    derived.setdefault(name, []).append(laps[key] - prev)
                    prev = laps[key]
        for name, vals in derived.items():
            out[("d_" if not prefix else "c_") + name] = med(vals)
    out["d_ptail"] = med([r["laps"]["parse"] - r["laps"]["pdrain"] for r in runs if "pdrain" in r["laps"] and "parse" in r["laps"]])
    out["d_tail"] = med([r["laps"]["people"] - r["laps"]["drain"] for r in runs if "drain" in r["laps"] and "people" in r["laps"]])
    out["c_teardown"] = med([r["laps"]["teardown_cpu_ms"] for r in runs if "teardown_cpu_ms" in r["laps"]])
    out["d_teardown"] = med([r["laps"]["teardown_ms"] for r in runs if "teardown_ms" in r["laps"]])
    out["d_startup"] = med([r["laps"]["startup_ms"] for r in runs if "startup_ms" in r["laps"]])
    out["c_startup"] = med([r["laps"]["startup_cpu_ms"] for r in runs if "startup_cpu_ms" in r["laps"]])
    serial = []
    for r in runs:
        laps = r["laps"]
        if all(k in laps for k in ("cpu_people", "cpu_exit", "teardown_cpu_ms", "cpu_setup")):
            serial.append(laps["cpu_setup"] + (laps["cpu_exit"] - laps["cpu_people"]) + laps["teardown_cpu_ms"])
    out["c_serial"] = med(serial)
    last = [max((v for k, v in r["laps"].items() if k not in ("links_ms", "busy0", "startup_ms", "teardown_ms", "exit", "teardown_cpu_ms", "startup_cpu_ms") and not k.startswith("cpu_")), default=0) for r in runs]
    out["tail_ms_med"] = med([r["wall"] * 1e3 - l for r, l in zip(runs, last)])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--cpus", required=True)
    ap.add_argument("--ncpu", type=int, required=True)
    ap.add_argument("--runs", type=int, default=5)
    ap.add_argument("--outdir", default="/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/proc/runs/bench")
    ap.add_argument("--log")
    ap.add_argument("--env", action="append", default=[])
    ap.add_argument("--warm", type=int, default=1)
    ap.add_argument("bins", nargs="+")
    a = ap.parse_args()
    extra = dict(e.split("=", 1) for e in a.env)
    bins = []
    per_env = {}
    for b in a.bins:
        name, rest = b.split("=", 1)
        path, _, envs = rest.partition("@")
        bins.append([name, path])
        per_env[name] = dict(e.split("=", 1) for e in envs.split(",") if e)
    os.makedirs(a.outdir, exist_ok=True)
    results = {name: [] for name, _ in bins}
    for name, path in bins:
        for _ in range(a.warm):
            one(path, a.data, f"{a.outdir}/{name}", a.cpus, a.ncpu, {**extra, **per_env[name]})
    for i in range(a.runs):
        order = bins[i % len(bins):] + bins[: i % len(bins)]
        for name, path in order:
            r = one(path, a.data, f"{a.outdir}/{name}", a.cpus, a.ncpu, {**extra, **per_env[name]})
            if r["status"] != 0:
                print(f"{name}: exit status {r['status']}\n{r['stderr_tail']}", file=sys.stderr)
            results[name].append(r)
            print(f"  run {i} {name}: wall {r['wall']:.3f} user {r['user']:.2f} sys {r['sys']:.2f} "
                  f"flt {r['minflt']} laps {r['laps']}", file=sys.stderr, flush=True)
    load = os.getloadavg()
    summary = [summarize(name, results[name]) for name, _ in bins]
    for s in summary:
        print(json.dumps({k: (round(v, 4) if isinstance(v, float) else v) for k, v in s.items()}))
    print(f"load {load}")
    if a.log:
        with open(a.log, "a") as f:
            f.write(json.dumps({"time": time.strftime("%H:%M:%S"), "data": a.data, "cpus": a.cpus, "ncpu": a.ncpu,
                                "load": load, "summary": summary,
                                "runs": {k: [{kk: vv for kk, vv in r.items() if kk != "stderr_tail"} for r in v]
                                         for k, v in results.items()}}) + "\n")


if __name__ == "__main__":
    main()
