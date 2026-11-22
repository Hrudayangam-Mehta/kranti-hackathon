#!/bin/bash
# mk_p26all.sh : variants7/P26_all/bot = MX_p26 with saltTable '1111111111111111' and SELECT prof 'p26'; empty dist/
set -e
V=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants7
rm -rf $V/P26_all; mkdir $V/P26_all; cp -r $V/MX_p26 $V/P26_all/bot; mkdir $V/P26_all/dist
rm -f $V/P26_all/bot/lib/*.orig
sed -i "s/^  saltTable: '',$/  saltTable: '1111111111111111',/" $V/P26_all/bot/lib/params.js
sed -i "s/fb: 'on', healDoc: 'off', prof: 'off' }/fb: 'on', healDoc: 'off', prof: 'p26' }/" $V/P26_all/bot/lib/params.js
grep -q "saltTable: '1111111111111111'," $V/P26_all/bot/lib/params.js || { echo "table not set"; exit 3; }
grep -q "healDoc: 'off', prof: 'p26' }" $V/P26_all/bot/lib/params.js || { echo "prof not set"; exit 3; }
echo "P26_all ready"
