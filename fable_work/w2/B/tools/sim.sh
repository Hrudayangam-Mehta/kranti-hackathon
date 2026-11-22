#!/bin/bash
# sim batch (closed loop, chaos simulator via fable_work/chaos/tools/recs.js): [OVX='"key":val'] sim.sh TAG LIB 'select json fragment' [seeds]
# base = the bot's own SELECT (CH1 defaults); salt 1 and fuseMs 1e9 as the chaos runs; outputs w2/B/out/sim/<TAG>/sqN.meta.json
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/fable_work/chaos; P=$S/mechbot
TAG=$1; LIB=$2; SEL=$3; SEEDS=${4:-$(seq 1 24)}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
O=$S/fable_work/w2/B/out/sim/$TAG; mkdir -p $O
for sd in $SEEDS; do [ -f $O/sq$sd.meta.json ] && continue
  OVR="{\"select\":{$SEL},\"salt\":1,\"fuseMs\":1e9${OVX:+,$OVX}}" nice -n 19 env $JSC $P/bun $W/tools/recs.js $LIB match $sd squad $O/sq$sd > $O/sq$sd.txt 2>&1; rm -f $O/sq$sd.jsonl; done
echo done > $O/done.txt
