#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
cd $S/v5c
while pgrep -f "tools/after_gate.sh" > /dev/null; do sleep 5; done
$S/kit/venv/bin/python -B tools/prof.py $S/v5model/data/p20m5 2 3 bin/c2 bin/c4 bin/c5 > logs/prof_c2_c4_c5.txt 2>&1
echo "prof3 done" >> logs/prof_c2_c4_c5.txt
