import os, sys, time, shutil, statistics, subprocess, collections, json
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
A = S + "/v5a"
rounds = int(sys.argv[1]); ncpu = sys.argv[2]; data = sys.argv[3]; bins = sys.argv[4:]
trace = os.environ.get("AB_TRACE", "1")
cores = os.environ.get("AB_CORES", "2,3")
res = {b: [] for b in bins}
stages = {b: collections.defaultdict(list) for b in bins}
for r in range(rounds):
    order = bins if r % 2 == 0 else list(reversed(bins))
    for b in order:
        out = f"{A}/runs/ab_{os.path.basename(b)}"
        shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=ncpu, SESSIONS_TRACE=trace)
        t = time.perf_counter()
        with open(out + ".err", "w") as err, open(out + ".stdout", "w") as so:
            p = subprocess.Popen(["nice", "-n", "10", "taskset", "-c", cores, b], env=env, stdout=so, stderr=err)
            _, st, ru = os.wait4(p.pid, 0)
        dt = time.perf_counter() - t
        busy = collections.Counter()
        for line in open(out + ".err"):
            f = line.split()
            if len(f) >= 8 and f[0] == "trace" and f[1].startswith("t"):
                busy[f[2]] += float(f[7])
                if len(f) == 9:
                    busy[f[2] + "/sys"] += float(f[8])
        for k, v in busy.items():
            stages[b][k].append(v / 1000)
        rec = dict(wall=dt, user=ru.ru_utime, sys=ru.ru_stime, cpu=ru.ru_utime + ru.ru_stime, rss=ru.ru_maxrss / 1e6, st=st, minflt=ru.ru_minflt, majflt=ru.ru_majflt, inb=ru.ru_inblock * 512 / 1e6)
        res[b].append(rec)
        print(f"round {r} {os.path.basename(b)}: exit {st} wall {dt:.3f} user {rec['user']:.3f} sys {rec['sys']:.3f} cpu {rec['cpu']:.3f} maxrss {rec['rss']:.2f} GB minflt {rec['minflt']} majflt {rec['majflt']} in {rec['inb']:.0f}MB stdout {os.path.getsize(out + '.stdout')}", flush=True)
for b, v in res.items():
    ok = [x for x in v if x["st"] == 0]
    m = lambda k: statistics.median(x[k] for x in ok)
    print(f"SUMMARY {os.path.basename(b)} n={len(ok)}/{len(v)}: cpu median {m('cpu'):.3f} (min {min(x['cpu'] for x in ok):.3f}) user {m('user'):.3f} sys {m('sys'):.3f} wall {m('wall'):.3f} maxrss {m('rss'):.2f} GB")
    print("  stages (thread CPU s, median): " + " ".join(f"{k}={statistics.median(x):.3f}" for k, x in sorted(stages[b].items(), key=lambda kv: -statistics.median(kv[1]))))
if len(bins) == 2:
    a, b = bins
    pairs = [(x, y) for x, y in zip(res[a], res[b]) if x["st"] == 0 and y["st"] == 0]
    for k in ("cpu", "wall"):
        d = [y[k] - x[k] for x, y in pairs]
        print(f"PAIRED {os.path.basename(b)} - {os.path.basename(a)} {k}: median {statistics.median(d):+.3f} s, lower in {sum(1 for z in d if z < 0)}/{len(d)}")
