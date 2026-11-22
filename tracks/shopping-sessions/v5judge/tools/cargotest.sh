#!/bin/bash
J=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5judge
for t in a b; do
  cd $J/src_$t && CARGO_TARGET_DIR=$J/target_${t}_test CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" taskset -c 0-3 cargo test --release --locked --offline --target x86_64-unknown-linux-gnu > $J/logs/cargotest_$t.log 2>&1
  echo "cargo test src_$t rc=$? : $(grep -E '^test result' $J/logs/cargotest_$t.log | tr '\n' ' ')"
done
