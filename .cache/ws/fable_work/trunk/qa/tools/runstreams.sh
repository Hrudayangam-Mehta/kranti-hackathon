#!/bin/bash
# runstreams.sh <jobs file> <outdir>: "name|slot|env|stream|dirs..." ; 2 at a time, nice 19, FUSE=1, JSC env of the Dockerfile
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
O=$2; mkdir -p $O; export S O
run1() { IFS='|' read -r name slot env stream dirs <<< "$1"; [ -s $O/$name.txt ] && grep -q decisions $O/$name.txt && exit 0
  SLOT=$slot ENV=$env FUSE=1 nice -n 19 env BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1 \
    $S/mechbot/bun $S/fable_work/trunk/qa/tools/qstream.mjs $stream $dirs > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt; }
export -f run1
tr '\n' '\0' < $1 | xargs -0 -P 2 -I{} bash -c 'run1 "$@"' _ {}
echo done > $O/done_$(basename $1 .txt).txt
