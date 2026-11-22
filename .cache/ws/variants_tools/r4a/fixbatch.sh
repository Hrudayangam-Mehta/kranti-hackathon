#!/bin/bash
# release R4a: recordings for the pulse-gap fix with the checker's recorder (tools/checkR4a/rec.js, read only).
# F = bot/lib after the fix, P = bot/lib before the fix (variants_tools/r4a/bot_prefix). Output: variants_tools/r4a/id.
SP=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
P=$SP/mechbot; C=$P/tools/checkR4a; O=$SP/variants_tools/r4a/id; mkdir -p $O
CORES=${CORES:-"2 3"}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
declare -A CFG LIB
CFG[OFF1F]='{"select":{"hunt":"off","seek":"off"}}'; LIB[OFF1F]=$P/bot/lib
CFG[OFF4F]='{"select":{"retreat":"d3","hunt":"off","seek":"off"}}'; LIB[OFF4F]=$P/bot/lib
CFG[H4F]='{"select":{"retreat":"d3","hunt":"h50"}}'; LIB[H4F]=$P/bot/lib
CFG[HL4F]='{"select":{"retreat":"d3","hunt":"lite"}}'; LIB[HL4F]=$P/bot/lib
CFG[H4P]='{"select":{"retreat":"d3","hunt":"h50"}}'; LIB[H4P]=$SP/variants_tools/r4a/bot_prefix/lib
CFG[HL4P]='{"select":{"retreat":"d3","hunt":"lite"}}'; LIB[HL4P]=$SP/variants_tools/r4a/bot_prefix/lib
STREAMS="kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz cfg1200:$P/tools/release_gate/long_cfg1200.jsonl.gz f1:$P/tools/check2a/streams/ffa_s1.jsonl.gz f2:$P/tools/check2a/streams/ffa_s2.jsonl.gz f3:$P/tools/check2a/streams/ffa_s3.jsonl.gz f4:$P/tools/check2a/streams/ffa_s4.jsonl.gz"
FFAS="kit f1 f2 f3 f4"
full() {
  local c=$1
  for s in $STREAMS; do n=${s%%:*}; f=${s#*:}; echo "${c}_${n}_auto|stream|$f|auto"; echo "${c}_${n}_squad|stream|$f|squad"; done
  for s in $STREAMS; do n=${s%%:*}; f=${s#*:}; case " $FFAS " in *" $n "*) echo "${c}_${n}_ffa|stream|$f|ffa";; esac; done
  for sd in 1 2 3 4 5 6 7 8 9 10; do echo "${c}_sq$sd|squad|$sd|-"; done
  for sd in 411 412 413 414; do echo "${c}_ff$sd|ffa|$sd|-"; done
}
streams2() { local c=$1; for s in $STREAMS; do n=${s%%:*}; f=${s#*:}; echo "${c}_${n}_auto|stream|$f|auto"; echo "${c}_${n}_squad|stream|$f|squad"; done; }
squads() { local c=$1; shift; for sd in "$@"; do echo "${c}_sq$sd|squad|$sd|-"; done; }
ALL=$( { full H4F; full HL4F; squads H4F 11 12 13 14 15 16 17 18 19 20; streams2 H4P; streams2 HL4P; full OFF4F; full OFF1F; } )
NL=$(echo $CORES | wc -w)
lane() {
  local core=$1 idx=$2 k=0
  while IFS='|' read -r name cmd a1 a2; do
    if [ $((k % NL)) -eq $idx ] && [ ! -f $O/$name.meta.json ]; then
      c=${name%%_*}
      OVR="${CFG[$c]}" taskset -c $core env $JSC nice -n 5 $P/bun $C/rec.js ${LIB[$c]} $cmd $a1 $a2 $O/$name > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt
    fi
    k=$((k+1))
  done <<< "$ALL"
}
i=0; for core in $CORES; do lane $core $i & i=$((i+1)); done; wait
echo done > $O/done.txt
