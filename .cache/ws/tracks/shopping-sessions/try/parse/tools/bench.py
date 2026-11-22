#!/usr/bin/env python3
"""bench.py CORES NCPU RUNS BIN [BIN2 ...]: interleaved runs, pinned with taskset.
Prints per-run wall/user/sys/phases and medians per binary."""
import os, resource, subprocess, sys, time, shutil, statistics
P = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse"
D = os.environ.get("DATA", P + "/../../m1data/p20m")
cores, ncpu, runs = sys.argv[1], sys.argv[2], int(sys.argv[3])
bins = sys.argv[4:]
PH = ("setup", "parse", "dedup", "people", "write", "links")
PHX = PH + ("Uparse", "Sparse", "Udedup", "Sdedup", "Upeople", "Speople")
res = {b: [] for b in bins}
out = P + "/runs/bench_out"
for i in range(runs):
    for b in bins:
        shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        env = {"DATA_DIR": D, "OUTPUT_DIR": out, "NCPU": ncpu, "PATH": "/usr/bin:/bin"}
        for k in os.environ:
            if k.startswith("SESSIONS_"): env[k] = os.environ[k]
        r0 = resource.getrusage(resource.RUSAGE_CHILDREN)
        t = time.perf_counter()
        p = subprocess.run(["taskset", "-c", cores, b], env=env, stderr=subprocess.PIPE, text=True)
        dt = time.perf_counter() - t
        r1 = resource.getrusage(resource.RUSAGE_CHILDREN)
        u, s = r1.ru_utime - r0.ru_utime, r1.ru_stime - r0.ru_stime
        flt = r1.ru_minflt - r0.ru_minflt
        ph = {}
        for l in p.stderr.splitlines():
            w = l.split()
            if w and w[0] in PH:
                ph[w[0]] = float(w[1])
            if w and w[0] == "cpu" and len(w) >= 7:
                for name, v in zip(("parse", "dedup", "people"), (w[2], w[4], w[6])):
                    if "+" in v:
                        ua, sa = v.split("+"); ph["U" + name], ph["S" + name] = float(ua), float(sa)
                    else:
                        ph["C" + name] = float(v)
        res[b].append((dt, u, s, ph, flt))
        print(f"{os.path.basename(b):10s} run{i+1} exit {p.returncode} wall {dt:.3f} user {u:.2f} sys {s:.2f} flt {flt} " +
              " ".join(f"{k}={v:.0f}" for k, v in ph.items()), flush=True)
        if p.returncode != 0:
            print(p.stderr[-2000:])
for b in bins:
    rs = res[b]
    med = lambda xs: statistics.median(xs)
    phs = {k: med([r[3].get(k, 0) for r in rs]) for k in PHX}
    print(f"MEDIAN {os.path.basename(b):10s} cores={cores} NCPU={ncpu} n={len(rs)} wall {med([r[0] for r in rs]):.3f} "
          f"min {min(r[0] for r in rs):.3f} user {med([r[1] for r in rs]):.2f} sys {med([r[2] for r in rs]):.2f} cpu {med([r[1]+r[2] for r in rs]):.2f} flt {med([r[4] for r in rs]):.0f} | " +
          " ".join(f"{k}={v:.0f}" for k, v in phs.items()))
