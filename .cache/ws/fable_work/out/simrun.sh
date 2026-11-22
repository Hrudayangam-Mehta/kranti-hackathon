#!/bin/bash
# 24-match behaviour-only sim per build (rec7 closed loop, squad seeds 1-24; SELECT and salt as baked into the variant's params.js) + kit stream
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; F=$S/fable_work; P=$S/mechbot
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
core=$1; shift
for n in "$@"; do
  if [ "$n" = OPUSBASE ]; then LIB=$S/variants6/FSLCL15_s1/bot/lib; else LIB=$F/builds/$n/bot/lib; fi
  O=$F/out/sim24/$n; mkdir -p $O
  for sd in $(seq 1 24); do [ -f $O/sq$sd.meta.json ] || taskset -c $core env $JSC $P/bun $F/tools/rec7.js $LIB match $sd squad $O/sq$sd > $O/sq$sd.txt 2>&1; done
  for e in squad auto ffa; do [ -f $O/kit_$e.meta.json ] || taskset -c $core env $JSC $P/bun $F/tools/rec7.js $LIB stream $P/kit/check/stream.jsonl.gz $e $O/kit_$e > $O/kit_$e.txt 2>&1; done
  echo "done $n"
done
