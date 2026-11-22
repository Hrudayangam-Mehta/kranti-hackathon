#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
J=$S/v5judge
PY="$S/kit/venv/bin/python -B"
SC=$S/kit/unz/starter-duckdb/scripts
for ds in ${DS:-craft1 craft2 craft_pb empty1 empty2 empty3}; do
  data=$J/data/$ds; ref=$J/vruns/${ds}_ref
  rm -rf $ref; mkdir -p $ref
  taskset -c 0-3 $PY $S/verify/ref.py $data $ref > $ref.stdout 2> $ref.stderr; echo "$ds ref.py rc=$? $(tail -c 300 $ref.stderr | tr '\n' ' ' | cut -c1-200)"
  for b in A B rel17; do
    for n in 1 3 4 8; do
      out=$J/vruns/${ds}_${b}_n$n; rm -rf $out; mkdir -p $out
      env DATA_DIR=$data OUTPUT_DIR=$out NCPU=$n PATH=/usr/bin:/bin taskset -c 0-3 $J/bin/$b > $out.stdout 2> $out.stderr; rc=$?
      echo "$ds $b NCPU=$n: exit=$rc stdout=$(stat -c %s $out.stdout) $(cd $SC && $PY compare.py $out $ref 2>&1 | tail -1) / $(cd $SC && $PY compare.py $ref $out 2>&1 | tail -1)"
    done
  done
done
