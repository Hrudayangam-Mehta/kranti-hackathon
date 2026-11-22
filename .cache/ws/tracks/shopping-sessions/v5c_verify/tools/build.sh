#!/bin/bash
set -o pipefail
V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5c_verify
NAME=$1; TREE=$2; TGT=$3
cd $TREE || exit 1
t0=$(date +%s)
CARGO_TARGET_DIR=$TGT CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" nice -n 10 taskset -c 2,3 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $V/logs/build_$NAME.log 2>&1
rc=$?
t1=$(date +%s)
echo "rc=$rc in $((t1-t0)) s; warnings/errors: $(grep -cE '^(warning|error)' $V/logs/build_$NAME.log)"
[ $rc -eq 0 ] && cp $TGT/x86_64-unknown-linux-gnu/release/sessions $V/bin/$NAME && sha256sum $V/bin/$NAME
