#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; F=$S/fable_work
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
run() { local tag=$1 extra=$2; mkdir -p $F/sim/$tag; for sd in $(seq 1 36); do [ -f $F/sim/$tag/sq$sd.meta.json ] && continue
  OVR="{\"select\":{$KS},\"salt\":1,$extra}" taskset -c 2 env $JSC $P/bun $W/tools/rec7.js $W/ckpt_07_LG/lib match $sd squad $F/sim/$tag/sq$sd > $F/sim/$tag/sq$sd.txt 2>&1; rm -f $F/sim/$tag/sq$sd.jsonl; done; echo done $tag; }











while pgrep -f run_var.sh >/dev/null; do sleep 5; done
run SK0 '"lcLowHpf":0.15,"h50SeekFromS":0'
run SK10 '"lcLowHpf":0.15,"h50SeekFromS":10'
run OHLC_SK5 '"lcCoverS":0,"lcLowHpf":0.23,"h50SeekFromS":5'
