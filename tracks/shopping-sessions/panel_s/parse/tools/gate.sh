#!/bin/sh
B=$1
PY=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/venv/bin/python
CMP=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/unz/starter-duckdb/scripts
G=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/run/gate_$(basename $B)
rm -rf $G; mkdir -p $G
echo "binary $B $(sha256sum $B | cut -c1-64)"
for n in 1 4; do
  r=$(cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/unz/starter-duckdb && TMPDIR=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/tmp NCPU=$n $PY -B scripts/run_fixtures.py fixtures -- taskset -c 2,3 $B 2>&1 | tail -1)
  echo "fixtures NCPU=$n: $r"
done
for n in 1 4 8; do
  mkdir -p $G/dev$n
  env -i DATA_DIR=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/data/dev OUTPUT_DIR=$G/dev$n NCPU=$n taskset -c 2,3 $B > $G/dev$n.stdout 2> $G/dev$n.err; rc=$?
  r=$(cd $CMP && $PY -B compare.py $G/dev$n /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/unz/dev-answer | tail -1)
  r2=$(cd $CMP && $PY -B compare.py /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/unz/dev-answer $G/dev$n | tail -1)
  echo "dev NCPU=$n: exit=$rc stdout_bytes=$(wc -c < $G/dev$n.stdout) $r / $r2"
done
