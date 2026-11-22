#!/bin/bash
# checkR4a batch (independent checker): identity, FFA inertness, latch and sim sanity recordings. Lanes on cores $CORES.
# SNAP1 / SNAP4 = snapshots/bot_r3a2 lib with the V1 / V4 SELECT; OFF1 / OFF4 = bot/lib with hunt off + seek off written
# out (V1 / V4); DEF1 = bot/lib with no select at all (defaults); H4 / HL4 / S4 = arms on V4; H1 = hunt h50 on V1.
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_r3a2/lib
C=$P/tools/checkR4a; O=${OUT:-$C/out/id}; mkdir -p $O
CORES=${CORES:-"1 2 3"}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
declare -A CFG LIB
CFG[SNAP1]='{}'; LIB[SNAP1]=$S
CFG[SNAP4]='{"select":{"retreat":"d3"}}'; LIB[SNAP4]=$S
CFG[OFF1]='{"select":{"hunt":"off","seek":"off"}}'; LIB[OFF1]=$P/bot/lib
CFG[OFF4]='{"select":{"retreat":"d3","hunt":"off","seek":"off"}}'; LIB[OFF4]=$P/bot/lib
CFG[DEF1]='{}'; LIB[DEF1]=$P/bot/lib
CFG[H4]='{"select":{"retreat":"d3","hunt":"h50"}}'; LIB[H4]=$P/bot/lib
CFG[HL4]='{"select":{"retreat":"d3","hunt":"lite"}}'; LIB[HL4]=$P/bot/lib
CFG[S4]='{"select":{"retreat":"d3","seek":"on"}}'; LIB[S4]=$P/bot/lib
CFG[H1]='{"select":{"hunt":"h50"}}'; LIB[H1]=$P/bot/lib
CFG[HS4]='{"select":{"retreat":"d3","hunt":"h50","seek":"on"}}'; LIB[HS4]=$P/bot/lib
STREAMS="kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz cfg1200:$P/tools/release_gate/long_cfg1200.jsonl.gz f1:$P/tools/check2a/streams/ffa_s1.jsonl.gz f2:$P/tools/check2a/streams/ffa_s2.jsonl.gz f3:$P/tools/check2a/streams/ffa_s3.jsonl.gz f4:$P/tools/check2a/streams/ffa_s4.jsonl.gz"
FFAS="kit f1 f2 f3 f4"
full() { # all sources for an identity config
  local c=$1
  for s in $STREAMS; do n=${s%%:*}; f=${s#*:}; echo "${c}_${n}_auto|stream|$f|auto"; echo "${c}_${n}_squad|stream|$f|squad"; done
  for s in $STREAMS; do n=${s%%:*}; f=${s#*:}; case " $FFAS " in *" $n "*) echo "${c}_${n}_ffa|stream|$f|ffa";; esac; done
  for sd in 1 2 3 4 5 6 7 8 9 10; do echo "${c}_sq$sd|squad|$sd|-"; done
  for sd in 411 412 413 414; do echo "${c}_ff$sd|ffa|$sd|-"; done
}
ffasrc() { # FFA-type sources (FFA streams in auto + forced FFA, simulator FFA)
  local c=$1
  for s in $STREAMS; do n=${s%%:*}; f=${s#*:}; case " $FFAS " in *" $n "*) echo "${c}_${n}_auto|stream|$f|auto"; echo "${c}_${n}_ffa|stream|$f|ffa";; esac; done
  for sd in 411 412 413 414; do echo "${c}_ff$sd|ffa|$sd|-"; done
}
squads() { local c=$1; shift; for sd in "$@"; do echo "${c}_sq$sd|squad|$sd|-"; done; }
case "${STAGE:-A}" in
  A) ALL=$( { full SNAP1; full OFF1; full SNAP4; full OFF4; } ) ;;
  B) ALL=$( { ffasrc H4; ffasrc HL4; ffasrc S4; ffasrc H1; squads H4 1 2 3 4 5 6 7 8 9 10; squads HL4 1 2 3 4 5 6 7 8 9 10; squads S4 1 2 3 4 5 6 7 8 9 10; } ) ;;
  C) ALL=$( { squads H4 11 12 13 14 15 16 17 18 19 20; squads H1 1 2 3 4 5 6 7 8 9 10; full DEF1; squads HS4 1 2 3 4 5 6; } ) ;;
esac
NL=$(echo $CORES | wc -w)
lane() { # core, lane index
  local core=$1 idx=$2 k=0
  while IFS='|' read -r name cmd a1 a2; do
    if [ $((k % NL)) -eq $idx ] && [ ! -f $O/$name.meta.json ]; then
      c=${name%%_*}
      OVR="${CFG[$c]}" taskset -c $core env $JSC $P/bun $C/rec.js ${LIB[$c]} $cmd $a1 $a2 $O/$name > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt
    fi
    k=$((k+1))
  done <<< "$ALL"
}
i=0; for core in $CORES; do lane $core $i & i=$((i+1)); done; wait
echo done > $O/done_${STAGE:-A}.txt
