#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel19_work
NAME=$1; shift
TREE=$W/snap/$NAME
cd $TREE || exit 1
CARGO_TARGET_DIR=$W/target_test nice -n 10 taskset -c 2,3 cargo test --release --locked --offline "$@" > $W/logs/unit_$NAME.txt 2>&1
echo "unit $NAME rc=$?: $(grep -E '^test result' $W/logs/unit_$NAME.txt | tr '\n' ' ') $(grep SCAN_DIFF $W/logs/unit_$NAME.txt | tr '\n' ' ')"
