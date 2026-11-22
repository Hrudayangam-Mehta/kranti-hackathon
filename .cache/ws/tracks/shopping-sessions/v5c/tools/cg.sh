#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/v5c
BIN=$1; CORE=${2:-3}; TAG=${3:-}
NAME=$(basename $BIN)$TAG
O=$W/runs/cg_out_$NAME
rm -rf $O; mkdir -p $O $W/cg
env -i DATA_DIR=$S/v5model/data/dev5 OUTPUT_DIR=$O NCPU=1 $4 nice -n 10 taskset -c $CORE valgrind --tool=cachegrind --cache-sim=no --branch-sim=yes --cachegrind-out-file=$W/cg/$NAME.out $BIN > $W/cg/$NAME.stdout 2> $W/cg/$NAME.err
rc=$?
m=$(cd $S/kit/unz/starter-duckdb/scripts && $S/kit/venv/bin/python -B compare.py $O $S/v5model/kit5/devans/dev-answer | tail -1)
echo "$NAME exit=$rc $m $(grep -E 'I *refs' $W/cg/$NAME.err | sed 's/==[0-9]*==//') | $(grep -E 'Mispredicts' $W/cg/$NAME.err | sed 's/==[0-9]*==//' | head -1)"
rm -rf $O
