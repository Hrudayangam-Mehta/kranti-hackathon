#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; Q=$S/qa_meta2; V=$S/variants7
for b in MT_A MT_B MT_ALL; do
  GATE_WAIVE=H9-method-exposure GATE_SRC=$V/$b/bot $S/mechbot/tools/release_gate.sh $V/$b/dist > $Q/gate/$b.txt 2>&1
done
for b in MT_A MT_B MT_ALL; do for m in base v3dir; do
  timeout 600 $S/mechbot/tools/panel_r6/maps/run_check.sh $m $V/$b/dist/bot.js > $Q/conf/${b}_$m.txt 2>&1
done; done
echo done > $Q/gate/done.txt
