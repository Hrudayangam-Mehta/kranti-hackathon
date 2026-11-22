#!/bin/sh
D=${1:-$DATA_DIR}; O=${2:-$OUTPUT_DIR}
exec env -i DATA_DIR="$D" OUTPUT_DIR="$O" NCPU=${NCPU:-3} ${ENGBIN:-/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/try/scale/bin/pop}
