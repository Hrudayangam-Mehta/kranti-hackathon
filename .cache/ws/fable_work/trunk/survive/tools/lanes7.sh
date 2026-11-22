#!/bin/bash
SV=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/trunk/survive
T=$SV/tree/lib
while [ ! -f $SV/sim/LANE4_DONE ]; do sleep 5; done
CFGJ='{"drops":{"times":[30,55,80],"fall_s":15}}' $SV/tools/simb.sh mech_timely $T '"svDrop":"timely"'
$SV/tools/simb.sh svDrop_timely $T '"svDrop":"timely"'
$SV/tools/simb.sh ALL4T $T '"svDrop":"timely","svRegen":"hold","svFire":"rhythm","svFarm":"laser"'
CFGJ='{"drops":{"times":[30,55,80],"fall_s":15}}' $SV/tools/simb.sh mech_ALL4T $T '"svDrop":"timely","svRegen":"hold","svFire":"rhythm","svFarm":"laser"'
echo done > $SV/sim/LANE7_DONE
