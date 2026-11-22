import os, re, shutil, statistics, subprocess, sys
P = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse"
data = os.environ.get("DATA", "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/m1data/p20m")
runs = int(sys.argv[1]); bins = sys.argv[2:]
ncpu = os.environ.get("NCPU", "1"); cores = os.environ.get("CORES", "2")
out = P + "/run/phase_out"
res = {b: {"parse": [], "total": [], "cpu": [], "user": []} for b in bins}
for r in range(runs):
    for b in bins:
        shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
        env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=ncpu)
        p = subprocess.Popen(["taskset", "-c", cores, P + "/bin/" + b], env=env, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL)
        err = p.stderr.read().decode()
        _, status, ru = os.wait4(p.pid, 0)
        if status: print("FAIL", b); sys.exit(1)
        lap = dict((m.group(1), float(m.group(2))) for m in re.finditer(r"^(setup|parse|dedup|people|write)\s+([0-9.]+) ms", err, re.M))
        res[b]["parse"].append(lap["parse"] - lap["setup"])
        res[b]["total"].append(lap["write"])
        res[b]["cpu"].append(ru.ru_utime + ru.ru_stime)
        res[b]["user"].append(ru.ru_utime)
for b in bins:
    d = res[b]
    print(f"{b:8s} parse-phase median {statistics.median(d['parse']):8.1f} ms min {min(d['parse']):8.1f} | total median {statistics.median(d['total']):8.1f} ms | cpu median {statistics.median(d['cpu']):.3f} s min {min(d['cpu']):.3f} | user median {statistics.median(d['user']):.3f} | parse runs {' '.join(f'{x:.0f}' for x in d['parse'])}")
