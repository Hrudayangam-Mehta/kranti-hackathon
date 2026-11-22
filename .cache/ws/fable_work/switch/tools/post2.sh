#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch
cd $W/tools
while [ ! -f $W/id/CHGDONE ]; do sleep 3; done
mv $W/id/chg_dropLife_on $W/id/old_chg_dropLife_on_v1
TAG=chg_dropLife_on LIB=$W/tree/lib SELS=FNV EXTRA='"dropLife":"on"' ./idb.sh
echo done > $W/id/POST2DONE
