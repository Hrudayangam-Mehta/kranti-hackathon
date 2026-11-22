#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; F=$S/fable_work/r1_psych
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
tag=$1; extra=$2; core=$3; mkdir -p $F/sim/$tag
for sd in $(seq $4 $5); do OVR="{\"select\":{$KS},\"salt\":1,\"lcLowHpf\":0.10,\"fuseMs\":100000$extra}" taskset -c $core env $JSC $P/bun $W/tools/rec7.js $F/lib match $sd squad $F/sim/$tag/sq$sd > $F/sim/$tag/sq$sd.txt 2>&1; rm -f $F/sim/$tag/sq$sd.jsonl; done; echo done $tag
