#!/bin/bash
SV=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/trunk/survive
T=$SV/tree/lib
while [ ! -f $SV/sim/LANE_S2_DONE ]; do sleep 5; done
mv $SV/sim/ALL4_100 $SV/sim/ALL4_100_mixed
$SV/tools/simb.sh ALL4 $T '"svDrop":"first","svRegen":"hold","svFire":"rhythm","svFarm":"laser"'
$SV/tools/simb.sh ALL4_100 $T '"svDrop":"first100","svRegen":"hold","svFire":"rhythm","svFarm":"laser"'
echo done > $SV/sim/LANE4_DONE
