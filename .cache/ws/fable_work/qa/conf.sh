#!/bin/bash
for n in FOHLC_s1 FNR_s1 FHE40_s1 FA60_s1 FC075_s1 FB_s11 FB_s1; do for m in base v3dir; do
taskset -c 2 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r6/maps/run_check.sh $m /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/builds/$n/dist/bot.js > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/qa/conf/${n}_$m.txt 2>&1; echo "$n $m exit $?" >> /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/qa/conf/summary.txt
done; done
