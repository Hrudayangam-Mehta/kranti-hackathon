#!/bin/bash
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch
cd $W/tools
TAG=final LIB=$W/tree/lib SELS="FNV DEF KS KB" ./idb.sh
for v in dropLife:on util:tgt util:wait util:on pauseMove:on isoDwell:on upgFix:on fuse:work; do k=${v%%:*}; x=${v#*:}
  TAG=chg_${k}_$x LIB=$W/tree/lib SELS=FNV EXTRA="\"$k\":\"$x\"" ./idb.sh; done
echo done > $W/id/QBDONE
