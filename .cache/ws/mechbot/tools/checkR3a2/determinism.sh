#!/bin/bash
# checkR3a2 determinism: V1 in-process reruns (normal, and with 2 busy loops on the same core) against the identity batch;
# the shipped bundle over the pipe twice, under load, and the readable source over the pipe.
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
C=$P/tools/checkR3a2; O=$C/out/det; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
L11=$P/tools/pass2a/out/long11.jsonl.gz; F1=$P/tools/check2a/streams/ffa_s1.jsonl.gz; KIT=$P/kit/check/stream.jsonl.gz; L23=$P/tools/pass2a/out/long23p.jsonl.gz
runset() { # tag core
  for j in "sq1|squad|1|-" "sq3|squad|3|-" "sq5|squad|5|-" "ff411|ffa|411|-" "ff412|ffa|412|-" "l11_auto|stream|$L11|auto" "f1_auto|stream|$F1|auto" "kit_auto|stream|$KIT|auto"; do
    IFS='|' read -r n cmd a1 a2 <<< "$j"
    OVR='{}' taskset -c $2 env $JSC $P/bun $C/rec.js $P/bot/lib $cmd $a1 $a2 $O/${1}_$n > /dev/null 2>&1
    if cmp -s $O/${1}_$n.jsonl $C/out/id/V1_$n.jsonl; then r=IDENTICAL; else r=DIFFERENT; fi
    echo "inproc $1 $n vs batch: $r"
  done
}
runset rerun 0
# under load: two busy loops pinned to core 0 for the whole set
( taskset -c 0 sh -c 'while :; do :; done' & h1=$!; taskset -c 0 sh -c 'while :; do :; done' & h2=$!; runset load 0; kill $h1 $h2 )
for s in "$L11" "$F1" "$KIT" "$L23"; do
  b=$(basename $s .jsonl.gz)
  python3 $C/pipe_det.py 0 $s $O/pipeA_$b.txt
  python3 $C/pipe_det.py 1 $s $O/pipeB_$b.txt
  python3 $C/pipe_det.py 0 $s $O/pipeL_$b.txt 2
  BOTJS=$P/bot/bot.js python3 $C/pipe_det.py 1 $s $O/pipeS_$b.txt
  for x in B L S; do if cmp -s $O/pipeA_$b.txt $O/pipe${x}_$b.txt; then r=IDENTICAL; else r=DIFFERENT; fi; echo "pipe $b A vs $x: $r"; done
done
