#!/bin/bash
# release R4a timing (copy of tools/checkR4a/timing.sh, streams part only): one core, Dockerfile engine limits, SNAP4 vs
# H (fixed bot/lib, V4 + h50) vs HL (fixed bot/lib, V4 + lite) on the same observations, 3 repetitions.
SP=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
P=$SP/mechbot; S=$SP/snapshots/bot_r3a2/lib; C=$P/tools/checkR4a; O=$SP/variants_tools/r4a/tim; mkdir -p $O
CORE=${CORE:-0}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
STREAMS="kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz cfg1200:$P/tools/release_gate/long_cfg1200.jsonl.gz f1:$P/tools/check2a/streams/ffa_s1.jsonl.gz f2:$P/tools/check2a/streams/ffa_s2.jsonl.gz fz:$C/out/fuzz3000.jsonl.gz"
V4='{"select":{"retreat":"d3"}}'; H='{"select":{"retreat":"d3","hunt":"h50"}}'; HL='{"select":{"retreat":"d3","hunt":"lite"}}'
for rep in 1 2 3; do
  for s in $STREAMS; do n=${s%%:*}; f=${s#*:}
    OVR="$V4" taskset -c $CORE env $JSC $P/bun $C/rec.js $S stream $f squad $O/SNAP4_${n}_r$rep > /dev/null 2>&1
    OVR="$H" taskset -c $CORE env $JSC $P/bun $C/rec.js $P/bot/lib stream $f squad $O/H4_${n}_r$rep > /dev/null 2>&1
    OVR="$HL" taskset -c $CORE env $JSC $P/bun $C/rec.js $P/bot/lib stream $f squad $O/HL4_${n}_r$rep > /dev/null 2>&1
  done
  echo "rep $rep $(date -u +%T)" >> $O/progress.txt
done
rm -f $O/*.jsonl
echo done > $O/done.txt
