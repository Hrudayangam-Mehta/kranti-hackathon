#!/usr/bin/env python3
import os, re, shutil, statistics, subprocess, sys, time, json
L = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/layout"
B = L + "/../.."
args = sys.argv[1:]
opts = {"runs": "5", "ncpu": "2", "cores": "2,3", "data": B + "/m1data/p20m", "quiet": "8", "tag": ""}
bins = []
while args:
    a = args.pop(0)
    if a.startswith("--"):
        opts[a[2:]] = args.pop(0)
    else:
        bins.append(a)
runs = int(opts["runs"])
out = L + "/runs/bench_out"
names = ["setup", "parse", "dedup", "join", "people", "write"]
def quiet(limit, patience=15):
    t0 = time.time()
    while time.time() - t0 < patience:
        some = open("/proc/pressure/cpu").readline().split()
        avg10 = float(some[1].split("=")[1])
        if avg10 < limit:
            return avg10
        time.sleep(0.5)
    return avg10
res = {b: [] for b in bins}
for r in range(runs):
    for spec in bins:
        b, _, extra = spec.partition(":")
        env = dict(DATA_DIR=opts["data"], OUTPUT_DIR=out, NCPU=opts["ncpu"], SCRATCH_DIR=L + "/runs/tmp", HOME=L + "/runs/tmp", MEM_GB="24")
        for kv in filter(None, extra.split(",")):
            k, v = kv.split("=")
            env[k] = v
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        p0 = quiet(float(opts["quiet"]))
        t = time.perf_counter()
        p = subprocess.Popen(["taskset", "-c", opts["cores"], b if "/" in b else L + "/bin/" + b], env=env, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL)
        err = p.stderr.read().decode()
        _, status, ru = os.wait4(p.pid, 0)
        wall = time.perf_counter() - t
        if status:
            print("FAIL", spec, status, err[-500:])
            sys.exit(1)
        laps = {}
        for line in err.splitlines():
            m = re.match(r"^(\w+)\s+([\d.]+) ms$", line.strip())
            if m:
                laps[m.group(1)] = float(m.group(2))
            m = re.match(r"^links\s+([\d.]+) ms on one thread", line.strip())
            if m:
                laps["links1"] = float(m.group(1))
        ph = {}
        prev = 0.0
        for n in names:
            if n in laps:
                ph[n] = laps[n] - prev
                prev = laps[n]
        ph["exit"] = wall * 1e3 - prev
        ph["links1"] = laps.get("links1", 0)
        res[spec].append(dict(wall=wall, cpu=ru.ru_utime + ru.ru_stime, user=ru.ru_utime, sys=ru.ru_stime, rss=ru.ru_maxrss / 1e6, minflt=ru.ru_minflt, ph=ph, psi=p0))
med = statistics.median
summary = {}
for spec in bins:
    v = res[spec]
    w = [x["wall"] for x in v]
    c = [x["cpu"] for x in v]
    phs = {k: med([x["ph"].get(k, 0) for x in v]) for k in names + ["exit", "links1"]}
    print(f"{os.path.basename(spec):24s} NCPU={opts['ncpu']} cores={opts['cores']} wall med {med(w):.3f} min {min(w):.3f} | cpu med {med(c):.3f} (user {med([x['user'] for x in v]):.2f} sys {med([x['sys'] for x in v]):.2f}) | rss {med([x['rss'] for x in v]):.2f} GB minflt {int(med([x['minflt'] for x in v]))}")
    print("    phases ms (median): " + " ".join(f"{k}={phs[k]:.0f}" for k in names + ["exit", "links1"]))
    print("    phases ms (min):    " + " ".join(f"{k}={min(x['ph'].get(k, 0) for x in v):.0f}" for k in names + ["exit", "links1"]) + f"  cpu min {min(c):.3f}")
    print("    walls: " + " ".join(f"{x:.3f}" for x in w) + "  cpus: " + " ".join(f"{x:.2f}" for x in c) + "  psi: " + " ".join(f"{x['psi']:.1f}" for x in v))
    summary[spec] = dict(wall_med=med(w), wall_min=min(w), cpu_med=med(c), phases=phs, runs=v)
if opts["tag"]:
    with open(L + "/runs/bench_" + opts["tag"] + ".json", "w") as f:
        json.dump(dict(opts=opts, summary=summary), f, indent=1)
