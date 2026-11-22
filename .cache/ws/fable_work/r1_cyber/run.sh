#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; C=$S/fable_work/r1_cyber
export BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
run() { local tag=$1 extra=$2; mkdir -p $C/sim/$tag; for sd in 16 36 7 5 13 20 30 31 1 9; do [ -f $C/sim/$tag/sq$sd.meta.json ] && continue
  OVR="{\"select\":{$KS},\"salt\":1,\"lcLowHpf\":0.15$extra}" taskset -c 2 $P/bun $W/tools/rec7.js $C/lib match $sd squad $C/sim/$tag/sq$sd > $C/sim/$tag/sq$sd.txt 2>&1; rm -f $C/sim/$tag/sq$sd.jsonl; done; echo done $tag; }
run LT3 ',"sqLightPrio":3,"sqLightR":90'


