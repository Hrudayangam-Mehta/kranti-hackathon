#!/bin/bash
# behaviour-only sim sweep (ranks nothing): variants as plain overrides on the 5.31 base, salt 1, core 2
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; F=$S/fable_work
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
run() { local tag=$1 extra=$2; mkdir -p $F/sim/$tag; for sd in $(seq 1 36); do [ -f $F/sim/$tag/sq$sd.meta.json ] && continue
  OVR="{\"select\":{$KS},\"salt\":1,\"lcLowHpf\":0.15$extra}" taskset -c 2 env $JSC $P/bun $W/tools/rec7.js $W/ckpt_07_LG/lib match $sd squad $F/sim/$tag/sq$sd > $F/sim/$tag/sq$sd.txt 2>&1; rm -f $F/sim/$tag/sq$sd.jsonl; done; echo done $tag; }
run base ''
run NR ',"lose1Hpf":0,"lose2Hpf":0,"lose3Hpf":0,"lose6":99'
run OH ',"lose1Hpf":0.20,"lose2Hpf":0.25,"lose3Hpf":0.30'
run HL ',"healEnterHp":0.40,"healAfterLoseS":0'
run A50 ',"aggrHpf":0.5,"h50SeekHpf":0.5'
run FH ',"finishHpf":0.35,"finishThreats":3'
run LOW0 ',"lcLowHpf":0'
run NRHL ',"lose1Hpf":0,"lose2Hpf":0,"lose3Hpf":0,"lose6":99,"healEnterHp":0.40,"healAfterLoseS":0'
run C075 ',"lcCoverS":0.75'
