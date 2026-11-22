#!/bin/bash
cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/gapwork
OUT=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/gapwork/runs/base3
mkdir -p $OUT
SEEDS=$(seq -s, 1 21)
COMMON="--mode squad --seeds $SEEDS --jobs 2 --timeout 1000 --map-dir /srv/mech-sparring/_arena --log-dir /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/gapwork/runs/simlogs --trace $OUT/traces --quiet"
taskset -c 2,3 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun sim/run.js --bot ours $COMMON --trace-tag ours --json $OUT/ours.json > $OUT/ours.txt 2>&1
for b in magic_53f6854 ttun_v8econ_b7e9a6d lance_171bc06_nosneak; do
  taskset -c 2,3 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun sim/run.js --bot "proc:/srv/mech-sparring/run.sh $b" $COMMON --trace-tag $b --json $OUT/$b.json > $OUT/$b.txt 2>&1
done
echo ALLDONE
