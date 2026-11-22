#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos
T=$W/tree/lib; cd $W/tools
CH1='"focus":"kill","laserGrab":"spawn","cubes":"snow","laserRange":"midsq","boostCharge":"on","farmHp":"50sq","cratePath":"80","upg":"laser","upgFix":"on"'
./simb.sh CH1 $T "$CH1"
./simb.sh nc $T ''
for v in focus:kill laserGrab:spawn cubes:snow laserRange:midsq boostCharge:on farmHp:50sq cratePath:80 upg:laser; do k=${v%%:*}; x=${v#*:}; ./simb.sh ${k}_$x $T "\"$k\":\"$x\""; done
echo done > $W/out/sim/ALLDONE
