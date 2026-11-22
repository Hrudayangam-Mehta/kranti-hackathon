#!/bin/sh
# many-seed sweep, current bot/ brain in-process, V4 and KS SELECT, squad 60 seeds + ffa 12 seeds each (core 2 only)
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot; W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r7/stress
cd $P
for s in v4 ks; do
  flock $W/core2.lock taskset -c 2 ./bun sim/run.js --bot ours --mode squad --matches 60 --seed 1001 --jobs 1 --overrides $W/ov_$s.json \
    --json $W/out/sq_$s.json --trace $W/trace --trace-tag sq_$s > $W/out/sq_$s.txt 2>&1
  echo "sq $s $(date -u +%H:%M:%S)"
done
for s in v4 ks; do
  flock $W/core2.lock taskset -c 2 ./bun sim/run.js --bot ours --mode ffa --matches 12 --seed 2001 --jobs 1 --overrides $W/ov_$s.json \
    --json $W/out/ffa_$s.json --trace $W/trace --trace-tag ffa_$s > $W/out/ffa_$s.txt 2>&1
  echo "ffa $s $(date -u +%H:%M:%S)"
done
