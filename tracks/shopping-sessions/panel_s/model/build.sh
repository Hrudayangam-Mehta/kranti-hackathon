#!/bin/sh
set -e
D=$1
cd "$D"
export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static"
taskset -c 0,1 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu -j 2 2>&1 | tail -3
sha256sum target/x86_64-unknown-linux-gnu/release/sessions
