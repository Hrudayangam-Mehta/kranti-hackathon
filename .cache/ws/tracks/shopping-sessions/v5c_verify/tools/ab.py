import os, sys, time, shutil, statistics, subprocess
S = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
V = S + "/v5c_verify"
rounds = int(sys.argv[1]); ncpu = sys.argv[2]; data = sys.argv[3]; bins = sys.argv[4:]
res = {b: [] for b in bins}
for r in range(rounds):
    order = bins if r % 2 == 0 else list(reversed(bins))
    for b in order:
        out = f"{V}/runs/ab_{os.path.basename(b)}"
        shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        psi = open("/proc/pressure/cpu").readline().split()[1].split("=")[1]
        env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=ncpu)
        t = time.perf_counter()
        with open(out + ".err", "w") as err, open(out + ".stdout", "w") as so:
            p = subprocess.Popen(["nice", "-n", "10", "taskset", "-c", "2,3", b], env=env, stdout=so, stderr=err)
            _, st, ru = os.wait4(p.pid, 0)
        dt = time.perf_counter() - t
        rec = dict(wall=dt, user=ru.ru_utime, sys=ru.ru_stime, cpu=ru.ru_utime + ru.ru_stime, rss=ru.ru_maxrss / 1e6, minflt=ru.ru_minflt, st=st, psi=float(psi))
        res[b].append(rec)
        print(f"round {r} {os.path.basename(b)}: exit {st} wall {dt:.3f} user {rec['user']:.3f} sys {rec['sys']:.3f} cpu {rec['cpu']:.3f} maxrss {rec['rss']:.2f} GB minflt {rec['minflt']} psi10 {psi} stdout {os.path.getsize(out + '.stdout')}", flush=True)
        shutil.rmtree(out, ignore_errors=True)
for b, v in res.items():
    ok = [x for x in v if x["st"] == 0]
    m = lambda k: statistics.median(x[k] for x in ok)
    print(f"SUMMARY {os.path.basename(b)} n={len(ok)}/{len(v)}: cpu median {m('cpu'):.3f} (min {min(x['cpu'] for x in ok):.3f}, max {max(x['cpu'] for x in ok):.3f}) user median {m('user'):.3f} sys median {m('sys'):.3f} wall median {m('wall'):.3f} maxrss median {m('rss'):.2f} GB minflt median {m('minflt'):.0f}")
if len(bins) == 2:
    a, b = bins
    pairs = [(x, y) for x, y in zip(res[a], res[b]) if x["st"] == 0 and y["st"] == 0]
    for k in ("cpu", "user", "sys", "wall"):
        d = [y[k] - x[k] for x, y in pairs]
        lower = sum(1 for z in d if z < 0)
        print(f"PAIRED {os.path.basename(b)} - {os.path.basename(a)} {k}: median {statistics.median(d):+.3f} s, {os.path.basename(b)} lower in {lower}/{len(d)}")
