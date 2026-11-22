#!/bin/bash
cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/struct
./run.sh simx heal 1 48 r2_heal &
./run.sh simx hold 1 48 r2_hold &
./run.sh simx duel 1 48 r2_duel &
wait
./run.sh simx holdduel 1 48 r2_holdduel &
./run.sh simx heal70 1 48 r2_heal70 &
./run.sh simx healedge 1 48 r2_healedge &
wait
echo done > out/batch2.done
