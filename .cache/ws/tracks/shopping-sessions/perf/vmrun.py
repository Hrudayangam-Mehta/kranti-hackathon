import os, subprocess, shutil, sys, time
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
keys = ["pgfault", "thp_fault_alloc", "thp_fault_fallback", "compact_stall", "thp_split_pmd", "pgfree", "thp_deferred_split_page", "pgalloc_normal"]
def vm():
    d = {}
    for l in open("/proc/vmstat"):
        k, v = l.split()
        d[k] = int(v)
    return d
data = os.environ.get("DATA", S + "/m1data/p20m")
out = S + "/perf/root20/output"
runs = int(sys.argv[1])
for r in range(runs):
    for spec in sys.argv[2:]:
        b, _, extra = spec.partition(":")
        env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=os.environ.get("NCPU", "2"))
        for kv in filter(None, extra.split(",")):
            k, v = kv.split("="); env[k] = v
        shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        pre = [] if not env.get("NOTHP") else ["python3", "-c", "import ctypes,os,sys; ctypes.CDLL(None).prctl(41,1,0,0,0); os.execv(sys.argv[1], sys.argv[1:])"]
        v0 = vm(); t = time.perf_counter()
        p = subprocess.Popen(["taskset", "-c", os.environ.get("CORES", "2,3")] + pre + [b if "/" in b else S + "/perf/bin/" + b], env=env, stderr=subprocess.DEVNULL)
        _, st, ru = os.wait4(p.pid, 0)
        dt = time.perf_counter() - t; v1 = vm()
        delta = " ".join(f"{k}={v1[k]-v0[k]}" for k in keys if k in v1)
        print(f"{spec:24s} st={st} wall {dt:.2f} user {ru.ru_utime:.2f} sys {ru.ru_stime:.2f} minflt {ru.ru_minflt} rss {ru.ru_maxrss//1024}MB | {delta}", flush=True)
