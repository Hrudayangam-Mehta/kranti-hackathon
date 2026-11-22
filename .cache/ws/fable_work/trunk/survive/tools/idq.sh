#!/bin/bash
# identity batch (engineer S copy of chaos/qa/idq.sh, outputs in trunk/survive/id): idq.sh TAG LIB OVRJSON [all|ffa8]
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
SV=$S/fable_work/trunk/survive; P=$S/mechbot
TAG=$1; LIB=$2; OV=$3; SET=${4:-all}
O=$SV/id/$TAG; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
L="kit_ffa|stream|$P/kit/check/stream.jsonl.gz|ffa"
for n in 1 2 3 4; do L="$L
f${n}_ffa|stream|$P/tools/check2a/streams/ffa_s$n.jsonl.gz|ffa"; done
for x in l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz; do L="$L
${x%%:*}_ffa|stream|${x#*:}|ffa"; done
if [ $SET = all ]; then
L="$L
kit_auto|stream|$P/kit/check/stream.jsonl.gz|auto
kit_squad|stream|$P/kit/check/stream.jsonl.gz|squad"
for x in l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz; do for e in squad auto; do L="$L
${x%%:*}_$e|stream|${x#*:}|$e"; done; done
for n in 1 2 3 4; do L="$L
f${n}_auto|stream|$P/tools/check2a/streams/ffa_s$n.jsonl.gz|auto"; done
for sd in 1 2 3 4 5 6; do L="$L
sq$sd|match|$sd|squad"; done
for sd in 411 412 413 414; do L="$L
ff$sd|match|$sd|ffa"; done
fi
echo "$L" | while IFS='|' read -r name cmd a1 a2; do
  [ -f $O/$name.meta.json ] && continue
  OVR="$OV" nice -n 19 env $JSC $P/bun $SV/tools/recs.js $LIB $cmd $a1 $a2 $O/$name > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt
done
echo done > $O/done.txt
