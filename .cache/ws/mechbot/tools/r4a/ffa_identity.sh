#!/bin/bash
# R4a T15: FFA streams (kit + check2a ffa_s1-4) in the brain's own posture (auto) and forced FFA, and simulator FFA seeds 411-414:
# hunt 'h50' (and seek 'on') vs hunt 'off' on the same new lib, leader presets (VAR=V4: retreat d3; VAR=V1: defaults).
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
VAR=${VAR:-V4}; CORE=${CORE:-1}; ARM=${ARM:-h50}
O=$P/tools/r4a/ffa/${VAR}_$ARM; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
if [ "$VAR" = V4 ]; then BASE='"retreat":"d3",'; else BASE=''; fi
if [ "$ARM" = seek ]; then ARMSEL='"seek":"on"'; else ARMSEL="\"hunt\":\"$ARM\""; fi
OFFOV="{\"select\":{$BASE\"hunt\":\"off\"}}"; ONOV="{\"select\":{$BASE$ARMSEL}}"
run() { local ov=$1; shift; OVR="$ov" taskset -c $CORE env $JSC $P/bun $P/tools/r4a/record.js $P/bot/lib "$@"; }
same=0; tot=0
for s in kit ffa1 ffa2 ffa3 ffa4; do for env in auto ffa; do
  a=$(run "$OFFOV" stream $s $env $O/off_${s}_$env.jsonl); b=$(run "$ONOV" stream $s $env $O/${ARM}_${s}_$env.jsonl)
  tot=$((tot+1)); if cmp -s $O/off_${s}_$env.jsonl $O/${ARM}_${s}_$env.jsonl; then same=$((same+1)); r=IDENTICAL; else r="DIFFERENT first line $(cmp $O/off_${s}_$env.jsonl $O/${ARM}_${s}_$env.jsonl | grep -oE 'line [0-9]+')"; fi
  echo "stream $s $env | off $(echo $a | grep -oE '"n":[0-9]+,"hash":"[0-9a-f]+","latchTick":-?[0-9]+,"firstForeignTick":-?[0-9]+|"fuse":[0-9]+' | tr '\n' ' ') | $ARM $(echo $b | grep -oE '"hash":"[0-9a-f]+".*"huntOpenTicks":[0-9]+|"fuse":[0-9]+' | tr '\n' ' ') | $r"
done; done
for sd in ${SEEDS:-411 412 413 414}; do
  a=$(run "$OFFOV" match $sd ffa $O/off_m$sd.jsonl); b=$(run "$ONOV" match $sd ffa $O/${ARM}_m$sd.jsonl)
  tot=$((tot+1)); if cmp -s $O/off_m$sd.jsonl $O/${ARM}_m$sd.jsonl; then same=$((same+1)); r=IDENTICAL; else r="DIFFERENT first line $(cmp $O/off_m$sd.jsonl $O/${ARM}_m$sd.jsonl | grep -oE 'line [0-9]+')"; fi
  echo "match $sd ffa | off $(echo $a | grep -oE '"n":[0-9]+,"hash":"[0-9a-f]+","latchTick":-?[0-9]+,"firstForeignTick":-?[0-9]+|"score":[0-9]+|"fuse":[0-9]+' | tr '\n' ' ') | $ARM $(echo $b | grep -oE '"hash":"[0-9a-f]+".*"huntOpenTicks":[0-9]+|"score":[0-9]+|"fuse":[0-9]+' | tr '\n' ' ') | $r"
done
echo "FFA IDENTITY $VAR $ARM: $same/$tot byte-identical (a fuse count > 0 means a decision took > 30 ms on this loaded machine: that run is timing-dependent in the snapshot too)"
