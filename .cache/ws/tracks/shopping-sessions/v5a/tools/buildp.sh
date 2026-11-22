#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
A=$S/v5a
NAME=$1
cd ${2:-$A/tree} || exit 1
CARGO_PROFILE_RELEASE_STRIP=none CARGO_PROFILE_RELEASE_DEBUG=line-tables-only CARGO_TARGET_DIR=$A/target_prof CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" nice -n 10 taskset -c 2,3 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $A/logs/buildp_$NAME.log 2>&1 || { tail -30 $A/logs/buildp_$NAME.log; exit 1; }
cp $A/target_prof/x86_64-unknown-linux-gnu/release/sessions $A/bin/$NAME
echo "built profiling $NAME"
