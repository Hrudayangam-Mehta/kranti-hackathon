#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
cd $S/v5c
while pgrep -f "tools/ab.py" > /dev/null || pgrep -x valgrind > /dev/null; do sleep 3; done
tools/fullgate.sh $S/v5c/bin/c5 > logs/fullgate_c5.txt 2>&1
