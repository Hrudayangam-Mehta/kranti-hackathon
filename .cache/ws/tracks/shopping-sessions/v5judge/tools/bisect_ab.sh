#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
J=$S/v5judge; PY="$S/kit/venv/bin/python -B"; SC=$S/kit/unz/starter-duckdb/scripts
for tog in NONE CRAFT_NO_TIES CRAFT_NO_DUPCLICK CRAFT_NO_ODDCAMP CRAFT_NO_F2 CRAFT_NO_ZEROS CRAFT_NO_LONGCLICK CRAFT_NO_QUOTES CRAFT_NO_BOUNDARY CRAFT_SIMPLE_USERS CRAFT_NO_DUPEVENT CRAFT_NO_EVVARIANT ALL; do
  d=$J/data/bab_$tog; rm -rf $d
  if [ $tog = ALL ]; then envs="CRAFT_NO_TIES=1 CRAFT_NO_DUPCLICK=1 CRAFT_NO_ODDCAMP=1 CRAFT_NO_F2=1 CRAFT_NO_ZEROS=1 CRAFT_NO_LONGCLICK=1 CRAFT_NO_QUOTES=1 CRAFT_NO_BOUNDARY=1 CRAFT_SIMPLE_USERS=1 CRAFT_NO_DUPEVENT=1 CRAFT_NO_EVVARIANT=1"; elif [ $tog = NONE ]; then envs=""; else envs="$tog=1"; fi
  env $envs python3 $J/tools/craft.py $d 1 > /dev/null 2>&1 || { echo "$tog: craft failed"; continue; }
  for b in A B; do out=$J/vruns/bab_${tog}_$b; rm -rf $out; mkdir -p $out; env DATA_DIR=$d OUTPUT_DIR=$out NCPU=1 PATH=/usr/bin:/bin taskset -c 0-3 $J/bin/$b > /dev/null 2>&1; done
  echo "$tog: A vs B $(cd $SC && $PY compare.py $J/vruns/bab_${tog}_A $J/vruns/bab_${tog}_B 2>&1 | grep -E '^(user_daily|campaign_daily|MATCH|DIFFER)' | sed 's/duplicate keys.*//' | tr '\n' ' ')"
  rm -rf $d
done
