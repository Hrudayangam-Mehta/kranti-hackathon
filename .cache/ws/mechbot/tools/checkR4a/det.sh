#!/bin/bash
# checkR4a determinism. (1) H (V4 + hunt h50) in process: rerun, and rerun with 2 busy loops on the same core, against the
# batch (out/id/H4_*) or against each other. (2) Bundles over the pipe: the shipped dist/bot.js (defaults = hunt off) against
# the R3a2 checker's pipe answers of the R3a2 bundle (bundle-level identity), and a scratch H bundle (hbuild/botH.js, SELECT
# edit only) twice, under load, and against its readable source.
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
C=$P/tools/checkR4a; O=$C/out/det; mkdir -p $O; OLD=$P/tools/checkR3a2/out/det
CORE=${CORE:-1}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
L11=$P/tools/pass2a/out/long11.jsonl.gz; F1=$P/tools/check2a/streams/ffa_s1.jsonl.gz; KIT=$P/kit/check/stream.jsonl.gz; L23=$P/tools/pass2a/out/long23p.jsonl.gz
H='{"select":{"retreat":"d3","hunt":"h50"}}'
runset() { # tag
  for j in "sq1|squad|1|-" "sq3|squad|3|-" "sq5|squad|5|-" "sq19|squad|19|-" "ff411|ffa|411|-" "kit_auto|stream|$KIT|auto" "f1_auto|stream|$F1|auto" "l11_squad|stream|$L11|squad" "l23p_squad|stream|$L23|squad"; do
    IFS='|' read -r n cmd a1 a2 <<< "$j"
    OVR="$H" taskset -c $CORE env $JSC $P/bun $C/rec.js $P/bot/lib $cmd $a1 $a2 $O/${1}_$n > $O/${1}_$n.txt 2>&1
    ref=$C/out/id/H4_$n.jsonl; [ -f $ref ] || ref=$O/rerun_$n.jsonl
    if cmp -s $O/${1}_$n.jsonl $ref; then r=IDENTICAL; else r=DIFFERENT; fi
    echo "inproc H $1 $n vs $(basename $(dirname $ref))/$(basename $ref): $r fuse $(grep -o '"fuse":[0-9]*' $O/${1}_$n.txt) maxMs $(grep -o '"maxMs":[0-9.]*' $O/${1}_$n.txt)"
  done
}
runset rerun
( taskset -c $CORE sh -c 'while :; do :; done' & h1=$!; taskset -c $CORE sh -c 'while :; do :; done' & h2=$!; runset load; kill $h1 $h2 )
for s in "$L11" "$F1" "$KIT" "$L23"; do
  b=$(basename $s .jsonl.gz)
  python3 $C/../checkR3a2/pipe_det.py $CORE $s $O/distA_$b.txt
  if cmp -s $O/distA_$b.txt $OLD/pipeA_$b.txt; then r=IDENTICAL; else r=DIFFERENT; fi; echo "pipe dist (R4a defaults) vs R3a2 bundle answers $b: $r"
  BOTJS=$C/hbuild/botH.js python3 $C/../checkR3a2/pipe_det.py $CORE $s $O/hA_$b.txt
  BOTJS=$C/hbuild/botH.js python3 $C/../checkR3a2/pipe_det.py $CORE $s $O/hB_$b.txt
  BOTJS=$C/hbuild/botH.js python3 $C/../checkR3a2/pipe_det.py $CORE $s $O/hL_$b.txt 2
  BOTJS=$C/hbuild/bot/bot.js python3 $C/../checkR3a2/pipe_det.py $CORE $s $O/hS_$b.txt
  for x in B L S; do if cmp -s $O/hA_$b.txt $O/h${x}_$b.txt; then r=IDENTICAL; else r=DIFFERENT; fi; echo "pipe H bundle $b A vs $x: $r"; done
  if cmp -s $O/hA_$b.txt $O/distA_$b.txt; then r="identical (hunt inactive on this stream)"; else r="differs (hunt active, expected)"; fi; echo "pipe H vs dist $b: $r"
done
echo done > $O/done.txt
