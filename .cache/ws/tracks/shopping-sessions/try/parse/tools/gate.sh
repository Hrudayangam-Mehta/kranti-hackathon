#!/bin/sh
# usage: gate.sh BIN [seeds...]  -> fixtures, dev compare, generator seeds vs ref.py both ways
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
P=$S/try/parse
B=$1; shift
echo "== fixtures"
cd $S/kit/unz/starter-duckdb && NCPU=2 $S/kit/venv/bin/python -B scripts/run_fixtures.py fixtures -- taskset -c 2,3 $B 2>&1 | tail -2
echo "== dev"
O=$P/runs/out_dev; rm -rf $O; mkdir -p $O
DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$O NCPU=2 taskset -c 2,3 $B 2>$P/runs/dev.log || { echo "exit $?"; cat $P/runs/dev.log; }
$S/kit/venv/bin/python -B scripts/compare.py $O $S/kit/unz/dev-answer | tail -1
$S/kit/venv/bin/python -B scripts/compare.py $S/kit/unz/dev-answer $O | tail -1
if [ $# -gt 0 ]; then
echo "== seeds"
python3 $P/tools/seeds.py $B "$@"
fi
