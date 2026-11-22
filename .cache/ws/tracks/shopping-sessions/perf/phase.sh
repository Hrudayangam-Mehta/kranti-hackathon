#!/bin/sh
# usage: phase.sh BIN [NCPU] [RUNS] -> wall/user/sys + phases per run
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
B=$1; N=${2:-2}; RUNS=${3:-2}; D=${DATA:-$S/m1data/p20m}; CORES=${CORES:-2,3}
for i in $(seq $RUNS); do
rm -rf $S/perf/root20/output; mkdir -p $S/perf/root20/output
python3 - "$B" "$N" "$D" "$CORES" <<'PY'
import os, resource, subprocess, sys, time
b, n, d, cores = sys.argv[1:5]
S="/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
env = dict(DATA_DIR=d, OUTPUT_DIR=S+"/perf/root20/output", NCPU=n)
for k in os.environ:
    if k.startswith("SESSIONS_"): env[k] = os.environ[k]
t=time.perf_counter()
p = subprocess.run(["taskset","-c",cores,b], env=env, stderr=subprocess.PIPE, text=True)
dt=time.perf_counter()-t
r = resource.getrusage(resource.RUSAGE_CHILDREN)
ph = " ".join(l.split()[0]+"="+l.split()[1] for l in p.stderr.splitlines() if l.split() and l.split()[0] in ("setup","parse","dedup","people","write"))
print(f"{os.path.basename(b)} N={n} exit {p.returncode} wall {dt:.3f} user {r.ru_utime:.2f} sys {r.ru_stime:.2f} flt {r.ru_minflt} | {ph}")
PY
done
