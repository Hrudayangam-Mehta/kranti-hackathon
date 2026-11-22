#!/bin/sh
# cg.sh NAME : debug-info build of src_tree, callgrind on dev set with NCPU=1
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/parse
S=$P/../..
cd $P/src_tree && CARGO_PROFILE_RELEASE_DEBUG=1 CARGO_PROFILE_RELEASE_STRIP=false CARGO_TARGET_DIR=$P/target_dbg cargo build --release --offline 2>&1 | grep -E "^error" -A5
mkdir -p $P/cg; rm -rf $P/cg/out; mkdir $P/cg/out
DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$P/cg/out NCPU=1 taskset -c ${CORE:-3} timeout 900 valgrind --tool=callgrind --callgrind-out-file=$P/cg/${1:-cg}.out $P/target_dbg/release/sessions 2>&1 | grep "refs"
