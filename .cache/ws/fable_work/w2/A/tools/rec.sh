#!/bin/bash
# identity recordings: TAG=<name> LIB=<lib dir> [SEL='"k":"v",...'] [SRCS="kit_squad kit_auto ..."] rec.sh ; output w2/A/id/<TAG>/<src>.{jsonl,meta.json}
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
A=$S/fable_work/w2/A; P=$S/mechbot; W=$S/fable_work/chaos
TAG=${TAG:?}; LIB=${LIB:?}; SEL=${SEL:-}
SRCS=${SRCS:-"kit_squad kit_auto kit_ffa l4800_squad l4800_auto l4800_ffa f1_ffa f2_ffa f3_ffa f4_ffa"}
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
declare -A F
F[kit]=$P/kit/check/stream.jsonl.gz; F[l4800]=$P/tools/release_gate/long4800.jsonl.gz
F[f1]=$P/tools/check2a/streams/ffa_s1.jsonl.gz; F[f2]=$P/tools/check2a/streams/ffa_s2.jsonl.gz; F[f3]=$P/tools/check2a/streams/ffa_s3.jsonl.gz; F[f4]=$P/tools/check2a/streams/ffa_s4.jsonl.gz
O=$A/id/$TAG; mkdir -p $O
OVR="{\"select\":{$SEL},\"fuseMs\":1e9}"
for s in $SRCS; do n=${s%_*}; e=${s##*_}; [ -f $O/$s.meta.json ] && continue
  OVR="$OVR" nice -n 19 env $JSC $P/bun $W/tools/recs.js $LIB stream ${F[$n]} $e $O/$s > $O/$s.txt 2>&1 || echo "FAILED $s" >> $O/failures.txt
done
echo done > $O/done.txt
