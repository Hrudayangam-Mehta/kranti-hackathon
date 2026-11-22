#!/bin/bash
set -o pipefail
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/v5c
NAME=$1
TREE=${2:-$W/tree}
cd $TREE || exit 1
t0=$(date +%s)
CARGO_TARGET_DIR=$W/target CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" nice -n 10 taskset -c 2,3 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $W/logs/build_$NAME.log 2>&1
rc=$?
t1=$(date +%s)
if [ $rc -ne 0 ]; then echo "BUILD FAILED rc=$rc"; grep -E "^(error|warning)" -A8 $W/logs/build_$NAME.log | head -80; exit 1; fi
grep -E "^(warning|error)" $W/logs/build_$NAME.log | sort | uniq -c
cp $W/target/x86_64-unknown-linux-gnu/release/sessions $W/bin/$NAME
echo "built $NAME in $((t1-t0)) s: $(sha256sum $W/bin/$NAME | cut -c1-64)"
