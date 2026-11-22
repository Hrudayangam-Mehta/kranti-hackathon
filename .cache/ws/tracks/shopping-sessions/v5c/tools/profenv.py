import os, sys, subprocess, shutil, collections, statistics
W = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5c"
data, ncpu, rounds = sys.argv[1], sys.argv[2], int(sys.argv[3])
variants = [a.split("@") for a in sys.argv[4:]]
res = {}
for r in range(rounds):
    for name, b, extra in (variants if r % 2 == 0 else variants[::-1]):
        out = f"{W}/runs/profenv_{name}"
        shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=ncpu, SESSIONS_TRACE="1")
        for kv in filter(None, extra.split(",")):
            k, v = kv.split("="); env[k] = v
        p = subprocess.Popen(["nice", "-n", "10", "taskset", "-c", "2,3", b], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        err = p.stderr.read()
        _, st, ru = os.wait4(p.pid, 0)
        stages = collections.OrderedDict()
        for line in err.splitlines():
            f = line.split()
            if len(f) == 7 and f[0] == "trace" and f[1].startswith("t"):
                stages[f[2]] = stages.get(f[2], 0.0) + float(f[5]) / 1e3
        tot = ru.ru_utime + ru.ru_stime
        res.setdefault(name, []).append((tot, ru.ru_utime, ru.ru_stime, stages))
        print(f"round {r} {name} exit {st} cpu {tot:.2f} user {ru.ru_utime:.2f} sys {ru.ru_stime:.2f} | " + " ".join(f"{k}={v:.2f}" for k, v in stages.items() if v >= 0.005), flush=True)
for name, v in res.items():
    keys = list(v[0][3].keys())
    med = {k: statistics.median(x[3].get(k, 0.0) for x in v) for k in keys}
    print(f"MEDIAN {name} n={len(v)} cpu {statistics.median(x[0] for x in v):.2f} user {statistics.median(x[1] for x in v):.2f} sys {statistics.median(x[2] for x in v):.2f} | " + " ".join(f"{k}={m:.2f}" for k, m in med.items() if m >= 0.005))
