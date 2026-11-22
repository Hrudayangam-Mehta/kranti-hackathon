import os, sys, time, shutil, statistics, subprocess, collections
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
D = S + "/v5d"
rounds = int(sys.argv[1]); ncpus = sys.argv[2].split(","); data = sys.argv[3]; bins = sys.argv[4:]
cores = os.environ.get("CORES", "0,1")
nice = os.environ.get("NICE", "10")
extra = dict(kv.split("=", 1) for kv in os.environ.get("EXTRA", "").split(",") if kv)
res = {}
def run(b, n, tag):
    out = f"{D}/runs/crit_{tag}"
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=n, SESSIONS_TRACE="1", **extra)
    t = time.perf_counter()
    with open(out + ".err", "w") as err, open(out + ".stdout", "w") as so:
        p = subprocess.Popen(["nice", "-n", nice, "taskset", "-c", cores, b], env=env, stdout=so, stderr=err)
        _, st, ru = os.wait4(p.pid, 0)
    dt = time.perf_counter() - t
    stages = {}
    marks = {}
    exit_at = None
    for line in open(out + ".err"):
        f = line.split()
        if len(f) >= 9 and f[0] == "trace" and f[1].startswith("t"):
            st_ = stages.setdefault(f[2], dict(first=1e18, last=0.0, busy=0.0, cpu=0.0, sys=0.0, threads=0, count=0))
            st_["first"] = min(st_["first"], float(f[3])); st_["last"] = max(st_["last"], float(f[4]))
            st_["busy"] += float(f[5]); st_["count"] += int(f[6]); st_["cpu"] += float(f[7]); st_["sys"] += float(f[8]); st_["threads"] += 1
        elif len(f) >= 4 and f[0] == "trace" and f[1] == "m":
            if f[2] == "clock":
                exit_at = float(f[-1])
            else:
                marks[f[2]] = float(f[3])
    return dict(wall=dt, user=ru.ru_utime, sys=ru.ru_stime, cpu=ru.ru_utime + ru.ru_stime, rss=ru.ru_maxrss / 1e6, st=st, minflt=ru.ru_minflt, stages=stages, marks=marks, exit_at=exit_at, stdout=os.path.getsize(out + ".stdout"))
for r in range(rounds):
    for n in ncpus:
        order = bins if r % 2 == 0 else list(reversed(bins))
        for b in order:
            rec = run(b, n, os.path.basename(b))
            res.setdefault((n, b), []).append(rec)
            print(f"round {r} NCPU {n} {os.path.basename(b)}: exit {rec['st']} wall {rec['wall']:.3f} user {rec['user']:.3f} sys {rec['sys']:.3f} cpu {rec['cpu']:.3f} rss {rec['rss']:.2f}GB minflt {rec['minflt']} stdout {rec['stdout']} exit_at {rec['exit_at']}", flush=True)
def med(xs):
    return statistics.median(xs) if xs else float("nan")
for (n, b), v in res.items():
    ok = [x for x in v if x["st"] == 0]
    print(f"\nSUMMARY NCPU {n} {os.path.basename(b)} n={len(ok)}/{len(v)}: wall {med([x['wall'] for x in ok]):.3f} cpu {med([x['cpu'] for x in ok]):.3f} user {med([x['user'] for x in ok]):.3f} sys {med([x['sys'] for x in ok]):.3f} exit_at {med([x['exit_at'] or 0 for x in ok]):.1f} ms rss {med([x['rss'] for x in ok]):.2f}GB")
    names = sorted({k for x in ok for k in x["stages"]}, key=lambda k: med([x["stages"][k]["first"] for x in ok if k in x["stages"]]))
    print(f"  {'stage':<11}{'first':>9}{'last':>9}{'span':>8}{'busy':>9}{'cpu':>9}{'sys':>8}{'thr':>4}{'busy/span':>10}")
    for k in names:
        xs = [x["stages"][k] for x in ok if k in x["stages"]]
        first = med([x["first"] for x in xs]); last = med([x["last"] for x in xs]); busy = med([x["busy"] for x in xs]); cpu = med([x["cpu"] for x in xs]); sy = med([x["sys"] for x in xs]); thr = med([x["threads"] for x in xs])
        span = last - first
        print(f"  {k:<11}{first:9.1f}{last:9.1f}{span:8.1f}{busy:9.1f}{cpu:9.1f}{sy:8.1f}{thr:4.0f}{(busy/span if span>0 else 0):10.2f}")
    mk = sorted({k for x in ok for k in x["marks"]}, key=lambda k: med([x["marks"][k] for x in ok if k in x["marks"]]))
    print("  marks: " + " ".join(f"{k}={med([x['marks'][k] for x in ok if k in x['marks']]):.1f}" for k in mk))
