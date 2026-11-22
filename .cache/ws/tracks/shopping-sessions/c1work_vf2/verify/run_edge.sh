#!/bin/sh
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2
PY=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/kit/venv/bin/python
cd $W/verify
mkdir -p runs
ENG_BIN=$W/bin/f2 NCPU=2 $PY -B edge.py > $W/runs/edge_f2_default.txt 2>&1
ENG_BIN=$W/bin/f2 NCPU=2 SESSIONS_LANE=G $PY -B edge.py > $W/runs/edge_f2_laneG.txt 2>&1
ENG_BIN=$W/bin/f2 NCPU=1 $PY -B edge.py > $W/runs/edge_f2_n1.txt 2>&1
ENG_BIN=$W/bin/f2 NCPU=8 $PY -B edge.py > $W/runs/edge_f2_n8.txt 2>&1
ENG_BIN=$W/bin/f2 NCPU=3 SESSIONS_TEST_BUCKET_BITS=6 $PY -B edge.py > $W/runs/edge_f2_b6.txt 2>&1
ENG_BIN=$W/bin/f1 NCPU=2 $PY -B edge.py > $W/runs/edge_f1_default.txt 2>&1
echo done > $W/runs/edge.done
