#!/bin/bash
# R7a sim guards at salt 1 (behaviour only): KS + EXTRA on squad seeds SEEDS, recorded with rec7 (meta has counters, lastFinT).
#   TAG=<name> LIB=<lib> EXTRA='"key":"val"' SEEDS="1 2 ..." simguard.sh
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
TAG=${TAG:?}; LIB=${LIB:?}; EXTRA=${EXTRA:-}; O=$W/id/$TAG; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on"'
SEL="$KS"; [ -n "$EXTRA" ] && SEL="$KS,$EXTRA"
OV="{\"select\":{$SEL},\"salt\":1}"
lane() { local core=$1 idx=$2 k=0; for sd in ${SEEDS:-$(seq 1 20)}; do if [ $((k % 2)) -eq $idx ] && [ ! -f $O/sq$sd.meta.json ]; then OVR="$OV" taskset -c $core env $JSC $P/bun $W/tools/rec7.js $LIB match $sd squad $O/sq$sd > $O/sq$sd.txt 2>&1; fi; k=$((k+1)); done; }
lane 0 0 & lane 1 1 & wait
echo "done $TAG"
