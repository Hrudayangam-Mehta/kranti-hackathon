#!/bin/sh
# shipped bundles as processes (Dockerfile engine limits via botcmd.sh) on every transformed map: 2 squad seeds each, core 2
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot; W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r7/stress; M=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r6/maps; V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants6
cd $P
for b in S_s1 KS; do
  for n in base mirx miry rot90 tr300 lift40 zs070 zs130 zt070 wide v3dir; do
    md=$M/$n; extra=""
    if [ $n = v3dir ]; then md=$M/base; extra=" $M/v3dir"; fi
    flock $W/core2.lock taskset -c 2 ./bun sim/run.js --bot "proc:$M/botcmd.sh $V/$b/dist/bot.js$extra" --mode squad --matches 2 --seed 4001 --jobs 1 --map-dir $md --config $M/$n/hello.json \
      --json $W/out/maps/${b}_$n.json --log-dir $W/out/maps/logs/${b}_$n --trace $W/trace_maps --trace-tag ${b}_$n > $W/out/maps/${b}_$n.txt 2>&1
  done
  echo "maps $b $(date -u +%H:%M:%S)"
done
