#!/bin/sh
# build.sh NAME : build src_tree with the Dockerfile's flags into try/proc/target, copy to bin/NAME
set -eu
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/proc
cd $P/src_tree
export CARGO_TARGET_DIR=$P/target
export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="${EXTRA_RUSTFLAGS:-} -C target-feature=+crt-static"
taskset -c ${BUILD_CPUS:-2,3} cargo build --release --locked --offline --target x86_64-unknown-linux-gnu 2>&1 | grep -E "^(warning|error)|Finished" | head -20
cp $P/target/x86_64-unknown-linux-gnu/release/sessions $P/bin/$1
sha256sum $P/bin/$1 | cut -c1-16
