#!/bin/bash
# changed decisions on the 28 sources, FNV SELECT salt 1: one recording set per preset value
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/switch
cd $W/tools
for v in dropLife:on util:wait util:tgt util:on pauseMove:on isoDwell:on upgFix:on fuse:work; do k=${v%%:*}; x=${v#*:}
  TAG=chg_${k}_$x LIB=$W/tree/lib SELS=FNV EXTRA="\"$k\":\"$x\"" ./idb.sh; done
echo done > $W/id/CHGDONE
