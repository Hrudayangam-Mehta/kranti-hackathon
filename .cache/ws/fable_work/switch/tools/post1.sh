#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch
T=$W/tree/lib; cd $W/tools
while [ ! -f $W/out/sim/ALLDONE ]; do sleep 3; done
mv $W/out/sim/dropLife_on $W/out/sim_old_dropLife_on_v1
./simb.sh dropLife_on $T '"dropLife":"on"'
export CFGJ='{"drops":{"times":[25,50,75],"fall_s":15}}'
./simb.sh early_base $T ''
./simb.sh early_dropLife $T '"dropLife":"on"'
echo done > $W/out/sim/POST1DONE
