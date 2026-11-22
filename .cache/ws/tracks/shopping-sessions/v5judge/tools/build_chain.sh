#!/bin/bash
J=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5judge
while ! grep -q -E 'Finished|error' $J/logs/build_afix.log; do sleep 5; done
for t in bweak afixweak; do
  (cd $J/src_$t && CARGO_TARGET_DIR=$J/target_$t CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" taskset -c 0-3 cargo build --release --locked --offline --target x86_64-unknown-linux-gnu > $J/logs/build_$t.log 2>&1); echo "build $t rc=$? $(tail -1 $J/logs/build_$t.log)"
done
