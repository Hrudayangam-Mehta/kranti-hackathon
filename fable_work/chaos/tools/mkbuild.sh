#!/bin/bash
# mkbuild.sh <name> [key=val ...]: builds/<name>/{bot,dist} = tree + 5.38 SELECT + salt 1 (+ the preset), bundle, Dockerfile, conformance
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/fable_work/chaos; P=$S/mechbot; N=$1; shift
D=$W/builds/$N
[ -e $D ] && { echo "exists $D"; exit 1; }
python3 -I $S/variants_tools/mkvar.py $W/${SRC:-tree} $D ${SALT:-1} laserRange=far farmHp=90 laserEcon=off focus=mult retreat=d3 upg=std seek=on aggr=any70f loseCover=never fb=on "$@" > $D.mk.txt 2>&1 || { cat $D.mk.txt; exit 1; }
(cd $D && $P/bun build $D/bot/bot.js --minify --target=bun --outfile $D/dist/bot.js > $D/build.txt 2>&1) || { cat $D/build.txt; exit 1; }
cp $D/bot/Dockerfile $D/dist/Dockerfile
for m in base v3dir; do nice -n 19 $P/tools/panel_r6/maps/run_check.sh $m $D/dist/bot.js > $D/conf_$m.txt 2>&1; echo "$N $m: $(grep -E 'PASS|FAIL' $D/conf_$m.txt | tail -1 | cut -c1-200)"; done
echo "$N sha256 $(sha256sum $D/dist/bot.js | cut -c1-64) bytes $(stat -c %s $D/dist/bot.js)"
