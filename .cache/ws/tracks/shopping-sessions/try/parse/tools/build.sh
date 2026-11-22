#!/bin/sh
# usage: build.sh NAME  -> builds src_tree like the Dockerfile (static, generic x86_64), copies to bin/NAME
set -e
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse
NAME=${1:-cur}
cd $P/src_tree
CARGO_TARGET_DIR=$P/target CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" \
  cargo build --release --locked --offline --target x86_64-unknown-linux-gnu 2>&1 | grep -E "^(warning|error)|Finished|-->|^ *\|" || true
cp $P/target/x86_64-unknown-linux-gnu/release/sessions $P/bin/$NAME
sha256sum $P/bin/$NAME | cut -c1-16
