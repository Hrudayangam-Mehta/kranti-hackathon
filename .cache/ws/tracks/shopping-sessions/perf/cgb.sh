#!/bin/sh
# cachegrind branch-sim on dev, 1 thread: prints instructions and mispredicts
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
SRC=${SRC:-$S/src_repo}
cd $SRC && CARGO_PROFILE_RELEASE_DEBUG=1 CARGO_PROFILE_RELEASE_STRIP=false CARGO_TARGET_DIR=$S/perf/build_dbg taskset -c 2,3 cargo build --release --offline 2>&1 | grep -E "^error" -A5
cd $S/perf/cg && rm -rf out && mkdir out && DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$S/perf/cg/out NCPU=1 taskset -c ${CORE:-3} timeout 1200 valgrind --tool=cachegrind --cache-sim=no --branch-sim=yes --cachegrind-out-file=$S/perf/cg/${1:-b}.out $S/perf/build_dbg/release/sessions 2>&1 | grep -E "I *refs|Mispredicts"
