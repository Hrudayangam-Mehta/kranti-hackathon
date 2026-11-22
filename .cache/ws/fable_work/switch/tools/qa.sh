#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch
T=$W/tree/lib; cd $W/tools
./simb.sh dropLife_on $T '"dropLife":"on"'
./simb.sh util_tgt $T '"util":"tgt"'
./simb.sh pauseMove_on $T '"pauseMove":"on"'
./simb.sh isoDwell_on $T '"isoDwell":"on"'
./simb.sh util_on $T '"util":"on"'
./simb.sh util_wait $T '"util":"wait"'
./simb.sh upgFix_on $T '"upgFix":"on"'
CFGJ='{"drops":{"times":[25,50,75],"fall_s":15}}' ./simb.sh early_base $T '' "1 2 3 4 5 6 7 8 9 10 11 12"
CFGJ='{"drops":{"times":[25,50,75],"fall_s":15}}' ./simb.sh early_dropLife $T '"dropLife":"on"' "1 2 3 4 5 6 7 8 9 10 11 12"
./simb.sh fuse_work $T '"fuse":"work"'
echo done > $W/out/sim/QADONE
