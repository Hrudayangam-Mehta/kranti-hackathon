#!/usr/bin/env python3
"""bench.py BIN NCPU CORES RUNS [DATA] -> per-run wall/user/sys/phases, then medians.
Runs BIN pinned with taskset -c CORES, NCPU env, fresh output dir each run."""
import os, re, shutil, statistics, subprocess, sys, time
T = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
b, n, cores, runs = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
d = sys.argv[5] if len(sys.argv) > 5 else T + "/m1data/p20m"
out = T + "/try/scale/out_bench"
rows = []
quiet = os.environ.get("QUIET") == "1"
for i in range(runs):
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    env = dict(DATA_DIR=d, OUTPUT_DIR=out, NCPU=n, PATH="/usr/bin:/bin")
    for k in os.environ:
        if k.startswith("SESSIONS_"):
            env[k] = os.environ[k]
    t = time.perf_counter()
    p = subprocess.Popen(["taskset", "-c", cores, b], env=env, stderr=subprocess.PIPE, text=True)
    err = p.stderr.read()
    _, status, ru = os.wait4(p.pid, 0)
    dt = time.perf_counter() - t
    ph = {}
    for line in err.splitlines():
        m = re.match(r"^(\w+)\s+([0-9.]+) ms$", line.strip())
        if m:
            ph[m.group(1)] = float(m.group(2))
        m = re.match(r"^(\w+)\s+([0-9.]+) ms on one thread", line.strip())
        if m:
            ph["links1t"] = float(m.group(2))
    if "write" in ph:
        ph["exit"] = dt * 1e3 - ph["write"]
    rows.append((dt, ru.ru_utime, ru.ru_stime, ru.ru_maxrss, ph, status))
    if not quiet:
        print(f"run{i} exit {status} wall {dt:.3f} user {ru.ru_utime:.2f} sys {ru.ru_stime:.2f} rss {ru.ru_maxrss//1024}MB | " +
              " ".join(f"{k}={v:.0f}" for k, v in ph.items()), flush=True)
    if os.environ.get("SHOWERR") == "1":
        print(err)
med = lambda xs: statistics.median(xs)
keys = sorted({k for r in rows for k in r[4]}, key=lambda k: list(rows[0][4]).index(k) if k in rows[0][4] else 99)
print(f"MEDIAN {os.path.basename(b)} NCPU={n} cores={cores} wall {med([r[0] for r in rows]):.3f} (min {min(r[0] for r in rows):.3f})"
      f" user {med([r[1] for r in rows]):.2f} sys {med([r[2] for r in rows]):.2f} | " +
      " ".join(f"{k}={med([r[4][k] for r in rows if k in r[4]]):.0f}" for k in keys), flush=True)
