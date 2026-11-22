#!/bin/sh
set -e
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
NAME=${1:-sessions}
cd $S/src_repo
CARGO_TARGET_DIR=$S/perf/build CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="${EXTRA_RUSTFLAGS} -C target-feature=+crt-static" \
  taskset -c 2,3 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu 2>&1 | grep -E "^(warning|error)|Finished|-->" || true
cp $S/perf/build/x86_64-unknown-linux-gnu/release/sessions $S/perf/bin/$NAME
sha256sum $S/perf/bin/$NAME | cut -c1-16
