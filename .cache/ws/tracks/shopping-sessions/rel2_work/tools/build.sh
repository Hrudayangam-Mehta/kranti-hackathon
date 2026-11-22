#!/bin/sh
# build.sh NAME [SRC_DIR]: release build with the Dockerfile's flags into rel2_work/target, copy to rel2_work/bin/NAME
set -eu
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel2_work
SRC=${2:-$S/rel2}
cd "$SRC"
export CARGO_TARGET_DIR=${TARGET_DIR:-$W/target}
export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static"
taskset -c ${BUILD_CPUS:-0-3} cargo build --release --locked --offline --target x86_64-unknown-linux-gnu 2>&1 | grep -E "^(warning|error)|Finished|-->" | head -30
cp "$CARGO_TARGET_DIR/x86_64-unknown-linux-gnu/release/sessions" "$W/bin/$1"
sha256sum "$W/bin/$1" | cut -c1-16
