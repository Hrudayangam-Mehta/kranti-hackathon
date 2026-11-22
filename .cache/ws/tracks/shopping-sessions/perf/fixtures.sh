#!/bin/sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
B=${BIN:-$S/perf/bin/sessions}
cd $S/kit/unz/starter-duckdb && NCPU=${NCPU:-2} $S/kit/venv/bin/python -B scripts/run_fixtures.py fixtures -- taskset -c 2,3 $B 2>&1 | tail -3
