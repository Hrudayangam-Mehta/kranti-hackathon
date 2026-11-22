#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
V=$S/v5c_verify
BIN=$1; NCPU=${2:-1}; NAME=$(basename $BIN)
O=$V/runs/cg_$NAME; rm -rf $O; mkdir -p $O $V/cg
env -i DATA_DIR=$S/v5model/data/dev5 OUTPUT_DIR=$O NCPU=$NCPU nice -n 10 taskset -c 2,3 valgrind --tool=cachegrind --cache-sim=no --branch-sim=yes --cachegrind-out-file=$V/cg/$NAME.out $BIN > $V/cg/$NAME.stdout 2> $V/cg/$NAME.err
echo "$NAME NCPU=$NCPU exit=$? stdout_bytes=$(wc -c < $V/cg/$NAME.stdout) $(grep -E 'I.*refs|Mispredicts' $V/cg/$NAME.err | tr -s ' ' | tr '\n' '|')"
cd $S/kit/unz/starter-duckdb/scripts && $S/kit/venv/bin/python -B compare.py $O $S/v5model/kit5/devans/dev-answer | tail -1
rm -rf $O
