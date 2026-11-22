#!/bin/bash
# pipeline2.sh: integrator pass 2, first-hand gates on merged freeze v2. Sequential groups; never more than 2 bun processes at once.
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
T=$S/fable_work/trunk; I=$T/integ; BUN=$S/mechbot/bun
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
echo "start $(date -u +%T)" > $I/out/pipeline2.log
# 1. U1 / U2 / G2b
nice -n 19 env $JSC $BUN $I/tools/test_variant_m.mjs > $I/out/test_variant_m2.txt 2>&1; echo "test_variant_m exit $? $(date -u +%T)" >> $I/out/pipeline2.log
# 2. 278 recordings + sims (2 jobs)
python3 -I -B $I/tools/gen_m.py > $I/tools/jobs_m2.txt; echo "jobs $(wc -l < $I/tools/jobs_m2.txt)" >> $I/out/pipeline2.log
$I/tools/runjobs.sh $I/id/m2 < $I/tools/jobs_m2.txt; echo "runjobs done $(date -u +%T)" >> $I/out/pipeline2.log
python3 -I -B $I/tools/cmp_m.py $I/id/m2 > $I/out/cmp_m2.txt 2>&1; echo "cmp_m exit $? $(date -u +%T)" >> $I/out/pipeline2.log
# 3. baked sources on the kit stream, slot rewritten (2 jobs)
$I/tools/dslot_jobs2.sh; echo "dslot done $(date -u +%T)" >> $I/out/pipeline2.log
# 4. conformance, one at a time (1-CPU quota group)
$I/tools/conf_r1b2.sh; echo "conf done $(date -u +%T)" >> $I/out/pipeline2.log
echo ALLDONE >> $I/out/pipeline2.log
