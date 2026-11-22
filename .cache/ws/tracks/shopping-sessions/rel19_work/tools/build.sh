#!/bin/bash
set -o pipefail
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel19_work
NAME=$1
SRC=${2:-$W/tree}
TGT=${3:-$W/target}
if [ "${SNAP:-1}" = "1" ]; then
  rm -rf $W/snap/$NAME; mkdir -p $W/snap; cp -a $SRC $W/snap/$NAME; TREE=$W/snap/$NAME
else
  TREE=$SRC
fi
cd $TREE || exit 1
t0=$(date +%s)
CARGO_TARGET_DIR=$TGT CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" nice -n 10 taskset -c 2,3 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $W/logs/build_$NAME.log 2>&1
rc=$?
t1=$(date +%s)
if [ $rc -ne 0 ]; then echo "BUILD FAILED rc=$rc"; grep -E "^(error|warning)" -A 12 $W/logs/build_$NAME.log | head -150; exit 1; fi
grep -E "^(warning|error)" $W/logs/build_$NAME.log | sort | uniq -c
cp $TGT/x86_64-unknown-linux-gnu/release/sessions $W/bin/$NAME
sha256sum $W/bin/$NAME | cut -c1-64 > $W/bin/$NAME.sha256
echo "built $NAME from $TREE in $((t1-t0)) s: $(cat $W/bin/$NAME.sha256)"
