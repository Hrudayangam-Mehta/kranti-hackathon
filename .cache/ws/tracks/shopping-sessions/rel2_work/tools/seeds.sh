#!/bin/sh
# seeds.sh BIN TAG NCPU seed...: run BIN on rel2_work/gate/sSEED, compare with sSEED_ref both ways
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel2_work; B=$1; TAG=$2; N=$3; shift 3
PY=$S/kit/venv/bin/python; SC=$S/kit/unz/starter-duckdb/scripts
O=$W/runs/seeds_$TAG; mkdir -p $O
for s in "$@"; do
  D=$O/s$s.$N; rm -rf $D; mkdir -p $D
  DATA_DIR=$W/gate/s$s OUTPUT_DIR=$D NCPU=$N $B >$D.stdout 2>$D.log; rc=$?
  a=$($PY -B $SC/compare.py $D $W/gate/s${s}_ref | tail -1); b=$($PY -B $SC/compare.py $W/gate/s${s}_ref $D | tail -1)
  rows=$(grep -o "user_daily rows [0-9]*" $D.log)
  echo "seed $s NCPU=$N rc=$rc: $a / $b ($rows; window $(tr -d ' \n' < $W/gate/s$s/manifest.json | cut -c16-25)..; stdout $(wc -c < $D.stdout) B)"
  rm -rf $D
done
