import os, sys, time, subprocess, shutil
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
T = S + "/panel_s/threads"
binp, ncpu = sys.argv[1], sys.argv[2]
data = sys.argv[3] if len(sys.argv) > 3 else S + "/m1data/p20m"
out = sys.argv[4] if len(sys.argv) > 4 else T + "/run/o"
cores = os.environ.get("CORES", "2,3")
extra = {}
for kv in os.environ.get("XENV", "").split(","):
    if kv:
        k, v = kv.split("="); extra[k] = v
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=ncpu, **extra)
t = time.perf_counter(); e0 = time.time()
p = subprocess.Popen(["taskset", "-c", cores, binp], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
o, e = p.communicate()
dt = time.perf_counter() - t; e1 = time.time()
ru = os.wait4  # placeholder
r = __import__("resource").getrusage(__import__("resource").RUSAGE_CHILDREN)
sys.stderr.write(e.decode())
print(f"epoch popen {e0:.6f} reaped {e1:.6f}"); print(f"exit {p.returncode} stdout_bytes {len(o)} wall {dt:.3f} cum_user {r.ru_utime:.2f} cum_sys {r.ru_stime:.2f} maxrss_kb {r.ru_maxrss}")
