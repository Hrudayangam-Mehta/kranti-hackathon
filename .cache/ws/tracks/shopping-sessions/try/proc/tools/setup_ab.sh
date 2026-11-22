#!/bin/sh
# setup_ab.sh N DATA BIN... : run each binary N times interleaved, print min/median of the setup lap
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/proc
N=$1; DATA=$2; shift 2
for i in $(seq $N); do for b in "$@"; do rm -rf $P/runs/sab; mkdir -p $P/runs/sab; printf "%s " $(basename $b); env -i DATA_DIR=$DATA OUTPUT_DIR=$P/runs/sab NCPU=4 taskset -c 0-3 $b 2>&1 | awk '/^setup/{print $2}'; done; done | python3 -c "
import sys,statistics as st
d={}
for l in sys.stdin:
    n,v=l.split(); d.setdefault(n,[]).append(float(v))
for n,v in d.items(): print(n, 'setup min %.2f med %.2f n %d' % (min(v), st.median(v), len(v)))
"
