#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
J=$S/v5judge; PY="$S/kit/venv/bin/python -B"; SC=$S/kit/unz/starter-duckdb/scripts
for tog in NONE CRAFT_NO_TIES CRAFT_NO_DUPCLICK CRAFT_NO_ODDCAMP CRAFT_NO_F2 CRAFT_NO_ZEROS CRAFT_NO_LONGCLICK CRAFT_NO_QUOTES CRAFT_NO_BOUNDARY CRAFT_SIMPLE_USERS CRAFT_NO_DUPEVENT CRAFT_NO_EVVARIANT ALL; do
  d=$J/data/bis_$tog; rm -rf $d
  if [ $tog = ALL ]; then envs="CRAFT_NO_TIES=1 CRAFT_NO_DUPCLICK=1 CRAFT_NO_ODDCAMP=1 CRAFT_NO_F2=1 CRAFT_NO_ZEROS=1 CRAFT_NO_LONGCLICK=1 CRAFT_NO_QUOTES=1 CRAFT_NO_BOUNDARY=1 CRAFT_SIMPLE_USERS=1 CRAFT_NO_DUPEVENT=1 CRAFT_NO_EVVARIANT=1"; elif [ $tog = NONE ]; then envs=""; else envs="$tog=1"; fi
  env $envs python3 $J/tools/craft.py $d 1 > /dev/null
  ref=$J/vruns/bis_${tog}_ref; rm -rf $ref; mkdir -p $ref
  taskset -c 0-3 $PY $S/verify/ref.py $d $ref > /dev/null 2> $ref.stderr
  diag=$(grep -o "'clicks_dup_with_different_values[^,]*" $ref.stderr | head -1)
  out=$J/vruns/bis_${tog}_A; rm -rf $out; mkdir -p $out
  env DATA_DIR=$d OUTPUT_DIR=$out NCPU=1 PATH=/usr/bin:/bin taskset -c 0-3 $J/bin/A > /dev/null 2>&1
  echo "$tog: A vs ref $(cd $SC && $PY compare.py $out $ref 2>&1 | grep -E '^(user_daily|campaign_daily|MATCH|DIFFER)' | sed 's/duplicate keys.*//' | tr '\n' ' ') $diag"
done
