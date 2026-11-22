#!/bin/sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
# wait for a quiet machine (1-min load below 1.2), up to 2 hours
i=0
while [ $i -lt 720 ]; do
  l=$(cut -d' ' -f1 /proc/loadavg)
  if awk -v l=$l 'BEGIN{exit !(l < 1.2)}'; then break; fi
  sleep 10; i=$((i+1))
done
echo "start $(date -u +%H:%M:%S) load $(cat /proc/loadavg)"
QUIET=8 python3 $S/perf/ab.py 3 m2_parquet m2_ts m2_thp m2_wc m2_dd m2_c m2_hist
echo "end $(date -u +%H:%M:%S) load $(cat /proc/loadavg)"
