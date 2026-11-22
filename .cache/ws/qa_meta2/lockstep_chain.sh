#!/bin/bash
# after the quiet gate rerun: lockstep kit-stream timing of each dist bundle, 2 runs each, engine limits of the Dockerfile
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; Q=$S/qa_meta2; V=$S/variants7
while [ ! -f $Q/gate/rerun_done.txt ]; do sleep 10; done
export BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1
uptime > $Q/lockstep.out
for r in 1 2; do for b in MT_A MT_B MT_ALL; do timeout 300 $S/mechbot/bun $S/metawork/lockstep.mjs $V/$b/dist/bot.js >> $Q/lockstep.out 2>&1; done; done
echo done > $Q/lockstep_done.txt
