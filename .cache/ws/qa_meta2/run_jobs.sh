#!/bin/bash
# 2 lanes, nice 19, fuseMs 1e9 both sides (qarec.mjs sets it); skips jobs whose meta.json exists
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; Q=$S/qa_meta2
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
lane() { local idx=$1 k=0
  while IFS='|' read -r name lib stream env slot ov; do
    if [ $((k % 2)) -eq $idx ] && [ ! -f $Q/out/$name.meta.json ]; then
      OVR="$ov" nice -n 19 env $JSC timeout 900 $S/mechbot/bun $Q/qarec.mjs $lib $stream $env $slot $Q/out/$name > $Q/out/$name.txt 2>&1 || echo "FAILED $name" >> $Q/out/failures.txt
    fi; k=$((k+1)); done < $Q/jobs.txt; }
lane 0 & lane 1 & wait
echo done > $Q/out/done.txt
