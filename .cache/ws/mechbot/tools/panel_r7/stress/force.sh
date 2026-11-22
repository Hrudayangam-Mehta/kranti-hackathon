#!/bin/sh
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot; W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r7/stress
cd $W
for s in v4 ks; do
  flock $W/core2.lock taskset -c 2 $P/bun $W/force.mjs $W/ov_$s.json $s $W/out/force_$s.json pocket:12 edge:10 corner:8 zoneout:10 lowhp:10 pocketffa:6 late4:12 late2:12 late4auto:8 final4:12 late4low:8 sqlate4:8 > $W/out/force_$s.jsonl 2>$W/out/force_$s.err
  echo "force $s $(date -u +%H:%M:%S)"
done
# changed match clock (in-process brain, V4): 30 Hz x3, 20 Hz x1 (decision every 0.05 s), 10 Hz x1, and 24 mechs
cd $P
for c in hz30 dec1 hz10 m24; do
  flock $W/core2.lock taskset -c 2 ./bun sim/run.js --bot ours --mode squad --matches 12 --seed 1001 --jobs 1 --overrides $W/ov_v4.json --config $W/cfg_$c.json \
    --json $W/out/cfg_$c.json --trace $W/trace --trace-tag cfg_$c > $W/out/cfg_$c.txt 2>&1
  echo "cfg $c $(date -u +%H:%M:%S)"
done
