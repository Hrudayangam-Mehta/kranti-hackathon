#!/bin/bash
# R3a2 identity: snapshot bot_502 (S01-full) vs bot/lib with every R3a2 preset at its 5.02 value (SELECT_502), 14 streams
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
SNAP=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_502/lib
NEW=$P/bot/lib
O=$P/tools/r3a2/id; mkdir -p $O
CORE=${CORE:-1}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
OFF=${OFF:-'{"select":{"laserRange":"far","farmHp":"90","fightEarly":"off","laserEcon":"off","focus":"mult","retreat":"d3","boost":"off","upg":"std","ffaDropGate":"off","finalPoint":"off","ffaTwo":"off","ffaThree":"off","ffaGate":"off"}}'}
TAG=${TAG:-old}
run() { # name lib ovr args...
  local n=$1 lib=$2 ov=$3; shift 3
  OVR="$ov" taskset -c $CORE env $JSC $P/bun $P/tools/pass2b/record2b.js $lib "$@"
}
same=0; tot=0
for spec in "kit:kit" "long4800:$P/tools/release_gate/long4800.jsonl.gz" "long11:$P/tools/pass2a/out/long11.jsonl.gz" "long23p:$P/tools/pass2a/out/long23p.jsonl.gz"; do
  nm=${spec%%:*}; f=${spec#*:}
  for env in squad auto; do
    [ -f $O/snap_${nm}_$env.jsonl ] || run b $SNAP '{}' stream $f $env $O/snap_${nm}_$env.jsonl > $O/snap_${nm}_$env.txt
    b=$(run n $NEW "$OFF" stream $f $env $O/${TAG}_${nm}_$env.jsonl)
    tot=$((tot+1)); if cmp -s $O/snap_${nm}_$env.jsonl $O/${TAG}_${nm}_$env.jsonl; then same=$((same+1)); r=IDENTICAL; else r=DIFFERENT; fi
    echo "stream $nm $env | snap $(cat $O/snap_${nm}_$env.txt) | $TAG $b | $r"
  done
done
for sd in ${SEEDS:-1 2 3 4 5 6}; do
  [ -f $O/snap_m$sd.jsonl ] || run b $SNAP '{}' match $sd $O/snap_m$sd.jsonl > $O/snap_m$sd.txt
  b=$(run n $NEW "$OFF" match $sd $O/${TAG}_m$sd.jsonl)
  tot=$((tot+1)); if cmp -s $O/snap_m$sd.jsonl $O/${TAG}_m$sd.jsonl; then same=$((same+1)); r=IDENTICAL; else r=DIFFERENT; fi
  echo "match $sd | snap $(cat $O/snap_m$sd.txt) | $TAG $b | $r"
done
echo "IDENTITY $TAG: $same/$tot byte-identical"
