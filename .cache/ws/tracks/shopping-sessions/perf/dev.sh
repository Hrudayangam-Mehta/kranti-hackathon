#!/bin/sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
B=${BIN:-$S/perf/bin/sessions}
O=$S/perf/out_dev; rm -rf $O; mkdir -p $O
DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$O NCPU=${NCPU:-2} taskset -c 2,3 $B 2>$S/perf/dev.log || { echo "exit $?"; cat $S/perf/dev.log; }
cd $S/kit/unz/starter-duckdb && $S/kit/venv/bin/python -B scripts/compare.py $O $S/kit/unz/dev-answer | tail -3
