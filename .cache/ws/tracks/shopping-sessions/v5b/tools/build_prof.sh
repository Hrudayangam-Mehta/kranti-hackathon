#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/v5b
NAME=$1
cd $W/tree || exit 1
CARGO_PROFILE_RELEASE_STRIP=false CARGO_PROFILE_RELEASE_DEBUG=line-tables-only CARGO_TARGET_DIR=$W/target_prof CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" taskset -c 0,1 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $W/logs/buildprof_$NAME.log 2>&1 || { tail -30 $W/logs/buildprof_$NAME.log; exit 1; }
cp $W/target_prof/x86_64-unknown-linux-gnu/release/sessions $W/bin/prof_$NAME
echo built prof_$NAME
