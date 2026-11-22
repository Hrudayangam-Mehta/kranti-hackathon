#!/bin/bash
set -o pipefail
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
D=$S/v5d
NAME=$1
TREE=${2:-$D/tree}
TGT=${3:-$D/target}
cd $TREE || exit 1
t0=$(date +%s)
CARGO_TARGET_DIR=$TGT CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" nice -n 10 taskset -c 0,1 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $D/logs/build_$NAME.log 2>&1
rc=$?
t1=$(date +%s)
if [ $rc -ne 0 ]; then echo "BUILD FAILED rc=$rc"; grep -E "^(error|warning)" -A8 $D/logs/build_$NAME.log | head -80; exit 1; fi
grep -E "^(warning|error)" $D/logs/build_$NAME.log | sort | uniq -c
cp $TGT/x86_64-unknown-linux-gnu/release/sessions $D/bin/$NAME
echo "built $NAME in $((t1-t0)) s: $(sha256sum $D/bin/$NAME | cut -c1-64)"
