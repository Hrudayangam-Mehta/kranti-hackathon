#!/bin/bash
# 24-seed squad sims (salt 1, the 5.38 SELECT = v538_08 own params, fuse off) : base + the 12 top candidates as sqOverrides
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch; LIB=$T/v538_08/bot/lib
TAG=base538 LIB=$LIB TOP='"fuseMs":1e9' $T/simtw.sh
python3 -I -c "
import json,sys
for tag,k,v in json.load(open('$T/cands12.json')): print(tag + '|' + json.dumps({k: v}, separators=(',', ':')))
" | while IFS='|' read -r tag ov; do TAG=$tag LIB=$LIB TOP="\"fuseMs\":1e9,\"sqOverrides\":$ov" $T/simtw.sh; done
echo SIMRUN12_DONE
