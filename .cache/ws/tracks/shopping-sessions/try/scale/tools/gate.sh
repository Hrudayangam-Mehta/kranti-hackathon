#!/bin/sh
# usage: gate.sh BIN  -> fixtures (NCPU 1 and 4), dev MATCH (NCPU 4 and 1), 6 seeds MATCH both ways vs ref.py (NCPU 3),
#                       full 20M output identical to rel1's output both ways (NCPU 4). NOSEEDS=1 skips the seeds.
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
B=$1
G=$T/try/scale/gate
PY=$T/kit/venv/bin/python
SC=$T/kit/unz/starter-duckdb/scripts
cd $T/kit/unz/starter-duckdb
for n in 1 4; do
  printf "fixtures NCPU=$n: "; NCPU=$n $PY -B scripts/run_fixtures.py fixtures -- $B 2>&1 | tail -1
done
for n in 4 1; do
  O=$G/out_dev$n; rm -rf $O; mkdir -p $O
  DATA_DIR=$T/kit/data/dev OUTPUT_DIR=$O NCPU=$n $B 2>$G/dev$n.log || echo "dev exit $?"
  printf "dev NCPU=$n: "; $PY -B $SC/compare.py $O $T/kit/unz/dev-answer | tail -1
done
if [ -z "$NOSEEDS" ]; then
  for s in 311 312 15 62 413 514; do
    O=$G/out_s$s; rm -rf $O; mkdir -p $O
    DATA_DIR=$G/s$s OUTPUT_DIR=$O NCPU=3 $B 2>$G/s$s.log || echo "s$s exit $?"
    a=$($PY -B $SC/compare.py $O $G/s${s}_ref | tail -1)
    b=$($PY -B $SC/compare.py $G/s${s}_ref $O | tail -1)
    echo "seed $s: $a / $b"
  done
fi
O=$G/out_p20m; rm -rf $O; mkdir -p $O
DATA_DIR=$T/m1data/p20m OUTPUT_DIR=$O NCPU=4 $B 2>$G/p20m.log || echo "p20m exit $?"
a=$($PY -B $SC/compare.py $O $G/p20m_base | tail -1); b=$($PY -B $SC/compare.py $G/p20m_base $O | tail -1)
echo "p20m vs rel1 output: $a / $b ($(ls $O/user_daily | wc -l) user files)"
