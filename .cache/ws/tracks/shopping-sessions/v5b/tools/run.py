import os, sys, json, subprocess, time, shutil, re, statistics
W = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5b"
def run_one(binp, data, out, ncpu=2, cores="0,1", env_extra=None, trace=False):
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    env = dict(PATH="/usr/bin:/bin", DATA_DIR=data, OUTPUT_DIR=out, SCRATCH_DIR=W + "/tmp", NCPU=str(ncpu), MEM_GB="24")
    if trace: env["SESSIONS_TRACE"] = "1"
    if env_extra: env.update(env_extra)
    t0 = time.perf_counter()
    p = subprocess.Popen(["taskset", "-c", cores, binp], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    err = p.stderr.read(); outb = p.stdout.read()
    _, status, ru = os.wait4(p.pid, 0)
    wall = time.perf_counter() - t0
    return dict(wall=wall, user=ru.ru_utime, sys=ru.ru_stime, cpu=ru.ru_utime + ru.ru_stime, rss=ru.ru_maxrss // 1024, status=status, stdout=len(outb), err=err.decode(errors="replace"))
def stages(err):
    acc = {}
    for line in err.splitlines():
        m = re.match(r"trace t(\d+) (\S+) ([0-9.]+) ([0-9.]+) ([0-9.]+) (\d+) ([0-9.]+) ([0-9.]+)", line)
        if m:
            u = acc.setdefault(m.group(2), [0.0, 0.0])
            u[0] += float(m.group(7)); u[1] += float(m.group(8))
    return acc
if __name__ == "__main__":
    spec = json.loads(sys.argv[1])
    rounds = spec.get("rounds", 3)
    res = {it["label"]: [] for it in spec["items"]}
    for r in range(rounds):
        order = spec["items"] if r % 2 == 0 else list(reversed(spec["items"]))
        for it in order:
            out = W + "/runs/out_" + it["label"]
            x = run_one(it["bin"], it["data"], out, it.get("ncpu", 2), spec.get("cores", "0,1"), it.get("env"), it.get("trace", False))
            st = stages(x["err"])
            x["st"] = st
            res[it["label"]].append(x)
            print(f"r{r} {it['label']:12s} wall {x['wall']:7.3f} cpu {x['cpu']:7.3f} (u {x['user']:.2f} s {x['sys']:.2f}) rss {x['rss']}M st {x['status']} stdout {x['stdout']} " + " ".join(f"{k}={v[0]/1000:.2f}+{v[1]/1000:.2f}" for k, v in st.items() if v[0] + v[1] > 5), flush=True)
            if x["status"] != 0: print(x["err"][-2000:])
    for lab, xs in res.items():
        keys = sorted({k for x in xs for k in x["st"]})
        if keys:
            print(f"STAGES {lab:12s} median user+sys s: " + " ".join(f"{k}={statistics.median(x['st'].get(k,[0,0])[0] for x in xs)/1000:.2f}+{statistics.median(x['st'].get(k,[0,0])[1] for x in xs)/1000:.2f}" for k in keys if statistics.median(sum(x['st'].get(k,[0,0])) for x in xs) > 5))
        print(f"MIN    {lab:12s} cpu {min(x['cpu'] for x in xs):.3f} user {min(x['user'] for x in xs):.3f}")
        print(f"MEDIAN {lab:12s} cpu {statistics.median(x['cpu'] for x in xs):.3f} user {statistics.median(x['user'] for x in xs):.3f} sys {statistics.median(x['sys'] for x in xs):.3f} wall {statistics.median(x['wall'] for x in xs):.3f} rss {statistics.median(x['rss'] for x in xs)}M")
