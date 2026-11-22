#!/bin/bash
# runmech.sh: mechanism sims with the drop schedule patched early (CFGJ, chaos recs.js), 2 at a time, nice 19; NOT the default rule set
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
Q=$S/fable_work/trunk/qa; O=$Q/id/mech; mkdir -p $O; export S O
run1() { IFS='|' read -r name lib sd <<< "$1"; [ -f $O/$name.meta.json ] && exit 0
  CFGJ='{"drops":{"times":[30,55,80],"fall_s":15}}' OVR='{"fuseMs":1e9}' nice -n 19 env BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1 \
    $S/mechbot/bun $S/fable_work/chaos/tools/recs.js $lib match $sd squad $O/$name > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt; }
export -f run1
tr '\n' '\0' < $1 | xargs -0 -P 2 -I{} bash -c 'run1 "$@"' _ {}
echo done > $O/done.txt
