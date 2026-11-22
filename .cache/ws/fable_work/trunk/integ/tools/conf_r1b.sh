#!/bin/bash
# conf_r1b.sh: conformance (kit check.py via panel_r6 run_check.sh, 1-CPU quota group) on base and v3dir, one run at a time:
# R1B_all_c, R1B_c_s03, then the FNV_s1 dist as a timing reference at the same load
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
F=$S/fable_work/trunk; P=$S/mechbot; O=$F/integ/out/conf; mkdir -p $O
for spec in R1B_all_c:$F/r1b/R1B_all_c/dist R1B_c_s03:$F/r1b/R1B_c_s03/dist ref_FNV_s1:$S/variants6/FNV_s1/dist; do
  N=${spec%%:*}; D=${spec#*:}
  for m in base v3dir; do
    nice -n 19 $P/tools/panel_r6/maps/run_check.sh $m $D/bot.js > $O/${N}_$m.txt 2>&1
    [ -d $F/r1b/$N ] && cp $O/${N}_$m.txt $F/r1b/$N/conf_$m.txt
    echo "$N $m: $(grep -E '^(PASS|FAIL)' $O/${N}_$m.txt | tail -1) | $(grep -E '^answer time' $O/${N}_$m.txt | cut -c1-70) | $(grep -E 'variant|end place' $O/${N}_$m.txt | tr '\n' ' ' | cut -c1-160)"
  done
done > $O/summary.txt
echo done > $O/done.txt
