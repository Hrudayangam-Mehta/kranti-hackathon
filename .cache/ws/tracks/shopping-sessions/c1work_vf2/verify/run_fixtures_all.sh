#!/bin/sh
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2
PY=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/venv/bin/python
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/unz/starter-duckdb/scripts
OUT=$W/runs/fixtures.txt; : > $OUT
cd $S
for cfg in "f2 1 -" "f2 4 -" "f2 8 -" "f2 1 G" "f2 4 G" "f2 2 B6" "f1 4 -" "f1 1 G"; do
  set -- $cfg
  EXTRA=""; [ "$3" = G ] && EXTRA="SESSIONS_LANE=G"; [ "$3" = B6 ] && EXTRA="SESSIONS_TEST_BUCKET_BITS=6"
  echo "== $cfg" >> $OUT
  env TMPDIR=$W/tmp ENG_BIN=$W/bin/$1 NCPU=$2 $EXTRA $PY -B run_fixtures.py ../fixtures -- $W/verify/eng.sh 2>&1 | grep -v '^ok ' >> $OUT
done
echo done >> $OUT
