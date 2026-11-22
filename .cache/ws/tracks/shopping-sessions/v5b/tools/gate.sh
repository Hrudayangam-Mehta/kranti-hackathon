#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/v5b
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
BIN=$(realpath $1); shift
FIX=$1; shift
DEV=$1; shift
DATA=${DATA:-$S/v5model/data/dev5}
ANS=${ANS:-$S/v5model/kit5/devans/dev-answer}
EXTRA="$*"
NAME=$(basename $BIN)
G=$W/runs/gate_$NAME
rm -rf $G; mkdir -p $G $W/tmp
echo "binary $NAME $(sha256sum $BIN | cut -c1-64) data $(basename $DATA)"
for n in $FIX; do
  r=$(cd $K && TMPDIR=$W/tmp NCPU=$n $EXTRA $PY scripts/run_fixtures.py fixtures -- taskset -c 0,1 $BIN > $G/fixtures_n$n.log 2>&1; tail -1 $G/fixtures_n$n.log)
  echo "fixtures NCPU=$n $EXTRA: $r"
done
for n in $DEV; do
  O=$G/dev_n$n
  mkdir -p $O
  env -i DATA_DIR=$DATA OUTPUT_DIR=$O NCPU=$n $EXTRA taskset -c 0,1 $BIN > $O.stdout 2> $O.err; rc=$?
  a=$(cd $K/scripts && $PY compare.py $O $ANS | tail -1)
  b=$(cd $K/scripts && $PY compare.py $ANS $O | tail -1)
  echo "dev NCPU=$n $EXTRA: exit=$rc stdout_bytes=$(wc -c < $O.stdout) files=$(ls $O/user_daily | wc -l)/$(ls $O/campaign_daily | wc -l) $a / $b"
done
