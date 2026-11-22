#!/bin/bash
cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/struct
./run.sh simb off 1 48 B48 &
./run.sh simx heal 1 48 heal48 &
./run.sh simx hold 1 48 hold48 &
wait
./run.sh simx heal40 1 48 heal40_48 &
./run.sh simx heal70 1 48 heal70_48 &
./run.sh simx healedge 1 48 healedge48 &
wait
echo done > out/batch1.done
