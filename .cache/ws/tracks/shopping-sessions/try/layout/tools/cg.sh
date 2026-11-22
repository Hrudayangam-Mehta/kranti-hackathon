#!/bin/bash
L=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/layout
BIN=$1; DATA=${2:-$L/runs/d4m}; TAG=$(basename $BIN)
O=$L/runs/cg_out_$TAG; rm -rf $O; mkdir -p $O
DATA_DIR=$DATA OUTPUT_DIR=$O NCPU=1 valgrind --tool=cachegrind --cache-sim=yes --D1=32768,8,64 --LL=1048576,16,64 --cachegrind-out-file=$L/runs/cg_$TAG.out $L/bin/$TAG > $L/runs/cg_$TAG.log 2>&1
grep -E "I *refs|D *refs|D1 *misses|LLd misses|LL misses|LL refs" $L/runs/cg_$TAG.log | sed "s/^==[0-9]*== /$TAG /"
