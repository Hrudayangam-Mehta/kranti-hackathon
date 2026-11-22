#!/bin/bash
# mkmx.sh NAME TABLE16 : variants7/NAME/bot = MX_base with saltTable set; empty dist/
set -e
M=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants7
N=$1; TB=$2
[ ${#TB} -eq 16 ] || { echo "table must be 16 chars"; exit 2; }
mkdir $M/$N; cp -r $M/MX_base $M/$N/bot; mkdir $M/$N/dist
sed -i "s/^  saltTable: '',$/  saltTable: '$TB',/" $M/$N/bot/lib/params.js
grep -q "saltTable: '$TB'," $M/$N/bot/lib/params.js || { echo "table not set"; exit 3; }
echo "$N $TB"
