#!/bin/bash
# QA T-F2 FFA-inert set: check2a ffa_s1-4 streams (auto + forced ffa) and sim FFA matches 411-414; P26_all source vs MX_base2 at table 1111111111111111
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
Q=$S/qa_p26/id2; P=$S/mechbot; V=$S/variants7; T=$S/fable_work/chaos/tools; mkdir -p $Q
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
OB='{"fuseMs":1e9,"saltTable":"1111111111111111"}'; OA='{"fuseMs":1e9}'
run() { local name=$1 lib=$2 ovr=$3 cmd=$4 a1=$5 a2=$6
  OVR="$ovr" nice -n 5 env $JSC $P/bun $T/recs.js $lib $cmd $a1 $a2 $Q/$name > $Q/$name.txt 2>&1 || echo "FAILED $name" >> $Q/failures.txt; }
for k in 1 2 3 4; do f=$P/tools/check2a/streams/ffa_s$k.jsonl.gz
  for e in auto ffa; do
    run base_f${k}_$e $V/MX_base2/lib "$OB" stream $f $e &
    run all_f${k}_$e $V/P26_all/bot/lib "$OA" stream $f $e &
    wait
  done
done
for sd in 411 412 413 414; do
  run base_ff$sd $V/MX_base2/lib "$OB" match $sd ffa &
  run all_ff$sd $V/P26_all/bot/lib "$OA" match $sd ffa &
  wait
done
echo done > $Q/done.txt
