#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
cd $S/v5c
while pgrep -f "tools/fullgate.sh" > /dev/null || pgrep -f "tools/after_ab.sh" > /dev/null; do sleep 5; done
$S/kit/venv/bin/python -B tools/ab.py 5 2 $S/v5model/data/p20m5 bin/rel17 bin/c5 > logs/ab_rel17_c5.txt 2>&1
$S/kit/venv/bin/python -B tools/prof.py $S/v5model/data/p20m5 2 3 bin/rel17 bin/c5 > logs/prof_rel17_c5.txt 2>&1
tools/cg.sh bin/c5 3 > logs/cg_c5.txt 2>&1
cd tree && CARGO_TARGET_DIR=$S/v5c/target_test nice -n 10 taskset -c 2,3 cargo test --release --offline --target x86_64-unknown-linux-gnu > $S/v5c/logs/cargo_test_c5.txt 2>&1
echo "chain done" >> $S/v5c/logs/cargo_test_c5.txt
