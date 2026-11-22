#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch
T=$W/tree/lib; cd $W/tools
while [ ! -f $W/out/sim/QADONE ]; do sleep 3; done
./simb.sh dropLife_idle $T '"dropLife":"idle"'
CFGJ='{"drops":{"times":[25,50,75],"fall_s":15}}' ./simb.sh early_dropIdle $T '"dropLife":"idle"' "1 2 3 4 5 6 7 8 9 10 11 12"
echo done > $W/out/sim/QA2DONE
