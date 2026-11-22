#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch
T=$W/tree/lib; cd $W/tools
while [ ! -f $W/out/sim/POST1DONE ]; do sleep 3; done
mv $W/out/sim/util_wait $W/out/sim_old_util_wait_v1; mv $W/out/sim/util_on $W/out/sim_old_util_on_v1
./simb.sh util_wait $T '"util":"wait"'
./simb.sh util_on $T '"util":"on"'
echo done > $W/out/sim/POST3DONE
