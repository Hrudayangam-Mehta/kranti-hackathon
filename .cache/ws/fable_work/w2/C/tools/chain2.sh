#!/bin/bash
C=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/w2/C
until [ -f $C/out/CHAIN_DONE ]; do sleep 10; done
$C/tools/idjobs.sh $C/tools/list_rule.txt > $C/out/idjobs_rule.log 2>&1
echo chain2 done > $C/out/CHAIN2_DONE
