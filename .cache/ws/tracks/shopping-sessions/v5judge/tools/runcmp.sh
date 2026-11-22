#!/bin/bash
# usage: runcmp.sh BIN DATA OUT EXPECTED NCPU [extra env...]
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
PY="$S/kit/venv/bin/python -B"
SC=$S/kit/unz/starter-duckdb/scripts
BIN=$1; DATA=$2; OUT=$3; EXP=$4; N=$5; shift 5
mkdir -p "$OUT"
env DATA_DIR="$DATA" OUTPUT_DIR="$OUT" NCPU="$N" "$@" taskset -c 0-3 "$BIN" > "$OUT.stdout" 2> "$OUT.stderr"
rc=$?
so=$(stat -c %s "$OUT.stdout")
r1=$(cd $SC && $PY compare.py "$OUT" "$EXP" 2>&1 | tail -1)
r2=$(cd $SC && $PY compare.py "$EXP" "$OUT" 2>&1 | tail -1)
fb=$(grep -c 'general path' "$OUT.stderr")
echo "$(basename $BIN) $(basename $DATA) NCPU=$N $* rc=$rc stdout=$so fwd=$r1 rev=$r2 fallback=$fb"
