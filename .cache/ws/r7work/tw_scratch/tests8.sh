#!/bin/bash
# checkpoint 08 test groups (each a separate process on core ${CORE:-1}): new TW test, extended T-F2, the R7 groups, the four suites
B=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun; W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work; T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch; BOT=$W/ckpt_08_TW; C=${CORE:-1}
run() { local name=$1; shift; local t0=$(date +%s); taskset -c $C "$@" > $T/logs/test_$name.txt 2>&1; local rc=$?; echo "$name rc=$rc $(($(date +%s)-t0))s :: $(grep -E '^[0-9]+/[0-9]+ ' $T/logs/test_$name.txt | tail -1 | cut -c1-160)"; }
cd $T
run tw8 $B $T/test_tw8.mjs $BOT
run tf2 $B $T/test_tf2.mjs $BOT
for g in anchors7 test_rb7 test_io7 test_aggr7 test_lx7 test_fin7 test_iso7 test_lg7; do run $g $B $W/tools/$g.mjs $BOT; done
cd $T/suite/tools
run test_world $B $T/suite/tools/test_world.js
run test_brain $B $T/suite/tools/test_brain.js
run test_counters $B $T/suite/tools/test_counters.js
run test_requests $B $T/suite/tools/test_requests.js
echo TESTS8_DONE
