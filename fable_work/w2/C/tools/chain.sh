#!/bin/bash
C=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/w2/C
true
$C/tools/idjobs.sh $C/tools/list_sim.txt > $C/out/idjobs_sim.log 2>&1
$C/tools/idjobs.sh $C/tools/list_tf2.txt > $C/out/idjobs_tf2.log 2>&1
echo chain done > $C/out/CHAIN_DONE
