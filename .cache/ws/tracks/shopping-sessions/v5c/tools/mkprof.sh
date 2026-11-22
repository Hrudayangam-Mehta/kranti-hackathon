#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/v5c
SRC=$1; NAME=$2
P=$W/prof_$NAME
rm -rf $P; mkdir -p $P
(cd $SRC && tar cf - --exclude=./target . ) | (cd $P && tar xf -)
python3 $W/tools/cputrace.py $P
cd $P && CARGO_TARGET_DIR=$W/target_prof CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" nice -n 10 taskset -c 2,3 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $W/logs/build_prof_$NAME.log 2>&1 || { tail -30 $W/logs/build_prof_$NAME.log; exit 1; }
cp $W/target_prof/x86_64-unknown-linux-gnu/release/sessions $W/bin/prof_$NAME
rm -rf $P
echo "built prof_$NAME"
