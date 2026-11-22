#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/v5c
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
BIN=$1; shift
FIX=$1; shift
DEV=$1; shift
SET=${1:-v5}; shift
EXTRA="$*"
NAME=$(basename $BIN)
G=$W/runs/gate_$NAME
mkdir -p $G $W/tmp
if [ "$SET" = v5 ]; then DATA=$S/v5model/data/dev5; ANS=$S/v5model/kit5/devans/dev-answer; else DATA=$S/kit/data/dev; ANS=$S/kit/unz/dev-answer; fi
echo "binary $NAME $(sha256sum $BIN | cut -c1-64) set=$SET $EXTRA"
for n in $FIX; do
  r=$(cd $K && env TMPDIR=$W/tmp NCPU=$n $EXTRA $PY scripts/run_fixtures.py fixtures -- nice -n 10 taskset -c 2,3 $BIN > $G/fixtures_n$n.log 2>&1; tail -1 $G/fixtures_n$n.log)
  echo "fixtures NCPU=$n $EXTRA: $r"
done
for n in $DEV; do
  O=$G/dev_${SET}_n$n
  rm -rf $O; mkdir -p $O
  env -i DATA_DIR=$DATA OUTPUT_DIR=$O NCPU=$n $EXTRA nice -n 10 taskset -c 2,3 $BIN > $O.stdout 2> $O.err; rc=$?
  a=$(cd $K/scripts && $PY compare.py $O $ANS | tail -1)
  b=$(cd $K/scripts && $PY compare.py $ANS $O | tail -1)
  echo "dev $SET NCPU=$n $EXTRA: exit=$rc stdout_bytes=$(wc -c < $O.stdout) files=$(ls $O/user_daily | wc -l)/$(ls $O/campaign_daily | wc -l) $a / $b"
done
