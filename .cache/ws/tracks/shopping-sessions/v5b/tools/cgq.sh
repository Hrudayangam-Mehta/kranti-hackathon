#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5b
BIN=$(realpath $1); DATA=$(realpath $2); CORE=${3:-1}
NAME=$(basename $BIN)_$(basename $DATA)
O=$W/runs/cgq_$NAME; rm -rf $O; mkdir -p $O
env -i DATA_DIR=$DATA OUTPUT_DIR=$O NCPU=1 taskset -c $CORE valgrind --tool=cachegrind --cache-sim=no --cachegrind-out-file=/dev/null $BIN > /dev/null 2> $W/cg/$NAME.err
echo "$NAME $(grep -E 'I *refs' $W/cg/$NAME.err | sed 's/==[0-9]*==//' | tr -s ' ')"
rm -rf $O
