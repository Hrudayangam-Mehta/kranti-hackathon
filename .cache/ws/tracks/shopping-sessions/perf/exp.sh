#!/bin/sh
# usage: exp.sh NAME  (builds perf/exp_src into perf/bin/NAME)
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
cd $S/perf/exp_src && CARGO_TARGET_DIR=$S/perf/build_exp CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" taskset -c 2,3 cargo build --release --offline --target x86_64-unknown-linux-gnu 2>&1 | grep -E "^error" -A6
cp $S/perf/build_exp/x86_64-unknown-linux-gnu/release/sessions $S/perf/bin/$1
