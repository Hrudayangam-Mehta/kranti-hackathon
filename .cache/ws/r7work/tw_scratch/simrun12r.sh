#!/bin/bash
# second driver: the candidates in reverse order (c12 -> c07); simtw.sh skips seeds that already have a meta
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch; LIB=$T/v538_08/bot/lib
python3 -I -c "
import json
for tag,k,v in reversed(json.load(open('$T/cands12.json'))[6:]): print(tag + '|' + json.dumps({k: v}, separators=(',', ':')))
" | while IFS='|' read -r tag ov; do [ -f $T/id/$tag/sq1.meta.json ] && continue; TAG=$tag LIB=$LIB TOP="\"fuseMs\":1e9,\"sqOverrides\":$ov" $T/simtw.sh; done
echo SIMRUN12R_DONE
