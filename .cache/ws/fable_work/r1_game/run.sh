#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; G=$S/fable_work/r1_game
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
LIB=${LIB:-$G/lib}; N=${N:-36}
run() { local tag=$1 extra=$2; mkdir -p $G/out/$tag; for sd in $(seq 1 $N); do [ -f $G/out/$tag/sq$sd.meta.json ] && continue
  OVR="{\"select\":{$KS},\"salt\":1,\"lcLowHpf\":0.10$extra}" taskset -c 2 env $JSC $P/bun $G/rec7d.js $LIB match $sd squad $G/out/$tag/sq$sd > $G/out/$tag/sq$sd.txt 2>&1; rm -f $G/out/$tag/sq$sd.jsonl; done; echo done $tag; }
run "$1" "$2"
