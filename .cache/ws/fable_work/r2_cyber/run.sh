#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; C=$S/fable_work/r2_cyber
export BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
run() { local tag=$1 extra=$2; mkdir -p $C/sim/$tag; for sd in 412 419 421 413 420 415 416 411 422 418 414 417; do [ -f $C/sim/$tag/ff$sd.meta.json ] && continue
  OVR="{\"select\":{$KS},\"salt\":1,\"lcLowHpf\":0.10$extra}" taskset -c 2 $P/bun $W/tools/rec7.js $W/ckpt_07_LG/lib match $sd ffa $C/sim/$tag/ff$sd > $C/sim/$tag/ff$sd.txt 2>&1; rm -f $C/sim/$tag/ff$sd.jsonl; done; echo done $tag; }
for sd in 1; do :; done
run B10 ''
run LOWX ',"healEnterHp":0.40,"hfExit":0.55'
run HE40 ',"healEnterHp":0.40'
