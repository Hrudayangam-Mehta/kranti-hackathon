#!/bin/bash
# sim batch (copy of chaos/tools/simb.sh, output under w2/A): TAG LIB EXTRA [seeds]; FNV SELECT + CH1 keys, salt 1, fuseMs 1e9
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
A=$S/fable_work/w2/A; W=$S/fable_work/chaos; P=$S/mechbot
TAG=$1; LIB=$2; EXTRA=$3; OVX=$4; SEEDS=${5:-$(seq 1 24)}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
FNV='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","loseCover":"never","fb":"on"'
CH1='"focus":"kill","laserGrab":"spawn","cubes":"snow","laserRange":"midsq","boostCharge":"on","farmHp":"50sq","cratePath":"80","upg":"laser","upgFix":"on"'
SEL="$FNV,$CH1"; [ -n "$EXTRA" ] && SEL="$SEL,$EXTRA"
O=$A/out/sim/$TAG; mkdir -p $O
for sd in $SEEDS; do [ -f $O/sq$sd.meta.json ] && continue
  OVR="{\"select\":{$SEL},\"salt\":1,\"fuseMs\":1e9${OVX:+,$OVX}}" nice -n 19 env $JSC $P/bun $W/tools/recs.js $LIB match $sd squad $O/sq$sd > $O/sq$sd.txt 2>&1; rm -f $O/sq$sd.jsonl; done
echo done > $O/done.txt
