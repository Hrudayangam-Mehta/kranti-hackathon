#!/bin/bash
B=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
L=$B/try/layout
BIN=$1
PY=$B/kit/venv/bin/python
CMP=$B/kit/unz/starter-duckdb/scripts/compare.py
NC=${GATE_NCPU:-2}
CORES=${GATE_CORES:-2,3}
mkdir -p $L/runs/tmp
fail=0
cat > $L/runs/tmp/wrap.sh <<W
#!/bin/sh
exec env NCPU=$NC taskset -c $CORES $BIN
W
chmod +x $L/runs/tmp/wrap.sh
fx=$(cd $B/kit/unz/starter-duckdb && TMPDIR=$L/runs/tmp $PY scripts/run_fixtures.py fixtures -- $L/runs/tmp/wrap.sh 2>&1 | tail -1)
echo "fixtures: $fx"
case "$fx" in *"36/36"*) ;; *) fail=1;; esac
O=$L/runs/gate_out
rm -rf $O; mkdir -p $O
DATA_DIR=$B/kit/data/dev OUTPUT_DIR=$O NCPU=$NC taskset -c $CORES $BIN 2>/dev/null || fail=1
r=$($PY $CMP $O $B/kit/unz/dev-answer | tail -1); echo "dev: $r"; [ "$r" = MATCH ] || fail=1
for s in $(cat $L/runs/seeds.txt); do
  rm -rf $O; mkdir -p $O
  DATA_DIR=$L/runs/seeds/s$s OUTPUT_DIR=$O NCPU=$NC taskset -c $CORES $BIN 2>/dev/null || fail=1
  a=$($PY $CMP $O $L/runs/ref/s$s/ | tail -1)
  b=$($PY $CMP $L/runs/ref/s$s/ $O | tail -1)
  echo "seed $s: $a / $b"
  [ "$a" = MATCH ] && [ "$b" = MATCH ] || fail=1
done
if [ $fail = 0 ]; then echo "GATE PASS $(sha256sum $BIN | cut -c1-16)"; else echo "GATE FAIL"; fi
