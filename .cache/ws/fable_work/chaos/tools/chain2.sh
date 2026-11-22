#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos
cd $W/tools
TAG=old2 LIB=$W/tree2/lib ./idb.sh
./allchg.sh
CH1='"focus":"kill","laserGrab":"spawn","cubes":"snow","laserRange":"midsq","boostCharge":"on","farmHp":"50sq","cratePath":"80","upg":"laser","upgFix":"on"'
TAG=chg_alpha_on LIB=$W/tree2/lib SELS=FNV EXTRA='"alpha":"on"' ./idb.sh
TAG=chg_strafe_fast75 LIB=$W/tree2/lib SELS=FNV EXTRA='"strafe":"fast75"' ./idb.sh
TAG=chg_CH1t2 LIB=$W/tree2/lib SELS=FNV EXTRA="$CH1" ./idb.sh
TAG=chg_CH1AL LIB=$W/tree2/lib SELS=FNV EXTRA="$CH1,\"alpha\":\"on\"" ./idb.sh
TAG=chg_CH1PM LIB=$W/tree2/lib SELS=FNV EXTRA="$CH1,\"pauseMove\":\"on\",\"isoDwell\":\"on\",\"strafe\":\"fast75\"" ./idb.sh
TAG=chg_CH1DL LIB=$W/tree2/lib SELS=FNV EXTRA="$CH1,\"dropLife\":\"on\"" ./idb.sh
echo done > $W/id/CHAIN2DONE
