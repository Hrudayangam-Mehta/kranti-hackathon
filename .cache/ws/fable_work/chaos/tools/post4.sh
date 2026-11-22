#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos
cd $W/tools
while [ ! -f $W/id/POST2DONE ]; do sleep 3; done
mv $W/id/chg_util_wait $W/id/old_chg_util_wait_v1; mv $W/id/chg_util_on $W/id/old_chg_util_on_v1
for x in wait on; do TAG=chg_util_$x LIB=$W/tree/lib SELS=FNV EXTRA="\"util\":\"$x\"" ./idb.sh; done
echo done > $W/id/POST4DONE
