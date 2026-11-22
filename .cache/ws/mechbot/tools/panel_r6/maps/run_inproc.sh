#!/bin/sh
# 24 squad seeds per map, V4 brain in-process (trace carries mode / leg), plus the blind brain on the base map
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4
M=$P/tools/panel_r6/maps
cd $P
for n in base rot90 mirx tr300 wide zs070 zs130 zt070; do
  ./bun sim/run.js --bot $V/bot/lib/brain.js --mode squad --matches 24 --seed 101 --jobs 4 --map-dir $M/$n --config $M/$n/hello.json \
    --json $M/out/ip_${n}.json --trace $M/out/trace_ip --trace-tag ${n} > $M/out/ip_${n}.txt 2>&1
  echo "$n $(date -u +%H:%M:%S)"
done
./bun sim/run.js --bot $M/blindbrain.mjs --mode squad --matches 24 --seed 101 --jobs 4 --map-dir $M/base --config $M/base/hello.json \
  --json $M/out/ip_blind.json --trace $M/out/trace_ip --trace-tag blind > $M/out/ip_blind.txt 2>&1
echo "blind $(date -u +%H:%M:%S)"
for n in base zt070 wide; do
  ./bun sim/run.js --bot $V/bot/lib/brain.js --mode ffa --matches 12 --seed 201 --jobs 4 --map-dir $M/$n --config $M/$n/hello.json \
    --json $M/out/ipffa_${n}.json --trace $M/out/trace_ip --trace-tag ffa_${n} > $M/out/ipffa_${n}.txt 2>&1
  echo "ffa $n $(date -u +%H:%M:%S)"
done
