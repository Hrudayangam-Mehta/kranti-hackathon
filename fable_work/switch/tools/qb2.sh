#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch
cd $W/tools
while [ ! -f $W/id/QBDONE ]; do sleep 3; done
TAG=chg_dropLife_idle LIB=$W/tree/lib SELS=FNV EXTRA='"dropLife":"idle"' ./idb.sh
TAG=final2 LIB=$W/tree/lib SELS="FNV DEF KS KB" ./idb.sh
echo done > $W/id/QB2DONE
