#!/bin/bash
SV=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/trunk/survive
T=$SV/tree/lib
laneS() {
  $SV/tools/simb.sh ALL4 $T '"svDrop":"first","svRegen":"hold","svFire":"rhythm","svFarm":"laser"'
  $SV/tools/simb.sh base $T ''
  echo done > $SV/sim/LANE_S_DONE
}
laneI() {
  for v in svDrop:first svDrop:first100 svRegen:hold svFire:rhythm svFarm:laser; do k=${v%%:*}; x=${v#*:}; $SV/tools/idq.sh p_${k}_$x $T "{\"select\":{\"$k\":\"$x\"},\"fuseMs\":1e9}" all; done
  $SV/tools/idq.sh p_ALL4 $T '{"select":{"svDrop":"first","svRegen":"hold","svFire":"rhythm","svFarm":"laser"},"fuseMs":1e9}' all
  echo done > $SV/id/LANE_I_DONE
}
laneS > $SV/sim/laneS.log 2>&1 &
laneI > $SV/id/laneI.log 2>&1 &
wait
