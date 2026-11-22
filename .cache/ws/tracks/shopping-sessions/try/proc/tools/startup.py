#!/usr/bin/env python3
"""startup.py N BIN... : spawn each binary N times (interleaved) with a missing DATA_DIR; it exits at once.
Reports median/min wall from spawn to reap and median child CPU (user+sys)."""
import os, sys, time, statistics as st
n = int(sys.argv[1]); bins = sys.argv[2:]
res = {b: [] for b in bins}
cpu = {b: [] for b in bins}
devnull = os.open("/dev/null", os.O_WRONLY)
env = {"DATA_DIR": "/nonexistent", "OUTPUT_DIR": "/nonexistent", "NCPU": "4", "PATH": "/usr/bin:/bin"}
for i in range(n):
    for b in bins:
        t0 = time.monotonic_ns()
        pid = os.posix_spawn(b, [b], env, file_actions=[(os.POSIX_SPAWN_DUP2, devnull, 2)])
        _, status, ru = os.wait4(pid, 0)
        res[b].append((time.monotonic_ns() - t0) / 1e6)
        cpu[b].append((ru.ru_utime + ru.ru_stime) * 1e3)
for b in bins:
    print(f"{os.path.basename(b):12s} wall med {st.median(res[b]):.3f} min {min(res[b]):.3f} ms  cpu med {st.median(cpu[b]):.3f} ms")
