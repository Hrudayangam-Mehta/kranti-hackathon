#!/bin/bash
# checkR4a timing: one core ($CORE, default 0), Dockerfile engine limits, nothing else of mine running. SNAP4 (snapshot
# bot_r3a2, V4 SELECT) and H4 (bot/lib, V4 + hunt h50) on the same recorded observations (squad env, where the hunt is
# open), 3 repetitions; then closed-loop simulator squad seeds 1-10, one run each (not aligned: worst decision only).
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_r3a2/lib
C=$P/tools/checkR4a; O=$C/out/tim; mkdir -p $O
CORE=${CORE:-0}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
STREAMS="kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz cfg1200:$P/tools/release_gate/long_cfg1200.jsonl.gz f1:$P/tools/check2a/streams/ffa_s1.jsonl.gz f2:$P/tools/check2a/streams/ffa_s2.jsonl.gz fz:$C/out/fuzz3000.jsonl.gz"
V4='{"select":{"retreat":"d3"}}'; H='{"select":{"retreat":"d3","hunt":"h50"}}'
for rep in 1 2 3; do
  for s in $STREAMS; do n=${s%%:*}; f=${s#*:}
    OVR="$V4" taskset -c $CORE env $JSC $P/bun $C/rec.js $S stream $f squad $O/SNAP4_${n}_r$rep > /dev/null 2>&1
    OVR="$H" taskset -c $CORE env $JSC $P/bun $C/rec.js $P/bot/lib stream $f squad $O/H4_${n}_r$rep > /dev/null 2>&1
  done
done
for sd in 1 2 3 4 5 6 7 8 9 10; do
  OVR="$V4" taskset -c $CORE env $JSC $P/bun $C/rec.js $S squad $sd - $O/SNAP4_sq$sd > /dev/null 2>&1
  OVR="$H" taskset -c $CORE env $JSC $P/bun $C/rec.js $P/bot/lib squad $sd - $O/H4_sq$sd > /dev/null 2>&1
done
rm -f $O/*.jsonl
echo done > $O/done.txt
