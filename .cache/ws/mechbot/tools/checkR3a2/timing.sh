#!/bin/bash
# checkR3a2 timing: one core (0), Dockerfile engine limits, nothing else of ours running. V1 (bot/lib defaults) and SNAP
# (snapshots/bot_502) on the same recorded observations, 3 repetitions each; plus closed-loop simulator matches.
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/snapshots/bot_502/lib
C=$P/tools/checkR3a2; O=$C/out/tim; mkdir -p $O
CORE=${CORE:-0}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
STREAMS="kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz cfg1200:$P/tools/release_gate/long_cfg1200.jsonl.gz f1:$P/tools/check2a/streams/ffa_s1.jsonl.gz f2:$P/tools/check2a/streams/ffa_s2.jsonl.gz f3:$P/tools/check2a/streams/ffa_s3.jsonl.gz f4:$P/tools/check2a/streams/ffa_s4.jsonl.gz fz:$C/out/fuzz3000.jsonl.gz"
for rep in 1 2 3; do
  for s in $STREAMS; do n=${s%%:*}; f=${s#*:}
    for env in auto squad; do
      OVR='{}' taskset -c $CORE env $JSC $P/bun $C/rec.js $P/bot/lib stream $f $env $O/V1_${n}_${env}_r$rep > /dev/null 2>&1
      OVR='{}' taskset -c $CORE env $JSC $P/bun $C/rec.js $S stream $f $env $O/SNAP_${n}_${env}_r$rep > /dev/null 2>&1
    done
  done
done
for sd in 1 2 3 4 5 6 7 8 9 10; do
  OVR='{}' taskset -c $CORE env $JSC $P/bun $C/rec.js $P/bot/lib squad $sd - $O/V1_sq$sd > /dev/null 2>&1
  OVR='{}' taskset -c $CORE env $JSC $P/bun $C/rec.js $S squad $sd - $O/SNAP_sq$sd > /dev/null 2>&1
done
for sd in 411 412 413 414; do
  OVR='{}' taskset -c $CORE env $JSC $P/bun $C/rec.js $P/bot/lib ffa $sd - $O/V1_ff$sd > /dev/null 2>&1
  OVR='{}' taskset -c $CORE env $JSC $P/bun $C/rec.js $S ffa $sd - $O/SNAP_ff$sd > /dev/null 2>&1
done
rm -f $O/*.jsonl
echo done > $O/done.txt
