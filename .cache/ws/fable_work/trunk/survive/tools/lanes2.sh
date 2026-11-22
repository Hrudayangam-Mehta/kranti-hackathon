#!/bin/bash
SV=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/trunk/survive
T=$SV/tree/lib
while [ ! -f $SV/sim/LANE_S_DONE ]; do sleep 5; done
$SV/tools/simb.sh ALL4 $T '"svDrop":"first","svRegen":"hold","svFire":"rhythm","svFarm":"laser"'
$SV/tools/simb.sh ALL4_100 $T '"svDrop":"first100","svRegen":"hold","svFire":"rhythm","svFarm":"laser"'
for v in svDrop:first svDrop:first100 svRegen:hold svFire:rhythm svFarm:laser; do k=${v%%:*}; x=${v#*:}; $SV/tools/simb.sh ${k}_$x $T "\"$k\":\"$x\""; done
echo done > $SV/sim/LANE_S2_DONE
