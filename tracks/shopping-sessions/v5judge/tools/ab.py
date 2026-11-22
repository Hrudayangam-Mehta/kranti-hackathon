import os, sys, time, subprocess, shutil, statistics, json
J = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5judge"
data = sys.argv[1]
rounds = int(sys.argv[2])
ncpus = sys.argv[3].split(",")
cores = sys.argv[4]
pairs = [a.split("=", 1) for a in sys.argv[5:]]
res = {}
log = []
for r in range(rounds):
    for n in ncpus:
        order = pairs[r % len(pairs):] + pairs[:r % len(pairs)]
        for label, b in order:
            out = f"{J}/runs/ab_{label}"
            shutil.rmtree(out, ignore_errors=True)
            os.makedirs(out)
            psi = open("/proc/pressure/cpu").readline().split()[1].split("=")[1]
            load = open("/proc/loadavg").read().split()[0]
            env = dict(DATA_DIR=data, OUTPUT_DIR=out, NCPU=n, PATH="/usr/bin:/bin")
            t = time.perf_counter()
            p = subprocess.Popen(["taskset", "-c", cores, b], env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            so = p.stdout.read()
            _, st, ru = os.wait4(p.pid, 0)
            dt = time.perf_counter() - t
            cpu = ru.ru_utime + ru.ru_stime
            res.setdefault((n, label), []).append((cpu, ru.ru_utime, ru.ru_stime, dt))
            line = f"round {r} NCPU {n} {label}: cpu {cpu:.3f} user {ru.ru_utime:.3f} sys {ru.ru_stime:.3f} wall {dt:.3f} maxrss {ru.ru_maxrss//1024}MB exit {st} stdout {len(so)} psi10 {psi} load {load}"
            print(line, flush=True)
labels = [l for l, _ in pairs]
for n in ncpus:
    for l in labels:
        v = res[(n, l)]
        print(f"SUMMARY NCPU {n} {l}: cpu median {statistics.median(x[0] for x in v):.3f} min {min(x[0] for x in v):.3f} | user {statistics.median(x[1] for x in v):.3f} sys {statistics.median(x[2] for x in v):.3f} | wall median {statistics.median(x[3] for x in v):.3f} min {min(x[3] for x in v):.3f} | n {len(v)}")
    base = res[(n, labels[0])]
    for l in labels[1:]:
        v = res[(n, l)]
        d = [v[i][0] - base[i][0] for i in range(min(len(v), len(base)))]
        wins = sum(1 for x in d if x < 0)
        print(f"PAIRED NCPU {n} {l} - {labels[0]}: median {statistics.median(d):+.3f} cpu-s, lower in {wins}/{len(d)}")
    if len(labels) >= 3:
        a, b = res[(n, labels[1])], res[(n, labels[2])]
        d = [b[i][0] - a[i][0] for i in range(min(len(a), len(b)))]
        print(f"PAIRED NCPU {n} {labels[2]} - {labels[1]}: median {statistics.median(d):+.3f} cpu-s, lower in {sum(1 for x in d if x < 0)}/{len(d)}")
