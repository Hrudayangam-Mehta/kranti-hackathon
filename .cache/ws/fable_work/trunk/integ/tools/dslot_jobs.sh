#!/bin/bash
# dslot_jobs.sh: every r1b baked source on the kit stream (FUSE=1), 2 at a time, nice 19
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
F=$S/fable_work/trunk; R=$F/r1b; SV4=$F/survive/builds/SV4/bot; FNV=$S/variants6/FNV_s1/bot; O=$F/integ/id/dslot; mkdir -p $O
{
for n in $(seq -w 0 15); do i=$((10#$n)); j=$(( (i + 1) % 16 ))
  echo "c_s${n}_at${i}_vs_SV4|$R/R1B_c_s$n/bot|$SV4|$i"
  echo "c_s${n}_at${j}_vs_FNV|$R/R1B_c_s$n/bot|$FNV|$j"
done
echo "all_c_at3_vs_SV4|$R/R1B_all_c/bot|$SV4|3"
echo "all_c_at0_vs_SV4|$R/R1B_all_c/bot|$SV4|0"
echo "ctl_c_s03_at3_vs_FNV|$R/R1B_c_s03/bot|$FNV|3"
} > $O/jobs.txt
run1() { IFS='|' read -r name a b slot <<< "$1"; [ -f $O/$name.txt ] && grep -q decisions $O/$name.txt && exit 0
  SLOT=$slot FUSE=1 nice -n 19 env BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1 \
    $S/mechbot/bun $F/integ/tools/dslot.mjs $a $b > $O/$name.txt 2>&1; }
export -f run1; export S F O
tr '\n' '\0' < $O/jobs.txt | xargs -0 -P 2 -I{} bash -c 'run1 "$@"' _ {}
for f in $O/*.txt; do [ $(basename $f) = jobs.txt ] && continue; echo "$(basename $f .txt): $(tail -1 $f)"; done > $O/summary.txt
echo done > $O/done.txt
