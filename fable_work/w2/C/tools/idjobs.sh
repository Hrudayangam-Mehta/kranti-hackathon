#!/bin/bash
# wave-2 C identity / T-F2 recordings. usage: idjobs.sh <listfile>  (lines: name|lib|cmd|a1|a2|ovrjson); 2 jobs, nice 19
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
C=$S/fable_work/w2/C; P=$S/mechbot; O=$C/out/id; mkdir -p $O
export JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
one() {
  IFS='|' read -r name lib cmd a1 a2 ovr <<< "$1"
  [ -f $O/$name.meta.json ] && exit 0
  OVR="$ovr" nice -n 19 env $JSC $P/bun $S/fable_work/chaos/tools/recs.js $lib $cmd $a1 $a2 $O/$name > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt
  rm -f $O/$name.jsonl.keep
}
export -f one; export S C P O
grep -v '^#' "$1" | grep . | xargs -d '\n' -P 2 -I{} bash -c 'one "$@"' _ {}
echo done >> $O/done_$(basename $1).txt
