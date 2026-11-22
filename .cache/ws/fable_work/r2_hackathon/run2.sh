#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/r7work; P=$S/mechbot; M=$S/fable_work/r2_hackathon; R1=$S/fable_work/r1_hackathon
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
KS='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near"'
ok() { python3 -c "import json,sys;d=json.load(open(sys.argv[1]));sys.exit(0 if d['fuse']==0 and d['errors']==0 else 1)" $1 2>/dev/null; }
one() { local tag=$1 extra=$2 sd=$3; mkdir -p $M/sim/$tag; local o=$M/sim/$tag/sq$sd
  ok $o.meta.json && return
  if ok $R1/sim/$tag/sq$sd.meta.json; then cp $R1/sim/$tag/sq$sd.meta.json $o.meta.json; return; fi
  for try in 1 2 3; do OVR="{\"select\":{$KS},\"salt\":1$extra}" taskset -c 2 env $JSC $P/bun $W/tools/rec7.js $W/ckpt_07_LG/lib match $sd squad $o > $o.txt 2>&1; rm -f $o.jsonl; ok $o.meta.json && return; done; }
for sd in $(seq 1 12); do
one base ',"lcLowHpf":0.10' $sd
one NEVER ',"lcLowHpf":0,"lcCoverS":0' $sd
one HF60 ',"lcLowHpf":0.10,"hfExit":0.6' $sd
one HE40 ',"lcLowHpf":0.10,"healEnterHp":0.40' $sd
one C0L10 ',"lcLowHpf":0.10,"lcCoverS":0' $sd
one LOW0 ',"lcLowHpf":0,"lcCoverS":1.5' $sd
done; echo done12 $(date -u +%T)
for sd in $(seq 13 24); do
one base ',"lcLowHpf":0.10' $sd
one NEVER ',"lcLowHpf":0,"lcCoverS":0' $sd
one HF60 ',"lcLowHpf":0.10,"hfExit":0.6' $sd
done; echo done24 $(date -u +%T)
