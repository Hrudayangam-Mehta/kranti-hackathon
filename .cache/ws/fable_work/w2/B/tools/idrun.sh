#!/bin/bash
# recordings with the chaos recorder (fable_work/chaos/tools/recs.js), outputs in w2/B/id/<TAG>/<name>.{jsonl,meta.json,txt}
#   TAG=<tag> LIB=<lib dir> SEL='"key":"val",...' SET="sq|ffa|all" idrun.sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
P=$S/mechbot; W=$S/fable_work/chaos; O=$S/fable_work/w2/B/id/${TAG:?}; LIB=${LIB:?}; SEL=${SEL:-}; SET=${SET:-all}
mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
OVR="{\"select\":{$SEL},\"fuseMs\":1e9}"
{ if [ $SET != ffa ]; then for s in kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz; do for e in squad auto; do echo "${s%%:*}_$e|${s#*:}|$e"; done; done; fi
  if [ $SET != sq ]; then for s in kit:$P/kit/check/stream.jsonl.gz f1:$P/tools/check2a/streams/ffa_s1.jsonl.gz f2:$P/tools/check2a/streams/ffa_s2.jsonl.gz f3:$P/tools/check2a/streams/ffa_s3.jsonl.gz f4:$P/tools/check2a/streams/ffa_s4.jsonl.gz; do echo "${s%%:*}_ffa|${s#*:}|ffa"; done; fi
} | while IFS='|' read -r name f e; do
  [ -f $O/$name.meta.json ] && continue
  OVR="$OVR" nice -n 19 env $JSC $P/bun $W/tools/recs.js $LIB stream $f $e $O/$name > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt
done
echo done > $O/done.txt
