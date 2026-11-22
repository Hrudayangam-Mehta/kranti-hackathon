#!/bin/bash
# Verifier trace batch: TAG=<name> OVR='<json>' [JOBS="..."] [LIB=...] trb.sh -> tw_scratch/vfy/tr/<TAG>/<job>.json (2 lanes, cores 0,1)
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
V=$W/tw_scratch/vfy
TAG=${TAG:?}; OVR=${OVR:-'{}'}; LIB=${LIB:-$V/v538_trace/lib}
O=$V/tr/$TAG; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
declare -A SRC
SRC[kit]=$P/kit/check/stream.jsonl.gz; SRC[l4800]=$P/tools/release_gate/long4800.jsonl.gz
SRC[l11]=$P/tools/pass2a/out/long11.jsonl.gz; SRC[l23p]=$P/tools/pass2a/out/long23p.jsonl.gz
for k in 1 2 3 4; do SRC[f$k]=$P/tools/check2a/streams/ffa_s$k.jsonl.gz; done
ALLJOBS="kit_squad kit_auto l4800_squad l4800_auto l11_squad l11_auto l23p_squad l23p_auto sq1 sq2 sq3 sq4 sq5 sq6 kit_ffa f1_auto f1_ffa f2_auto f2_ffa f3_auto f3_ffa f4_auto f4_ffa ff411 ff412 ff413 ff414"
JOBS=${JOBS:-$ALLJOBS}
spec() { case $1 in sq*) echo "match|${1#sq}|squad";; ff*) echo "match|${1#ff}|ffa";; *) local s=${1%_*} e=${1##*_}; echo "stream|${SRC[$s]}|$e";; esac; }
lane() {
  local core=$1 idx=$2 k=0
  for name in $JOBS; do
    if [ $((k % 2)) -eq $idx ] && [ ! -f $O/$name.json ]; then
      IFS='|' read -r cmd a1 a2 <<< "$(spec $name)"
      OVR="$OVR" taskset -c $core env $JSC $P/bun $V/trace.mjs $LIB $cmd $a1 $a2 $O/$name.json > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt
    fi
    k=$((k+1))
  done
}
lane 0 0 & lane 1 1 & wait
echo "$(echo $JOBS | wc -w) trace jobs done for $TAG ($(date -u +%H:%M:%S))" | tee $O/done.txt
