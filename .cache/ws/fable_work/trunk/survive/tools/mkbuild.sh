#!/bin/bash
# mkbuild.sh <name> [key=val ...]: builds/<name>/{bot,dist} = survive/tree (CH1 SELECT, salt 1) + the SELECT entries given,
# bundle, Dockerfile, conformance on base and v3dir (engineer S copy of chaos/tools/mkbuild.sh; SELECT edited in place)
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
SV=$S/fable_work/trunk/survive; P=$S/mechbot; N=$1; shift
D=$SV/builds/$N
[ -e $D ] && { echo "exists $D"; exit 1; }
mkdir -p $D/dist && cp -a $SV/tree $D/bot || exit 1
python3 -I - "$D/bot/lib/params.js" "$@" <<'PY' > $D.mk.txt 2>&1 || { cat $D.mk.txt; exit 1; }
import re, sys
p = sys.argv[1]; s = open(p).read()
a = s.index('export const SELECT = {'); b = s.index('}', s.index('r3a2:', a))
blk = s[a:b]
for kv in sys.argv[2:]:
    k, v = kv.split('=', 1)
    blk, n = re.subn(r"(\b%s: )'[^']*'" % re.escape(k), r"\g<1>'%s'" % v, blk, count=1)
    assert n == 1, ('no key', k)
open(p, 'w').write(s[:a] + blk + s[b:])
print(p, sys.argv[2:])
PY
(cd $D && $P/bun build $D/bot/bot.js --minify --target=bun --outfile $D/dist/bot.js > $D/build.txt 2>&1) || { cat $D/build.txt; exit 1; }
cp $D/bot/Dockerfile $D/dist/Dockerfile
for m in base v3dir; do nice -n 19 $P/tools/panel_r6/maps/run_check.sh $m $D/dist/bot.js > $D/conf_$m.txt 2>&1; echo "$N $m: $(grep -E 'PASS|FAIL' $D/conf_$m.txt | tail -1 | cut -c1-200)"; done
echo "$N sha256 $(sha256sum $D/dist/bot.js | cut -c1-64) bytes $(stat -c %s $D/dist/bot.js)"
