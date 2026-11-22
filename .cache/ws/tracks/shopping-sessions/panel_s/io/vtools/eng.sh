#!/bin/sh
D=${1:-$DATA_DIR}; O=${2:-$OUTPUT_DIR}
SCR=$(mktemp -d -p /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/io/vtools/scr)
exec env -i DATA_DIR="$D" OUTPUT_DIR="$O" SCRATCH_DIR="$SCR" HOME="$SCR" NCPU=${NCPU:-4} MEM_GB=24 taskset -c 0,1 ${ENG:-/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/io/bin/io1} 2>"$O.err"
