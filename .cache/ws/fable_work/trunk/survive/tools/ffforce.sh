#!/bin/bash
# forced-FFA sim matches 411-414 (env 'ffa' in the overrides): idq-style, trunk/survive/id/<TAG>/ffF<seed>
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
SV=$S/fable_work/trunk/survive; P=$S/mechbot; TAG=$1; LIB=$2; OV=$3
O=$SV/id/$TAG; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
for sd in 411 412 413 414; do OVR="$OV" nice -n 19 env $JSC $P/bun $SV/tools/recs.js $LIB match $sd ffa $O/ffF$sd > $O/ffF$sd.txt 2>&1; done
