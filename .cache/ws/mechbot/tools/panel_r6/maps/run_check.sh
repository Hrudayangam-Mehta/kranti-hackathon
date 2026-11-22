#!/bin/sh
# usage: run_check.sh <map name> <bot.js path>   (1-CPU quota group, the Dockerfile's engine limits)
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
M=$P/tools/panel_r6/maps
exec python3 -B $P/kit/check/check.py --stream $M/$1/stream.jsonl.gz --map-dir $M/$1 -- $P/tools/cg1.sh env \
  BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 \
  BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 \
  BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1 $P/bun $2
