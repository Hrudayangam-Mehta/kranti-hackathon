#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
A=$S/v5a; PY="$S/kit/venv/bin/python -B"; K=$S/kit/unz/starter-duckdb
BIN=$1; shift
DATA=${DATA:-$S/v5model/data/dev5}; ANS=${ANS:-$S/v5model/kit5/devans/dev-answer}
for n in "$@"; do
  O=$A/runs/dev_$(basename $BIN)_n$n; rm -rf $O; mkdir -p $O
  env -i DATA_DIR=$DATA OUTPUT_DIR=$O NCPU=$n $EXTRA nice -n 10 taskset -c 2,3 $BIN > $O.stdout 2> $O.err; rc=$?
  a=$(cd $K/scripts && $PY compare.py $O $ANS | tail -1); b=$(cd $K/scripts && $PY compare.py $ANS $O | tail -1)
  echo "$(basename $BIN) $(basename $DATA) NCPU=$n $EXTRA: exit=$rc stdout=$(wc -c < $O.stdout) $a / $b"
done
