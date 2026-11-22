#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
Q=$S/qa_p26; P=$S/mechbot; V=$S/variants7; T=$S/fable_work/chaos/tools
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
run() { # tag lib ovr stream env
  local name=$1 lib=$2 ovr=$3 st=$4 e=$5
  OVR="$ovr" env $JSC $P/bun $T/recs.js $lib stream $st $e $Q/id/$name > $Q/id/$name.txt 2>&1 || echo "FAILED $name" >> $Q/id/failures.txt
}
KIT=$P/kit/check/stream.jsonl.gz; L48=$P/tools/release_gate/long4800.jsonl.gz
O1='{"fuseMs":1e9}'; O2='{"fuseMs":1e9,"saltTable":"1211111111111111"}'; O3='{"fuseMs":1e9,"saltTable":"1111111111111111"}'
O4='{"fuseMs":1e9,"saltTable":"1111111111111111","select":{"prof":"p26"}}'
for sn in kit:$KIT l48:$L48; do n=${sn%%:*}; f=${sn#*:}
  for e in squad auto ffa; do
    run base_t0_${n}_$e $V/MX_base2/lib "$O1" $f $e &
    run p26off_t0_${n}_$e $V/MX_p26/lib "$O1" $f $e &
    run base_t2_${n}_$e $V/MX_base2/lib "$O2" $f $e &
    run p26off_t2_${n}_$e $V/MX_p26/lib "$O2" $f $e &
    wait
    run base_t1_${n}_$e $V/MX_base2/lib "$O3" $f $e &
    run all_${n}_$e $V/P26_all/bot/lib "$O1" $f $e &
    run p26on_${n}_$e $V/MX_p26/lib "$O4" $f $e &
    wait
  done
done
echo done > $Q/id/done.txt
