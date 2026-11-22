#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; W=$S/fable_work/switch; P=$S/mechbot; cd $W
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
mkdir -p qa/tf2
for n in NC PM ID UTtgt UT DL DLidle UF UTwait FUwork; do for x in l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz; do
  mkdir -p qa/tf2/$n; OVR='{"fuseMs":1e9}' nice -n 19 env $JSC $P/bun tools/recs.js $W/builds/SW_${n}_s1/bot/lib stream ${x#*:} ffa qa/tf2/$n/${x%%:*}_ffa > qa/tf2/$n/${x%%:*}_ffa.txt 2>&1
done; done; echo done > qa/tf2.done
