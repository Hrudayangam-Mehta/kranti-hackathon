#!/bin/bash
# usage: run.sh <tag> <extraOVR> <seeds...>
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; R=$S/fable_work/switch/pa
export BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
tag=$1; extra=$2; shift 2; LIB=${LIB:-$W/ckpt_07_LG/lib}; mkdir -p $R/sim/$tag
for sd in "$@"; do [ -f $R/sim/$tag/sq$sd.json ] && continue
  OVR="{\"select\":{$KS},\"salt\":1,\"lcCoverS\":0,\"lcLowHpf\":0,\"fuseMs\":100000$extra}" nice -n 19 $P/bun $R/recpa.js $LIB $sd $R/sim/$tag/sq$sd.json >> $R/sim/$tag/log.txt 2>&1; done
echo done $tag
