#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos
cd $W/tools
while [ ! -f $W/out/sim/ALLDONE ]; do sleep 15; done
CH1='"focus":"kill","laserGrab":"spawn","cubes":"snow","laserRange":"midsq","boostCharge":"on","farmHp":"50sq","cratePath":"80","upg":"laser","upgFix":"on"'
./simb.sh CH1DL $W/tree/lib "$CH1,\"dropLife\":\"on\""
./simb.sh CH1AL $W/tree2/lib "$CH1,\"alpha\":\"on\""
./simb.sh CH1PM $W/tree2/lib "$CH1,\"pauseMove\":\"on\",\"isoDwell\":\"on\",\"strafe\":\"fast75\""
./simb.sh alpha_on $W/tree2/lib '"alpha":"on"'
./simb.sh strafe_fast75 $W/tree2/lib '"strafe":"fast75"'
./simb.sh nc2 $W/tree2/lib ''
./simb.sh CH1t2 $W/tree2/lib "$CH1"
echo done > $W/out/sim/SIM2DONE
