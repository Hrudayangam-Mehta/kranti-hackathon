import os, sys, time, subprocess, shutil, statistics
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
T = S + "/panel_s/threads"
rounds = int(sys.argv[1]); ncpus = sys.argv[2].split(","); bins = sys.argv[3:]
out = T + "/run/ab_out"
res = {}
for r in range(rounds):
    for n in ncpus:
        for b in bins:
            psi = float(open("/proc/pressure/cpu").readline().split()[1].split("=")[1])
            shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
            env = dict(DATA_DIR=S + "/m1data/p20m", OUTPUT_DIR=out, NCPU=n)
            t = time.perf_counter()
            p = subprocess.Popen(["taskset", "-c", "2,3", T + "/bin/" + b], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            _, st, ru = os.wait4(p.pid, 0)
            dt = time.perf_counter() - t
            res.setdefault((n, b), []).append((dt, ru.ru_utime + ru.ru_stime, ru.ru_stime, psi))
            print(f"round {r} NCPU {n} {b}: wall {dt:.3f} cpu {ru.ru_utime + ru.ru_stime:.3f} sys {ru.ru_stime:.3f} psi {psi:.0f} exit {st}", flush=True)
for (n, b), v in sorted(res.items()):
    print(f"SUMMARY NCPU {n} {b}: wall median {statistics.median(x[0] for x in v):.3f} min {min(x[0] for x in v):.3f} | cpu median {statistics.median(x[1] for x in v):.3f} min {min(x[1] for x in v):.3f} | sys median {statistics.median(x[2] for x in v):.3f} | psi {' '.join(f'{x[3]:.0f}' for x in v)}")
