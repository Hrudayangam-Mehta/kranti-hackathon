#!/bin/sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
cd $S/src_repo && CARGO_PROFILE_RELEASE_DEBUG=1 CARGO_PROFILE_RELEASE_STRIP=false CARGO_TARGET_DIR=$S/perf/build_dbg taskset -c 2,3 cargo build --release --offline 2>&1 | grep -E "^error" -A5
cd $S/perf/cg && rm -rf out && mkdir out && DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$S/perf/cg/out NCPU=1 taskset -c ${CORE:-3} timeout 900 valgrind --tool=callgrind --callgrind-out-file=$S/perf/cg/${1:-cg}.out $S/perf/build_dbg/release/sessions 2>&1 | grep "refs"
callgrind_annotate --inclusive=yes $S/perf/cg/${1:-cg}.out 2>/dev/null | sed -n 20,${2:-50}p | sed 's#/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/src_repo/##g; s#\[/tmp.*##; s#/rustc/[0-9a-f]*/library/##' | cut -c1-150 | grep -v "pthread_create\|thread_start\|lifecycle\|backtrace\|function.rs\|boxed.rs\|libc-start\|below main\|ld-linux"
