#!/bin/bash
# changed decisions on the 28 sources, FNV SELECT salt 1: one recording set per preset value (chaos)
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos
cd $W/tools
CH1='"focus":"kill","laserGrab":"spawn","cubes":"snow","laserRange":"midsq","boostCharge":"on","farmHp":"50sq","cratePath":"80","upg":"laser","upgFix":"on"'
TAG=chg_CH1 LIB=$W/tree/lib SELS=FNV EXTRA="$CH1" ./idb.sh
for v in focus:kill laserGrab:spawn cubes:snow laserRange:midsq boostCharge:on farmHp:50sq cratePath:80 upg:laser; do k=${v%%:*}; x=${v#*:}
  TAG=chg_${k}_$x LIB=$W/tree/lib SELS=FNV EXTRA="\"$k\":\"$x\"" ./idb.sh; done
for v in laserRange:mid farmHp:50; do k=${v%%:*}; x=${v#*:}
  TAG=ffa_${k}_$x SET=ffa LIB=$W/tree/lib SELS=FNV EXTRA="\"$k\":\"$x\"" ./idb.sh; done
echo done > $W/id/CHGDONE
