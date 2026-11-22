#!/bin/bash
SV=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/trunk/survive; S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
while [ ! -f $SV/sim/LANE3_DONE ]; do sleep 5; done
$SV/tools/ffforce.sh ffF_off $SV/tree/lib '{"env":"ffa","fuseMs":1e9}'
$SV/tools/ffforce.sh ffF_ALL4 $SV/tree/lib '{"env":"ffa","fuseMs":1e9,"select":{"svDrop":"first100","svRegen":"hold","svFire":"rhythm","svFarm":"laser"}}'
FNV='{"laserRange":"far","farmHp":"90","focus":"mult","upg":"std","laserGrab":"std","cubes":"off","boostCharge":"off","cratePath":"std","upgFix":"off"}'
for e in auto squad ffa; do nice -n 19 $S/mechbot/bun $SV/tools/kitdiff.mjs $S/variants6/FNV_s1/bot/lib $SV/tree/lib $S/mechbot/kit/check/stream.jsonl.gz $e '{}' "$FNV"; done > $SV/out/fnv_identity.txt 2>&1
for e in auto squad; do nice -n 19 $S/mechbot/bun $SV/tools/kitdiff.mjs $S/variants6/FNV_s1/bot/lib $SV/tree/lib $S/mechbot/tools/release_gate/long4800.jsonl.gz $e '{}' "$FNV"; done >> $SV/out/fnv_identity.txt 2>&1
echo done > $SV/sim/LANE5_DONE
