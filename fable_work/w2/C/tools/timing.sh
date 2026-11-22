#!/bin/bash
# sequential decision-time comparison (1 job): base (defaults) vs all six mv_ presets on, alternated 3 times
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
C=$S/fable_work/w2/C; P=$S/mechbot; O=$C/out/timing; mkdir -p $O; ME=$C/tree/lib
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
ALL='"mv_meas":"on","mv_flip":"on","mv_close":"on","mv_zig":"on","mv_arc":"on","mv_rim":"on"'
for r in 1 2 3; do
  for s in kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz; do n=${s%%:*}; f=${s#*:}
    OVR='{"fuseMs":1e9}' nice -n 19 env $JSC $P/bun $S/fable_work/chaos/tools/recs.js $ME stream $f squad $O/base_${n}_$r > $O/base_${n}_$r.txt 2>&1
    OVR="{\"select\":{$ALL},\"fuseMs\":1e9}" nice -n 19 env $JSC $P/bun $S/fable_work/chaos/tools/recs.js $ME stream $f squad $O/all_${n}_$r > $O/all_${n}_$r.txt 2>&1
  done
  for sd in 11; do
    OVR='{"fuseMs":1e9}' nice -n 19 env $JSC $P/bun $S/fable_work/chaos/tools/recs.js $ME match $sd squad $O/base_sq${sd}_$r > $O/base_sq${sd}_$r.txt 2>&1
    OVR="{\"select\":{$ALL},\"fuseMs\":1e9}" nice -n 19 env $JSC $P/bun $S/fable_work/chaos/tools/recs.js $ME match $sd squad $O/all_sq${sd}_$r > $O/all_sq${sd}_$r.txt 2>&1
  done
done
rm -f $O/*.jsonl
python3 - <<PY
import json,glob,statistics as st
for n in ('kit','l4800','sq11'):
  for t in ('base','all'):
    ms=[json.load(open(f)) for f in sorted(glob.glob('$O/%s_%s_*.meta.json'%(t,n)))]
    print(n,t,'maxMs',[m['maxMs'] for m in ms],'min',min(m['maxMs'] for m in ms),'p99',[m['p99'] for m in ms],'min',min(m['p99'] for m in ms))
PY
echo timing done > $O/DONE
