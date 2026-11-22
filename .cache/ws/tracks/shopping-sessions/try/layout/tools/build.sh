#!/bin/bash
L=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/layout
NAME=${1:-cur}
cd $L/src_tree
CARGO_TARGET_DIR=$L/target CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" \
  cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $L/runs/build.log 2>&1
rc=$?
grep -E "^(warning|error)|Finished|-->" $L/runs/build.log | head -30
if [ $rc != 0 ]; then echo "BUILD FAILED"; exit 1; fi
cp $L/target/x86_64-unknown-linux-gnu/release/sessions $L/bin/$NAME
sha256sum $L/bin/$NAME | cut -c1-16
