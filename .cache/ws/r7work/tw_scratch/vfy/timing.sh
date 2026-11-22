#!/bin/bash
# Verifier decision-time A/B on the kit stream (auto), one core (taskset -c 1), Dockerfile JSC limits, interleaved reps.
# Variants: c07 = ckpt_07_LG (default SELECT), c08 = ckpt_08_TW (default SELECT, tw off),
#           n07 = FNV_s1 copy (5.38), n08 = 5.38 on ckpt_08 (tw off), n08w = n08 + the 37-key broad override set.
# Default fuse (30 ms, as shipped) unless FUSE=off. Output: tw_scratch/vfy/tm/<variant>_<rep>.meta.json
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
V=$W/tw_scratch/vfy; O=$V/tm${FUSE:+_$FUSE}; mkdir -p $O
REPS=${REPS:-8}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
F=''; [ "$FUSE" = off ] && F='"fuseMs":1e9,'
BROAD=$(cat $V/broad.json)
declare -A LIB OV
LIB[c07]=$W/ckpt_07_LG/lib; OV[c07]="{${F%,}}"
LIB[c08]=$W/ckpt_08_TW/lib; OV[c08]="{${F%,}}"
LIB[n07]=$V/fnv_copy/lib;   OV[n07]="{${F%,}}"
LIB[n08]=$V/v538_08/bot/lib; OV[n08]="{${F%,}}"
LIB[n08w]=$V/v538_08/bot/lib; OV[n08w]="{${F}\"sqOverrides\":$BROAD}"
for r in $(seq 1 $REPS); do
  for v in c07 c08 n07 n08 n08w; do
    OVR="${OV[$v]}" taskset -c 1 env $JSC $P/bun $W/tools/rec7.js ${LIB[$v]} stream $P/kit/check/stream.jsonl.gz auto $O/${v}_$r > $O/${v}_$r.txt 2>&1
  done
done
echo TIMING_DONE
