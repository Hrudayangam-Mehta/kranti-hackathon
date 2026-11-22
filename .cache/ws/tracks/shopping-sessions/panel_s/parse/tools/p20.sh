#!/bin/sh
B=$1; NAME=$2
PY=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/venv/bin/python
CMP=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/unz/starter-duckdb/scripts
O=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/run/p20_$NAME
rm -rf $O; mkdir -p $O
env -i DATA_DIR=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/m1data/p20m OUTPUT_DIR=$O NCPU=2 taskset -c 2,3 $B > $O.stdout 2> $O.err; rc=$?
echo "p20 $NAME exit=$rc stdout_bytes=$(wc -c < $O.stdout)"
