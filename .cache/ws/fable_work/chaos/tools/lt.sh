#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos; P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
while [ ! -f $W/id/CHAIN2DONE ]; do sleep 15; done
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1"
FNV='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","loseCover":"never","fb":"on"'
CH1='"focus":"kill","laserGrab":"spawn","cubes":"snow","laserRange":"midsq","boostCharge":"on","farmHp":"50sq","cratePath":"80","upg":"laser","upgFix":"on"'
mkdir -p $W/out/lt
for tag in base CH1 lgs; do X=''; [ $tag = CH1 ] && X=",$CH1"; [ $tag = lgs ] && X=',"laserGrab":"spawn"'
  for sd in $(seq 1 24); do OVR="{\"select\":{$FNV$X},\"salt\":1,\"fuseMs\":1e9}" nice -n 19 env $JSC $P/bun $W/tools/lt.js $W/tree/lib $sd; done > $W/out/lt/$tag.jsonl 2>&1; done
echo done > $W/out/lt/DONE
