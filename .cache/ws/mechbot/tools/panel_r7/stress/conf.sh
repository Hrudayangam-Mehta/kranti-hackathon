#!/bin/sh
# conformance: both shipped bundles on the 11 transformed maps of panel R6 and on the edge-case streams (one at a time, core 2)
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot; W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r7/stress; M=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r6/maps; V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants6
mkdir -p $W/out/conf
for b in S_s1 KS; do
  for n in base mirx miry rot90 tr300 lift40 zs070 zs130 zt070 wide v3dir; do
    flock $W/core2.lock $W/conf_one.sh $M/$n/stream.jsonl.gz $M/$n $V/$b/dist/bot.js > $W/out/conf/${b}_map_$n.txt 2>&1
  done
  K=$P/kit/check/stream.jsonl.gz; S=$W/streams
  flock $W/core2.lock $W/conf_one.sh $K $W/maps/empty $V/$b/dist/bot.js > $W/out/conf/${b}_nomap_empty.txt 2>&1
  flock $W/core2.lock $W/conf_one.sh $K /nonexistent/arena $V/$b/dist/bot.js > $W/out/conf/${b}_nomap_missing.txt 2>&1
  flock $W/core2.lock $W/conf_one.sh $S/files_v3.jsonl.gz $M/v3dir $V/$b/dist/bot.js > $W/out/conf/${b}_files_v3.txt 2>&1
  flock $W/core2.lock $W/conf_one.sh $S/files_level.jsonl.gz $W/maps/level $V/$b/dist/bot.js > $W/out/conf/${b}_files_level.txt 2>&1
  flock $W/core2.lock $W/conf_one.sh $S/files_flat.jsonl.gz $W/maps/flat $V/$b/dist/bot.js > $W/out/conf/${b}_files_flat.txt 2>&1
  flock $W/core2.lock $W/conf_one.sh $S/files_none.jsonl.gz $P/kit/arena $V/$b/dist/bot.js > $W/out/conf/${b}_files_none.txt 2>&1
  for s in hz30 dec1 budget20 budget12 hello3s mechs24; do
    flock $W/core2.lock $W/conf_one.sh $S/$s.jsonl.gz $P/kit/arena $V/$b/dist/bot.js > $W/out/conf/${b}_cfg_$s.txt 2>&1
  done
  echo "conf $b $(date -u +%H:%M:%S)"
done
