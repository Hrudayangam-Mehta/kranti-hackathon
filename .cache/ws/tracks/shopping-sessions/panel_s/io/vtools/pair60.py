import os, subprocess, time, shutil, sys
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
IO = S + "/panel_s/io"
G = IO + "/gate60c"
for b in sys.argv[1:]:
    out = f"{G}/{b}"
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    psi = open("/proc/pressure/cpu").readline().split()[1]
    t = time.perf_counter()
    with open(f"{G}/{b}.err", "w") as err:
        p = subprocess.Popen(["taskset", "-c", "0,1", f"{IO}/bin/{b}"], env=dict(DATA_DIR=S + "/m1data/p60m", OUTPUT_DIR=out, NCPU="4"), stdout=subprocess.DEVNULL, stderr=err)
        _, status, ru = os.wait4(p.pid, 0)
    print(f"60M {b} exit {status} wall {time.perf_counter()-t:.2f} user {ru.ru_utime:.2f} sys {ru.ru_stime:.2f} cpu {ru.ru_utime+ru.ru_stime:.2f} maxrss {ru.ru_maxrss/1e6:.2f} GB minflt {ru.ru_minflt} {psi}", flush=True)
    shutil.rmtree(out, ignore_errors=True)
