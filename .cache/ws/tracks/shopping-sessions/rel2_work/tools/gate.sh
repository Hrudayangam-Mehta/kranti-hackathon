#!/bin/sh
# gate.sh BIN [TAG]: fixtures (NCPU 1, 4, 8), dev MATCH (NCPU 4, 8, 1), 6 gate seeds (300k) MATCH vs ref.py both ways (NCPU 3),
#                    full 20M output identical to rel1's 20M output both ways (NCPU 4). NOSEEDS=1 / NO20M=1 skip parts.
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel2_work
B=$1; TAG=${2:-cur}
G=$W/gate
O=$W/runs/gate_$TAG
PY=$S/kit/venv/bin/python
SC=$S/kit/unz/starter-duckdb/scripts
mkdir -p $O
echo "binary $B sha256 $(sha256sum $B | cut -c1-16)"
cd $S/kit/unz/starter-duckdb
for n in 1 4 8; do
  printf "fixtures NCPU=$n: "; NCPU=$n $PY -B scripts/run_fixtures.py fixtures -- $B 2>&1 | tail -1
done
for n in 4 8 1; do
  D=$O/dev$n; rm -rf $D; mkdir -p $D
  DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$D NCPU=$n $B 2>$O/dev$n.log >$O/dev$n.stdout || echo "dev exit $?"
  printf "dev NCPU=$n: %s / %s (stdout %s bytes)\n" "$($PY -B $SC/compare.py $D $S/kit/unz/dev-answer | tail -1)" "$($PY -B $SC/compare.py $S/kit/unz/dev-answer $D | tail -1)" "$(wc -c < $O/dev$n.stdout)"
done
if [ -z "$NOSEEDS" ]; then
  for s in ${SEEDS:-3169 5097 6455 23128 29331 32124}; do
    D=$O/s$s; rm -rf $D; mkdir -p $D
    DATA_DIR=$G/s$s OUTPUT_DIR=$D NCPU=${SEED_NCPU:-3} $B 2>$O/s$s.log || echo "s$s exit $?"
    a=$($PY -B $SC/compare.py $D $G/s${s}_ref | tail -1)
    b=$($PY -B $SC/compare.py $G/s${s}_ref $D | tail -1)
    echo "seed $s: $a / $b"
  done
fi
if [ -z "$NO20M" ]; then
  D=$O/p20m; rm -rf $D; mkdir -p $D
  DATA_DIR=$S/m1data/p20m OUTPUT_DIR=$D NCPU=4 $B 2>$O/p20m.log || echo "p20m exit $?"
  a=$($PY -B $SC/compare.py $D $W/gate/p20m_rel1 | tail -1); b=$($PY -B $SC/compare.py $W/gate/p20m_rel1 $D | tail -1)
  echo "p20m vs rel1 output: $a / $b ($(ls $D/user_daily | wc -l) user files, $(ls $D/campaign_daily | wc -l) campaign files)"
  grep -E "sessions|warning" $O/p20m.log | head -3
  rm -rf $D
fi
