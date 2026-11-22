#!/bin/bash
SV=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/trunk/survive
T=$SV/tree/lib
while [ ! -f $SV/id/LANE_I_DONE ]; do sleep 5; done
$SV/tools/mkbuild.sh SV0 > $SV/builds/SV0.log 2>&1
$SV/tools/mkbuild.sh SV4 svDrop=first svRegen=hold svFire=rhythm svFarm=laser > $SV/builds/SV4.log 2>&1
# mechanism runs (modified rule set: drops called at 30 / 55 / 80 s, 15 s fall) - drop rule reach only, not a result
export CFGJ='{"drops":{"times":[30,55,80],"fall_s":15}}'
$SV/tools/simb.sh mech_base $T ''
$SV/tools/simb.sh mech_drop $T '"svDrop":"first"'
$SV/tools/simb.sh mech_drop100 $T '"svDrop":"first100"'
echo done > $SV/sim/LANE3_DONE
