#!/bin/bash
# usage: p20cmp.sh OUT  -> compare with rel17 p20m5 reference output
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
PY="$S/kit/venv/bin/python -B"
SC=$S/kit/unz/starter-duckdb/scripts
REF=$S/v5gate/rel17_p20m5_out
OUT=$1
echo "$OUT vs rel17 p20m5: $(cd $SC && $PY compare.py $OUT $REF 2>&1 | tail -1) / $(cd $SC && $PY compare.py $REF $OUT 2>&1 | tail -1)"
$PY $S/panel_s/threads/tools/rowdiff.py $OUT $REF
