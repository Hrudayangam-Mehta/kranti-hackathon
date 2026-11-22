#!/bin/bash
# build sim12.json (simcmp JSON_OUT) and print the rendered tables
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch; B=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun
cd $T && JSON_OUT=$T/sim12.json taskset -c 0 $B $T/simcmp.mjs base538 c01 c02 c03 c04 c05 c06 c07 c08 c09 c10 c11 c12 > $T/logs/simcmp12.txt 2>&1
cat $T/logs/simcmp12.txt
python3 -I $T/render_cands.py > $T/cands_tables.md
