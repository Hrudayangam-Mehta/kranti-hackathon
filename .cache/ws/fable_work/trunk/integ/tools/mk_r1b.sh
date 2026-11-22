#!/bin/bash
# mk_r1b.sh <name> <table16>: trunk/r1b/<name>/{bot,dist} = merged tree with variantTable baked (architecture 1.5 sed), bun bundle
# (--minify --target=bun), Dockerfile from the FNV dist (variants6/FNV_s1/dist). No conformance here (conf_r1b.sh).
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
F=$S/fable_work/trunk; BUN=$S/mechbot/bun; N=$1; TB=$2
D=$F/r1b/$N
[ -e $D ] && { echo "exists $D"; exit 1; }
[ ${#TB} -eq 16 ] || { echo "table must be 16 chars"; exit 2; }
mkdir -p $D/dist; cp -a $F/trunk/merged $D/bot
sed -i "s/^  variantTable: '',$/  variantTable: '$TB',/" $D/bot/lib/params.js
[ "$(grep -c "^  variantTable: '$TB',$" $D/bot/lib/params.js)" = 1 ] || { echo "table not set"; exit 3; }
[ "$(grep -c "^  saltTable: '',$" $D/bot/lib/params.js)" = 1 ] || { echo "saltTable not empty"; exit 4; }
(cd $D && nice -n 19 $BUN build $D/bot/bot.js --minify --target=bun --outfile $D/dist/bot.js > $D/build.txt 2>&1) || { cat $D/build.txt; exit 1; }
cp $S/variants6/FNV_s1/dist/Dockerfile $D/dist/Dockerfile
echo "$N table '$TB' sha256 $(sha256sum $D/dist/bot.js | cut -c1-64) bytes $(stat -c %s $D/dist/bot.js) dockerfile $(sha256sum $D/dist/Dockerfile | cut -c1-16)"
