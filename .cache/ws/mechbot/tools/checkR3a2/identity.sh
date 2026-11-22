#!/bin/bash
# checkR3a2 identity / inertness / latch batch (independent checker). Two lanes: cores 0 and 1.
# Configs: SNAP = snapshots/bot_502 lib; O502 = bot/lib with every changed preset at its 5.02 value (written out here,
# not imported); OFF = bot/lib with r3a2 'off'; FON = 5.02 practice values + all five final-only items on;
# V1 = plain defaults; V1F = defaults with the five final-only items off; V2..V4 = release variants.
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_502/lib
C=$P/tools/checkR3a2; O=$C/out/id; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
OLD='"laserRange":"far","farmHp":"90","fightEarly":"off","laserEcon":"off","focus":"mult","retreat":"d3","boost":"off","upg":"std"'
FOFF='"ffaDropGate":"off","finalPoint":"off","ffaTwo":"off","ffaThree":"off","ffaGate":"off"'
FON='"ffaDropGate":"on","finalPoint":"on","ffaTwo":"on","ffaThree":"on","ffaGate":"on"'
declare -A CFG LIB
CFG[SNAP]='{}'; LIB[SNAP]=$S
CFG[O502]="{\"select\":{$OLD,$FOFF}}"; LIB[O502]=$P/bot/lib
CFG[OFF]='{"select":{"r3a2":"off"}}'; LIB[OFF]=$P/bot/lib
CFG[FON]="{\"select\":{$OLD,$FON}}"; LIB[FON]=$P/bot/lib
CFG[V1]='{}'; LIB[V1]=$P/bot/lib
CFG[V1F]="{\"select\":{$FOFF}}"; LIB[V1F]=$P/bot/lib
CFG[V2]='{"select":{"fightEarly":"off"}}'; LIB[V2]=$P/bot/lib
CFG[V3]='{"select":{"boost":"off"}}'; LIB[V3]=$P/bot/lib
CFG[V4]='{"select":{"retreat":"d3"}}'; LIB[V4]=$P/bot/lib
STREAMS="kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz cfg1200:$P/tools/release_gate/long_cfg1200.jsonl.gz f1:$P/tools/check2a/streams/ffa_s1.jsonl.gz f2:$P/tools/check2a/streams/ffa_s2.jsonl.gz f3:$P/tools/check2a/streams/ffa_s3.jsonl.gz f4:$P/tools/check2a/streams/ffa_s4.jsonl.gz"
SQ="1 2 3 4 5 6 7 8 9 10"; FF="411 412 413 414"
jobs_for() { # cfg -> list of "name|cmd|a1|a2"
  local c=$1
  for s in $STREAMS; do n=${s%%:*}; f=${s#*:}; echo "${c}_${n}_auto|stream|$f|auto"; echo "${c}_${n}_squad|stream|$f|squad"; done
  for sd in $SQ; do echo "${c}_sq$sd|squad|$sd|-"; done
  for sd in $FF; do echo "${c}_ff$sd|ffa|$sd|-"; done
}
ALL=$( { for c in SNAP O502 OFF FON V1 V1F; do jobs_for $c; done; for c in V2 V3 V4; do for sd in $SQ; do echo "${c}_sq$sd|squad|$sd|-"; done; done; } )
lane() { # core, modulo index
  local core=$1 idx=$2 k=0
  while IFS='|' read -r name cmd a1 a2; do
    if [ $((k % 2)) -eq $idx ] && [ ! -f $O/$name.meta.json ]; then
      c=${name%%_*}
      OVR="${CFG[$c]}" taskset -c $core env $JSC $P/bun $C/rec.js ${LIB[$c]} $cmd $a1 $a2 $O/$name > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt
    fi
    k=$((k+1))
  done <<< "$ALL"
}
lane 0 0 & lane 1 1 & wait
echo done > $O/done.txt
