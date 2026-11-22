#!/bin/sh
# squad (6 seeds) and ffa (2 seeds) simulator matches of the V4 shipped bundle on every transformed map
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4
M=$P/tools/panel_r6/maps
cd $P
for n in base mirx miry rot90 tr300 lift40 zs070 zs130 zt070 wide v3dir; do
  md=$M/$n; extra=""
  if [ $n = v3dir ]; then md=$M/base; extra=" $M/v3dir"; fi
  ./bun sim/run.js --bot "proc:$M/botcmd.sh $V/dist/bot.js$extra" --mode squad --matches 6 --seed 1 --jobs 3 --map-dir $md --config $M/$n/hello.json \
    --json $M/out/sim_${n}_squad.json --log-dir $M/out/simlogs/$n --trace $M/out/trace --trace-tag ${n}_sq > $M/out/sim_${n}_squad.txt 2>&1
  ./bun sim/run.js --bot "proc:$M/botcmd.sh $V/dist/bot.js$extra" --mode ffa --matches 2 --seed 1 --jobs 2 --map-dir $md --config $M/$n/hello.json \
    --json $M/out/sim_${n}_ffa.json --log-dir $M/out/simlogs/$n --trace $M/out/trace --trace-tag ${n}_ffa > $M/out/sim_${n}_ffa.txt 2>&1
  echo "$n done $(date -u +%H:%M:%S)"
done
