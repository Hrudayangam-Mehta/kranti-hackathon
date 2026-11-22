import os, subprocess, sys, time, shutil
S="/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
b = sys.argv[1]; n = sys.argv[2] if len(sys.argv) > 2 else "2"
for i in range(3):
    out = S + "/perf/root20/output"; shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    env = dict(DATA_DIR=S + "/m1data/p20m", OUTPUT_DIR=out, NCPU=n)
    t0 = time.time()
    p = subprocess.Popen(["taskset", "-c", "2,3", b], env=env, stderr=subprocess.PIPE, text=True)
    err = p.stderr.read()
    t_err_closed = time.time()
    _, st, ru = os.wait4(p.pid, 0)
    t1 = time.time()
    last = [l for l in err.splitlines() if l.startswith("write")]
    print(f"wall {t1-t0:.3f}  last lap {last[-1].split()[1] if last else '?'} ms  stderr-closed->reaped {(t1-t_err_closed)*1e3:.1f} ms")
