#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; M=$S/fable_work/r1_hackathon
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
run() { local tag=$1 extra=$2; mkdir -p $M/sim/$tag; for sd in $(seq 1 12); do [ -f $M/sim/$tag/sq$sd.meta.json ] && continue
  OVR="{\"select\":{$KS},\"salt\":1$extra}" taskset -c 2 env $JSC $P/bun $W/tools/rec7.js $W/ckpt_07_LG/lib match $sd squad $M/sim/$tag/sq$sd > $M/sim/$tag/sq$sd.txt 2>&1; rm -f $M/sim/$tag/sq$sd.jsonl; done; echo done $tag $(date -u +%T); }
run base ',"lcLowHpf":0.10'
run NEVER ',"lcLowHpf":0,"lcCoverS":0'
run HF60 ',"lcLowHpf":0.10,"hfExit":0.6'
run C0L10 ',"lcLowHpf":0.10,"lcCoverS":0'
run HE40 ',"lcLowHpf":0.10,"healEnterHp":0.40'
run SK10 ',"lcLowHpf":0.10,"h50SeekFromS":10'
run C05L10 ',"lcLowHpf":0.10,"lcCoverS":0.5'
