#!/usr/bin/env python3
import os, sys, subprocess, time, ctypes, shutil
L = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/layout"
def vm():
    d = {}
    for line in open("/proc/vmstat"):
        k, v = line.split()
        if k.startswith(("thp_", "pgfault", "compact_", "pgalloc", "pgfree")):
            d[k] = int(v)
    return d
binp, ncpu, cores = sys.argv[1], sys.argv[2], sys.argv[3]
thp_off = len(sys.argv) > 4 and sys.argv[4] == "nothp"
out = L + "/runs/bench_out"
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
env = dict(DATA_DIR=os.environ.get("DATA", L + "/../../m1data/p20m"), OUTPUT_DIR=out, NCPU=ncpu)
def pre():
    if thp_off:
        libc = ctypes.CDLL(None, use_errno=True)
        libc.prctl(41, 1, 0, 0, 0)
a = vm(); t = time.perf_counter()
p = subprocess.Popen(["taskset", "-c", cores, binp], env=env, stderr=subprocess.PIPE, preexec_fn=pre)
err = p.stderr.read().decode()
_, st, ru = os.wait4(p.pid, 0)
w = time.perf_counter() - t; b = vm()
print(f"wall {w:.3f} user {ru.ru_utime:.2f} sys {ru.ru_stime:.2f} minflt {ru.ru_minflt} rss {ru.ru_maxrss/1e6:.2f}GB")
print(" ".join(f"{k}={b[k]-a[k]}" for k in sorted(b) if b[k] != a[k]))
print(" | ".join(l.strip() for l in err.splitlines() if " ms" in l))
