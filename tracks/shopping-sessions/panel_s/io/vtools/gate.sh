#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
IO=$S/panel_s/io
BIN=${1:-$IO/bin/io1}
G=${2:-$IO/gate}
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
mkdir -p $G
rm -rf $G/*
echo "binary $BIN $(sha256sum $BIN | cut -c1-64)"
for n in 1 4; do
  (cd $K && env NCPU=$n $PY scripts/run_fixtures.py fixtures -- taskset -c 0,1 $BIN > $G/fixtures_n$n.log 2>&1)
  echo "fixtures NCPU=$n: $(grep -ciE '^(ok|pass)|PASS' $G/fixtures_n$n.log) pass-lines; tail: $(tail -1 $G/fixtures_n$n.log)"
done
for n in 1 4 8; do
  mkdir -p $G/dev_n$n
  env -i DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$G/dev_n$n NCPU=$n taskset -c 0,1 $BIN > $G/dev_n$n.stdout 2> $G/dev_n$n.err
  rc=$?
  echo "dev NCPU=$n exit $rc stdout $(wc -c < $G/dev_n$n.stdout) : $($PY $K/scripts/compare.py $G/dev_n$n $S/kit/unz/dev-answer | tail -1)"
done
for b in $BIN $IO/bin/rel16; do
  t=$(basename $b)
  mkdir -p $G/p20_$t
  env -i DATA_DIR=$S/m1data/p20m OUTPUT_DIR=$G/p20_$t NCPU=4 taskset -c 0,1 $b > $G/p20_$t.stdout 2> $G/p20_$t.err
  echo "20M $t exit $? stdout $(wc -c < $G/p20_$t.stdout)"
done
t=$(basename $BIN)
echo "20M $t vs rel16: $($PY $K/scripts/compare.py $G/p20_$t $G/p20_rel16 | tail -1)"
echo "20M rel16 vs $t: $($PY $K/scripts/compare.py $G/p20_rel16 $G/p20_$t | tail -1)"
rm -rf $G/p20_$t $G/p20_rel16
ENG=$BIN $PY $IO/vtools/seeds.py g15:15:600000:150000 g62:62:500000:125000 g3:3:400000:100000 g101:101:200000:400000 g777:777:500000:125000 g23:23:400000:100000 > $G/seeds.log 2>&1
cat $G/seeds.log | cut -c1-200
