#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch
T=$W/tree/lib; cd $W/tools
./simb.sh nc $T ''
./simb.sh dropLife_on $T '"dropLife":"on"'
./simb.sh util_wait $T '"util":"wait"'
./simb.sh util_tgt $T '"util":"tgt"'
./simb.sh util_on $T '"util":"on"'
./simb.sh pauseMove_on $T '"pauseMove":"on"'
./simb.sh isoDwell_on $T '"isoDwell":"on"'
./simb.sh upgFix_on $T '"upgFix":"on"'
./simb.sh fuse_work $T '"fuse":"work"'
echo done > $W/out/sim/ALLDONE
