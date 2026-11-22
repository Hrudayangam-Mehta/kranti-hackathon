#!/bin/bash
# R4a identity (T14): snapshots/bot_r3a2 lib vs bot/lib with hunt 'off' and seek 'off' (the new defaults), 14 streams of
# R3a2 (kit / long4800 / long11 / long23p x squad / auto + simulator squad seeds 1-6), for one SELECT variant:
#   VAR=V1 (plain defaults) or VAR=V4 (retreat d3). Extra new-side presets: NEWSEL (JSON object merged into the select).
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
SNAP=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_r3a2/lib
NEW=$P/bot/lib
VAR=${VAR:-V1}; CORE=${CORE:-1}; TAG=${TAG:-off}
O=$P/tools/r4a/id/$VAR; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
if [ "$VAR" = V4 ]; then BASE='"retreat":"d3"'; else BASE=''; fi
SNAPOV="{\"select\":{$BASE}}"
NS=${NEWSEL:-'"hunt":"off","seek":"off"'}
if [ -n "$BASE" ]; then NEWOV="{\"select\":{$BASE,$NS}}"; else NEWOV="{\"select\":{$NS}}"; fi
run() { local lib=$1 ov=$2; shift 2; OVR="$ov" taskset -c $CORE env $JSC $P/bun $P/tools/pass2b/record2b.js $lib "$@"; }
same=0; tot=0
echo "variant $VAR snap $SNAPOV new $NEWOV"
for spec in "kit:kit" "long4800:$P/tools/release_gate/long4800.jsonl.gz" "long11:$P/tools/pass2a/out/long11.jsonl.gz" "long23p:$P/tools/pass2a/out/long23p.jsonl.gz"; do
  nm=${spec%%:*}; f=${spec#*:}
  for env in squad auto; do
    [ -f $O/snap_${nm}_$env.jsonl ] || run $SNAP "$SNAPOV" stream $f $env $O/snap_${nm}_$env.jsonl > $O/snap_${nm}_$env.txt
    b=$(run $NEW "$NEWOV" stream $f $env $O/${TAG}_${nm}_$env.jsonl)
    tot=$((tot+1)); if cmp -s $O/snap_${nm}_$env.jsonl $O/${TAG}_${nm}_$env.jsonl; then same=$((same+1)); r=IDENTICAL; else r=DIFFERENT; fi
    echo "stream $nm $env | snap $(cat $O/snap_${nm}_$env.txt | cut -c1-200) | $TAG $(echo $b | grep -oE '"n":[0-9]+,"hash":"[0-9a-f]+"') | $r"
  done
done
for sd in ${SEEDS:-1 2 3 4 5 6}; do
  [ -f $O/snap_m$sd.jsonl ] || run $SNAP "$SNAPOV" match $sd $O/snap_m$sd.jsonl > $O/snap_m$sd.txt
  b=$(run $NEW "$NEWOV" match $sd $O/${TAG}_m$sd.jsonl)
  tot=$((tot+1)); if cmp -s $O/snap_m$sd.jsonl $O/${TAG}_m$sd.jsonl; then same=$((same+1)); r=IDENTICAL; else r=DIFFERENT; fi
  echo "match $sd | snap $(cat $O/snap_m$sd.txt | grep -oE '"n":[0-9]+,"hash":"[0-9a-f]+"|"score":[0-9]+') | $TAG $(echo $b | grep -oE '"n":[0-9]+,"hash":"[0-9a-f]+"|"score":[0-9]+') | $r"
done
echo "IDENTITY $VAR $TAG: $same/$tot byte-identical"
