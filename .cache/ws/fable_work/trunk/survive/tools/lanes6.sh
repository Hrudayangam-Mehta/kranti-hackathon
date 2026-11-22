#!/bin/bash
SV=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/trunk/survive; S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
while [ ! -f $SV/sim/LANE5_DONE ]; do sleep 5; done
ON='{"svDrop":"first","svRegen":"hold","svFire":"rhythm","svFarm":"laser"}'
{ nice -n 19 $S/mechbot/bun $SV/tools/pairms.mjs $SV/ref_ch1/lib $SV/tree/lib $S/mechbot/kit/check/stream.jsonl.gz squad '{}' 5
  nice -n 19 $S/mechbot/bun $SV/tools/pairms.mjs $SV/ref_ch1/lib $SV/tree/lib $S/mechbot/kit/check/stream.jsonl.gz squad "$ON" 5
  nice -n 19 $S/mechbot/bun $SV/tools/pairms.mjs $SV/ref_ch1/lib $SV/tree/lib $S/mechbot/tools/release_gate/long4800.jsonl.gz squad "$ON" 1; } > $SV/out/pairms.txt 2>&1
echo done > $SV/sim/LANE6_DONE
