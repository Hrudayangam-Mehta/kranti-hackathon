#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
J=$S/v5judge; PY="$S/kit/venv/bin/python -B"; SC=$S/kit/unz/starter-duckdb/scripts
ALL="CRAFT_NO_TIES=1 CRAFT_NO_DUPCLICK=1 CRAFT_NO_ODDCAMP=1 CRAFT_NO_F2=1 CRAFT_NO_ZEROS=1 CRAFT_NO_LONGCLICK=1 CRAFT_NO_QUOTES=1 CRAFT_NO_BOUNDARY=1 CRAFT_SIMPLE_USERS=1 CRAFT_NO_DUPEVENT=1 CRAFT_NO_EVVARIANT=1 CRAFT_NO_CHAIN=1 CRAFT_NO_DIRT=1"
for n in 1 2 3 5 10 20 50 200; do for seed in $(seq 1 30); do
  d=$J/data/min_${n}_$seed; rm -rf $d
  env $ALL CRAFT_NUSERS=$n python3 $J/tools/craft.py $d $seed > /dev/null 2>&1 || { echo "n=$n seed=$seed craft failed"; continue; }
  for b in A B; do out=$J/vruns/min_$b; rm -rf $out; mkdir -p $out; env DATA_DIR=$d OUTPUT_DIR=$out NCPU=1 PATH=/usr/bin:/bin taskset -c 0-3 $J/bin/$b > /dev/null 2>&1; done
  r=$(cd $SC && $PY compare.py $J/vruns/min_A $J/vruns/min_B 2>&1 | grep -E '^(MATCH|DIFFER)')
  if [ "$r" = DIFFER ]; then echo "n=$n seed=$seed DIFFER (kept $d)"; cp -r $J/vruns/min_A $J/vruns/min_${n}_${seed}_A; cp -r $J/vruns/min_B $J/vruns/min_${n}_${seed}_B; exit 0; fi
  rm -rf $d
done; done
echo "no small failing case found"
