#!/bin/bash
# sim batch (engineer S copy of chaos/tools/simb.sh): simb.sh TAG LIB EXTRA(select json fragment or empty) [seeds]
# the lib's own SELECT (CH1 in survive/tree) + EXTRA, salt 1, fuseMs 1e9; output trunk/survive/sim/<TAG>/sqN.meta.json
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
SV=$S/fable_work/trunk/survive; P=$S/mechbot
TAG=$1; LIB=$2; EXTRA=$3; SEEDS=${4:-$(seq 1 24)}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
O=$SV/sim/$TAG; mkdir -p $O
for sd in $SEEDS; do [ -f $O/sq$sd.meta.json ] && continue
  OVR="{\"select\":{$EXTRA},\"salt\":1,\"fuseMs\":1e9}" nice -n 19 env $JSC $P/bun $SV/tools/recs.js $LIB match $sd squad $O/sq$sd > $O/sq$sd.txt 2>&1; rm -f $O/sq$sd.jsonl; done
echo done > $O/done.txt
