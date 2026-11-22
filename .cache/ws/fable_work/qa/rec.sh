#!/bin/bash
# rec.sh <core> <jobfile>; job line: outname|lib|ovr|cmd|a1|a2
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; P=$S/mechbot; Q=$S/fable_work/qa
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
while IFS='|' read -r name lib ovr cmd a1 a2; do
  o=$Q/rec/$name; mkdir -p $(dirname $o)
  if [ -f $o.meta.json ] && [ -z "$FORCE" ]; then continue; fi
  if [ -n "$ovr" ]; then OVR="$ovr" taskset -c $1 env $JSC $P/bun $S/r7work/tools/rec7.js $lib $cmd $a1 $a2 $o > $o.txt 2>&1 || echo "FAILED $name" >> $Q/rec/failures.txt
  else taskset -c $1 env $JSC $P/bun $S/r7work/tools/rec7.js $lib $cmd $a1 $a2 $o > $o.txt 2>&1 || echo "FAILED $name" >> $Q/rec/failures.txt; fi
done < $2
echo "lane $1 done" >> $Q/rec/done.txt
