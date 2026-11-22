#!/bin/bash
# mkt.sh <name> [table16]: trunk/builds/<name>/{bot,dist} = trunk tree (+ saltTable baked as variants7/mkmx.sh does), bundle, Dockerfile,
# conformance on base and v3dir (as chaos/tools/mkbuild.sh, without its SELECT step: the trunk tree already holds the FNV SELECT, salt 1)
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/fable_work/trunk/trunk; P=$S/mechbot; N=$1; TB=$2
D=$W/builds/$N
[ -e $D ] && { echo "exists $D"; exit 1; }
mkdir -p $D/dist; cp -a $W/tree $D/bot
if [ -n "$TB" ]; then
  [ ${#TB} -eq 16 ] || { echo "table must be 16 chars"; exit 2; }
  sed -i "s/^  saltTable: '',$/  saltTable: '$TB',/" $D/bot/lib/params.js
  grep -q "^  saltTable: '$TB',$" $D/bot/lib/params.js || { echo "table not set"; exit 3; }
fi
(cd $D && nice -n 19 $P/bun build $D/bot/bot.js --minify --target=bun --outfile $D/dist/bot.js > $D/build.txt 2>&1) || { cat $D/build.txt; exit 1; }
cp $D/bot/Dockerfile $D/dist/Dockerfile
for m in base v3dir; do nice -n 19 $P/tools/panel_r6/maps/run_check.sh $m $D/dist/bot.js > $D/conf_$m.txt 2>&1; echo "$N $m: $(grep -E 'PASS|FAIL' $D/conf_$m.txt | tail -1 | cut -c1-200)"; done
echo "$N table '$TB' sha256 $(sha256sum $D/dist/bot.js | cut -c1-64) bytes $(stat -c %s $D/dist/bot.js)"
