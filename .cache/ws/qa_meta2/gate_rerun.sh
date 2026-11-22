#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; Q=$S/qa_meta2; V=$S/variants7
while [ ! -f $Q/out/done.txt ]; do sleep 10; done
sleep 5; uptime > $Q/gate/rerun_load.txt
for b in MT_A MT_B MT_ALL; do
  GATE_WAIVE=H9-method-exposure GATE_SRC=$V/$b/bot $S/mechbot/tools/release_gate.sh $V/$b/dist > $Q/gate/${b}_rerun.txt 2>&1
done
uptime >> $Q/gate/rerun_load.txt; echo done > $Q/gate/rerun_done.txt
