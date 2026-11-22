#!/bin/bash
# usage: attack2.sh LABEL BIN  (crafted/empty/repro datasets vs ref.py)
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
J=$S/v5judge; PY="$S/kit/venv/bin/python -B"; SC=$S/kit/unz/starter-duckdb/scripts
L=$1; BIN=$(readlink -f $2)
for ds in craft1 craft2 craft_pb empty1 empty2 empty3 repro_emptycamp min_1_5; do
  data=$J/data/$ds; ref=$J/vruns/${ds}_ref
  [ -d $ref/user_daily ] || { mkdir -p $ref; taskset -c 0-3 $PY $S/verify/ref.py $data $ref > /dev/null 2> $ref.stderr; }
  for n in 1 4 8; do
    out=$J/vruns/${ds}_${L}_n$n; rm -rf $out; mkdir -p $out
    env DATA_DIR=$data OUTPUT_DIR=$out NCPU=$n PATH=/usr/bin:/bin taskset -c 0-3 $BIN > $out.stdout 2> $out.stderr; rc=$?
    echo "$ds $L NCPU=$n: exit=$rc stdout=$(stat -c %s $out.stdout) $(cd $SC && $PY compare.py $out $ref 2>&1 | tail -1) / $(cd $SC && $PY compare.py $ref $out 2>&1 | tail -1)"
  done
done
