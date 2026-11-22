#!/bin/sh
# edge.sh BIN TAG: run BIN on every verify/edge/*/input (read-only) at NCPU 2 and 8; compare with its out_ref both ways and with rel1's output
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel2_work; B=$1; TAG=$2
PY=$S/kit/venv/bin/python; SC=$S/kit/unz/starter-duckdb/scripts
O=$W/runs/edge_$TAG; rm -rf $O; mkdir -p $O
pass=0; total=0
for c in $S/verify/edge/*/; do
  n=$(basename $c); [ -d $c/input ] && [ -d $c/out_ref ] || continue
  total=$((total+1)); res=""
  for t in 2 8; do
    D=$O/$n.$t; mkdir -p $D
    DATA_DIR=$c/input OUTPUT_DIR=$D NCPU=$t $B >/dev/null 2>$D.log; rc=$?
    a=$($PY -B $SC/compare.py $D $c/out_ref 2>&1 | tail -1); b=$($PY -B $SC/compare.py $c/out_ref $D 2>&1 | tail -1)
    R=$O/$n.rel1.$t; mkdir -p $R; DATA_DIR=$c/input OUTPUT_DIR=$R NCPU=$t $W/bin/rel1 >/dev/null 2>&1
    r=$($PY -B $SC/compare.py $D $R 2>&1 | tail -1)
    res="$res NCPU=$t rc=$rc ref:$a/$b rel1:$r;"
  done
  case "$res" in *DIFFER*|*rc=[1-9]*|*Error*|*rror*) echo "CHECK $n:$res";; *) pass=$((pass+1));; esac
done
echo "edge cases: $pass/$total MATCH ref.py at NCPU 2 and 8"
