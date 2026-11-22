#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
A=$S/v5a
BIN=$1; DATA=${2:-$S/v5model/data/dev5}; ANS=${3:-$S/v5model/kit5/devans/dev-answer}
NAME=$(basename $BIN)
O=$A/runs/cg_out_$NAME
rm -rf $O; mkdir -p $O $A/cg
env -i DATA_DIR=$DATA OUTPUT_DIR=$O NCPU=1 nice -n 10 taskset -c 2 valgrind --tool=cachegrind --cache-sim=no --branch-sim=no --cachegrind-out-file=$A/cg/$NAME.out $BIN > $A/cg/$NAME.stdout 2> $A/cg/$NAME.err
rc=$?
m=$(cd $S/kit/unz/starter-duckdb/scripts && $S/kit/venv/bin/python -B compare.py $O $ANS | tail -1)
echo "$NAME exit=$rc $m $(grep -E 'I *refs' $A/cg/$NAME.err | sed 's/==[0-9]*==//')"
