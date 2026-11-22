#!/usr/bin/env python3
"""ab.py RUNS BIN[:ENV=V,...] BIN2 ... : alternate runs on 20M set (NCPU=2, cores 2,3); report median/min wall."""
import os, shutil, statistics, subprocess, sys, time
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
runs = int(sys.argv[1]); specs = sys.argv[2:]
data = os.environ.get("DATA", S + "/m1data/p20m"); ncpu = os.environ.get("NCPU", "2"); cores = os.environ.get("CORES", "2,3")
res = {s: [] for s in specs}
cpu = {s: [] for s in specs}
sysv = {s: [] for s in specs}
pres = {s: [] for s in specs}
out = S + "/c1work/run/ab_out"
def quiet(limit=float(os.environ.get("QUIET", "12")), patience=float(os.environ.get("PATIENCE", "90"))):
    t0 = time.time()
    while time.time() - t0 < patience:
        some = open("/proc/pressure/cpu").readline().split()
        avg10 = float(some[1].split("=")[1])
        if avg10 < limit:
            return avg10
        time.sleep(1)
    return -1

for r in range(runs):
    for spec in specs:
        pres[spec].append(quiet())
        b, _, extra = spec.partition(":")
        env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=ncpu)
        for kv in filter(None, extra.split(",")):
            k, v = kv.split("="); env[k] = v
        shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        t = time.perf_counter()
        p = subprocess.Popen(["taskset", "-c", cores, b if "/" in b else S + "/perf/bin/" + b], env=env, stderr=subprocess.DEVNULL)
        _, status, ru = os.wait4(p.pid, 0)
        dt = time.perf_counter() - t
        if status: print("FAIL", spec, status); sys.exit(1)
        res[spec].append(dt)
        cpu[spec].append(ru.ru_utime + ru.ru_stime)
        sysv[spec].append(ru.ru_stime)
import json
json.dump({"cpu": cpu, "wall": res, "sys": sysv}, open(os.environ.get("ABJSON", "/dev/null"), "w"))
if len(specs) == 2:
    d = [b - a for a, b in zip(cpu[specs[0]], cpu[specs[1]])]
    print(f"paired cpu diff (second - first): median {statistics.median(d):+.3f} mean {statistics.mean(d):+.3f} | {' '.join(f'{x:+.2f}' for x in d)}")
for spec in specs:
    v = res[spec]
    c = cpu[spec]
    print(f"{spec:28s} wall median {statistics.median(v):.3f} min {min(v):.3f} | cpu median {statistics.median(c):.3f} min {min(c):.3f} | sys median {statistics.median(sysv[spec]):.3f} | walls {' '.join(f'{x:.2f}' for x in v)} | psi {' '.join(f'{x:.0f}' for x in pres[spec])}")
