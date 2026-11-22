import os, shutil, statistics, subprocess, sys, time
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
runs = int(sys.argv[1]); specs = sys.argv[2:]
data = os.environ.get("DATA", S + "/kit/data/dev"); ncpu = os.environ.get("NCPU", "1"); cores = os.environ.get("CORES", "3")
out = S + "/perf/root_ut/output"
u = {s: [] for s in specs}; w = {s: [] for s in specs}; sy = {s: [] for s in specs}
for r in range(runs):
    for spec in (specs if r % 2 == 0 else specs[::-1]):
        b, _, extra = spec.partition(":")
        env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=ncpu)
        for kv in filter(None, extra.split(",")):
            k, v = kv.split("="); env[k] = v
        shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        t = time.perf_counter()
        p = subprocess.Popen(["taskset", "-c", cores, b if "/" in b else S + "/perf/bin/" + b], env=env, stderr=subprocess.DEVNULL)
        _, st, ru = os.wait4(p.pid, 0)
        if st: print("FAIL", spec); sys.exit(1)
        w[spec].append(time.perf_counter() - t); u[spec].append(ru.ru_utime); sy[spec].append(ru.ru_stime)
def q(v, f): v = sorted(v); return v[int(f * (len(v) - 1))]
for s in specs:
    print(f"{s:14s} user med {statistics.median(u[s]):.3f} q25 {q(u[s],.25):.3f} min {min(u[s]):.3f} | sys med {statistics.median(sy[s]):.3f} | wall med {statistics.median(w[s]):.3f} min {min(w[s]):.3f}")
