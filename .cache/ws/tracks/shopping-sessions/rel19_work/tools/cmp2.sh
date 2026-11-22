#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
A=$1; B=$2
echo "compare $(basename $A) -> $(basename $B): $(cd $K/scripts && $PY compare.py $A $B | tail -1) / $(cd $K/scripts && $PY compare.py $B $A | tail -1)"
nice -n 10 taskset -c 2,3 $PY $S/panel_s/threads/tools/rowdiff.py $A $B
