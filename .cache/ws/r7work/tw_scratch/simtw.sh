#!/bin/bash
# Checkpoint 08 candidate sims (behaviour only): the lib's own SELECT and salt (v538_08 = the 5.38 SELECT, salt 1) on squad
# seeds SEEDS, plus TOP (top-level overrides, e.g. '"sqOverrides":{"keepTargetHpf":0.4}'). rec7 recordings into tw_scratch/id/<TAG>.
#   TAG=<name> LIB=<lib> TOP='...' SEEDS="1 .. 24" simtw.sh
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work; P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot; T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch
TAG=${TAG:?}; LIB=${LIB:?}; TOP=${TOP:-}; O=$T/id/$TAG; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
OV="{$TOP}"
lane() { local core=$1 idx=$2 k=0; for sd in ${SEEDS:-$(seq 1 24)}; do if [ $((k % 2)) -eq $idx ] && [ ! -f $O/sq$sd.meta.json ]; then OVR="$OV" taskset -c $core env $JSC $P/bun $W/tools/rec7.js $LIB match $sd squad $O/sq$sd > $O/sq$sd.txt 2>&1; fi; k=$((k+1)); done; }
lane 0 0 & lane 1 1 & wait
# re-record fuse trips (a decision > 30 ms on the shared machine), up to 4 times
for try in 1 2 3 4; do bad=0; for m in $O/sq*.meta.json; do f=$(python3 -I -c "import json,sys; print(json.load(open(sys.argv[1]))['fuse'])" $m); [ "$f" = 0 ] && continue; bad=$((bad+1)); sd=$(basename $m .meta.json); sd=${sd#sq}; OVR="$OV" taskset -c 0 env $JSC $P/bun $W/tools/rec7.js $LIB match $sd squad $O/sq$sd > $O/sq$sd.txt 2>&1; done; [ $bad = 0 ] && break; done
echo "done $TAG"
