#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
REF=$S/v5gate/rel17_p20m5_out
O=$1
a=$(cd $K/scripts && $PY compare.py $O $REF | tail -1)
b=$(cd $K/scripts && $PY compare.py $REF $O | tail -1)
c=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $O $REF | tail -1)
d=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $REF $O | tail -1)
echo "p20m5 vs rel17: compare $a / $b; rowdiff $c / $d"
