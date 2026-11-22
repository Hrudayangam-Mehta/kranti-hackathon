#!/bin/bash
# QA chain: wait for the stream runner, then dist-level drives (2 processes), sims (2 at a time), conformance (1 at a time, 1-CPU cgroup), test_variant_m rerun
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
Q=$S/fable_work/trunk/qa; P=$S/mechbot; BUN=$P/bun; R=$S/fable_work/trunk/r1b
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
L=$Q/out/chain.log; echo "chain start $(date -u +%T)" > $L
until [ -f $Q/id/streams/done_jobs_streams.txt ]; do sleep 5; done; echo "streams done $(date -u +%T)" >> $L
# 1. dist-level: my digit-only bundle (table 1111121111111111) vs the shipped MX1_s05 dist, lockstep, production fuse (no override possible)
mkdir -p $Q/id/dist
drv() { python3 -I -B $Q/tools/drive_dist.py --stream $1 --map-dir $P/kit/arena --slot $2 --answers $Q/id/dist/$3.ans -- nice -n 19 env $JSC $BUN $4 > $Q/id/dist/$3.txt 2>&1; }
for spec in "kit:$P/kit/check/stream.jsonl.gz:5" "kit:$P/kit/check/stream.jsonl.gz:3" "l4800:$P/tools/release_gate/long4800.jsonl.gz:5" "l4800:$P/tools/release_gate/long4800.jsonl.gz:3"; do
  IFS=: read -r nm st sl <<< "$spec"
  drv $st $sl d05_${nm}_s$sl $Q/builds/QA_D05/dist/bot.js & drv $st $sl mx5_${nm}_s$sl $S/variants7/MX1_s05/dist/bot.js & wait
  a=$(sha256sum $Q/id/dist/d05_${nm}_s$sl.ans | cut -c1-16); b=$(sha256sum $Q/id/dist/mx5_${nm}_s$sl.ans | cut -c1-16)
  echo "dist $nm slot $sl: QA_D05 $a vs MX1_s05 $b $( [ "$a" = "$b" ] && echo IDENTICAL || echo DIFFERENT ) | $(cat $Q/id/dist/d05_${nm}_s$sl.txt | cut -c1-160) | $(cat $Q/id/dist/mx5_${nm}_s$sl.txt | cut -c1-160)" >> $Q/id/dist/summary.txt
done; echo "dist drives done $(date -u +%T)" >> $L
# 2. sims
$Q/tools/runsims.sh $Q/id/jobs_sims.txt $Q/id/sims; echo "sims done $(date -u +%T)" >> $L
# 3. conformance, one at a time
mkdir -p $Q/out/conf
for spec in R1B_c_s03:$R/R1B_c_s03/dist R1B_all_c:$R/R1B_all_c/dist ref_FNV_s1:$S/variants6/FNV_s1/dist; do N=${spec%%:*}; D=${spec#*:}
  for m in base v3dir; do nice -n 19 $P/tools/panel_r6/maps/run_check.sh $m $D/bot.js > $Q/out/conf/${N}_$m.txt 2>&1
    echo "$N $m: $(grep -E '^(PASS|FAIL)' $Q/out/conf/${N}_$m.txt | tail -1) | $(grep -E '^answer time' $Q/out/conf/${N}_$m.txt | cut -c1-90) | $(grep -E '^observations' $Q/out/conf/${N}_$m.txt | cut -c1-90)" >> $Q/out/conf/summary.txt; done; done
echo "conf done $(date -u +%T)" >> $L
# 4. the integrator's unit test, rerun here (not independent: their tool, their tree)
nice -n 19 env $JSC $BUN $S/fable_work/trunk/integ/tools/test_variant_m.mjs > $Q/out/test_variant_m_rerun.txt 2>&1; echo "test_variant_m exit $? $(date -u +%T)" >> $L
echo CHAIN_DONE >> $L
