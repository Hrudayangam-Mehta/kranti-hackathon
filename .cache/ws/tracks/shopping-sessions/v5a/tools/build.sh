#!/bin/bash
set -o pipefail
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
A=$S/v5a
NAME=$1
TREE=${2:-$A/tree}
cd $TREE || exit 1
t0=$(date +%s)
CARGO_TARGET_DIR=$A/target CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" nice -n 10 taskset -c 2,3 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $A/logs/build_$NAME.log 2>&1
rc=$?
t1=$(date +%s)
if [ $rc -ne 0 ]; then echo "BUILD FAILED rc=$rc"; grep -E "^(error|warning)" -A8 $A/logs/build_$NAME.log | head -80; exit 1; fi
grep -E "^(warning|error)" $A/logs/build_$NAME.log | sort | uniq -c
cp $A/target/x86_64-unknown-linux-gnu/release/sessions $A/bin/$NAME
echo "built $NAME in $((t1-t0)) s: $(sha256sum $A/bin/$NAME | cut -c1-64)"
