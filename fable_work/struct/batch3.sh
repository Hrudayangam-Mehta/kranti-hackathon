#!/bin/bash
cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/struct
while [ ! -f out/batch2.done ]; do sleep 3; done
./run.sh simx off 1 48 r2_off &
./run.sh simx healw 1 48 r2_healw &
./run.sh simx healq 1 48 r2_healq &
wait
echo done > out/batch3.done
