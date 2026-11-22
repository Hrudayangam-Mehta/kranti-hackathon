#!/bin/bash
for rep in 1 2; do for m in base v3dir; do for b in MT_A MT_B MT_ALL UPG_1211; do
  timeout 300 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r6/maps/run_check.sh $m /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants7/$b/dist/bot.js > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/qa_meta/conf/${b}_${m}_$rep.txt 2>&1
done; done; done
echo done > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/qa_meta/conf/done.txt
