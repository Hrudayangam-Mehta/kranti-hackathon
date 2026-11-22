#!/bin/sh
# usage: ab.sh NCPU CORES ROUNDS BIN... -> interleaved runs, medians per binary
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/scale
N=$1; C=$2; R=$3; shift 3
for i in $(seq $R); do for b in "$@"; do QUIET=1 python3 $T/tools/bench.py $T/bin/$b $N $C 1 | sed "s/^MEDIAN/run$i/"; done; done > $T/exp/ab_last.txt
python3 - $T/exp/ab_last.txt <<'PY'
import sys, re, statistics
rows = {}
for line in open(sys.argv[1]):
    m = re.match(r"run\d+ (\S+) NCPU=\S+ cores=\S+ wall ([0-9.]+) \(min [0-9.]+\) user ([0-9.]+) sys ([0-9.]+) \| (.*)", line)
    if not m: continue
    d = dict(kv.split("=") for kv in m.group(5).split())
    rows.setdefault(m.group(1), []).append((float(m.group(2)), float(m.group(3)), float(m.group(4)), {k: float(v) for k, v in d.items()}))
for b, rs in rows.items():
    med = statistics.median
    keys = list(rs[0][3])
    print(f"{b:8} n={len(rs)} wall {med([r[0] for r in rs]):.3f} min {min(r[0] for r in rs):.3f} user {med([r[1] for r in rs]):.2f} sys {med([r[2] for r in rs]):.2f} | " + " ".join(f"{k}={med([r[3][k] for r in rs if k in r[3]]):.0f}" for k in keys))
PY
