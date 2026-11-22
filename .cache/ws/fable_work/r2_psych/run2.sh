#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; R=$S/fable_work/r2_psych
export BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
one() { local tag=$1 extra=$2 sd=$3; mkdir -p $R/sim/$tag; [ -f $R/sim/$tag/sq$sd.meta.json ] && return
  OVR="{\"select\":{$KS},\"salt\":1,\"lcLowHpf\":0.10,\"fuseMs\":100000$extra}" taskset -c 2 $P/bun $R/rec7p.js $W/ckpt_07_LG/lib match $sd squad $R/sim/$tag/sq$sd > $R/sim/$tag/sq$sd.txt 2>&1; rm -f $R/sim/$tag/sq$sd.jsonl; }
while pgrep -f "r2_psych/rec7p.js" > /dev/null; do sleep 1; done
for sd in $(seq 1 36); do one H10 ',"hostileDmgS":10' $sd; done; echo done H10
# base with history: only seeds whose H10 stream differs from the hackathon lead's fuse-0 low10 base (1-24), then 25-36
for sd in $(python3 $R/need.py); do one base '' $sd; done; echo done base
