#!/bin/bash
# pass 2b SQUAD identity: snapshot (pass 2a) vs bot/lib with every pass 2b switch off (select pass2b=off)
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
SNAP=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_pass2a/lib
NEW=$P/bot/lib
O=$P/tools/pass2b/id; mkdir -p $O
CORE=${CORE:-1}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
OFF='{"select":{"pass2b":"off"}}'
run() { # name lib ovr args...
  local n=$1 lib=$2 ov=$3; shift 3
  OVR="$ov" taskset -c $CORE env $JSC $P/bun $P/tools/pass2b/record2b.js $lib "$@"
}
for spec in "kit:kit" "long4800:$P/tools/release_gate/long4800.jsonl.gz" "long11:$P/tools/pass2a/out/long11.jsonl.gz" "long23p:$P/tools/pass2a/out/long23p.jsonl.gz"; do
  nm=${spec%%:*}; f=${spec#*:}
  for env in squad auto; do
    a=$(run b $SNAP '{}' stream $f $env $O/snap_${nm}_$env.jsonl); b=$(run n $NEW "$OFF" stream $f $env $O/off_${nm}_$env.jsonl)
    echo "stream $nm $env | snap $a | off $b"
  done
done
for sd in ${SEEDS:-1 2 3 4 5 6}; do
  a=$(run b $SNAP '{}' match $sd $O/snap_m$sd.jsonl); b=$(run n $NEW "$OFF" match $sd $O/off_m$sd.jsonl)
  echo "match $sd | snap $a | off $b"
done
