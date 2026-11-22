import os, sys, time, subprocess, shutil
J = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5judge"
data, n = sys.argv[1], sys.argv[2]
for label in sys.argv[3:]:
    out = f"{J}/runs/ru_{label}"; shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=n, PATH="/usr/bin:/bin")
    t = time.perf_counter()
    p = subprocess.Popen(["taskset", "-c", "0-3", f"{J}/bin/{label}"], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    _, st, ru = os.wait4(p.pid, 0)
    dt = time.perf_counter() - t
    print(f"{label} NCPU={n}: user {ru.ru_utime:.2f} sys {ru.ru_stime:.2f} wall {dt:.2f} maxrss {ru.ru_maxrss//1024}MB minflt {ru.ru_minflt} majflt {ru.ru_majflt} vcsw {ru.ru_nvcsw} ivcsw {ru.ru_nivcsw} exit {st}", flush=True)
    shutil.rmtree(out, ignore_errors=True)
