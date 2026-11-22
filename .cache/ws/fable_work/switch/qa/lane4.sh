#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; W=$S/fable_work/switch; P=$S/mechbot; cd $W
mkdir -p qa/conf
for n in PM ID UTtgt UT DL DLidle UF UTwait FUwork NC; do for m in base v3dir; do
  nice -n 19 $P/tools/panel_r6/maps/run_check.sh $m $W/builds/SW_${n}_s1/dist/bot.js > qa/conf/${n}_$m.txt 2>&1
done; done; echo done > qa/conf.done
