#!/bin/sh
# run the engineer binary with container-like env; args DATA OUT (or env)
D=${1:-$DATA_DIR}; O=${2:-$OUTPUT_DIR}
SCR=$(mktemp -d)
exec env -i DATA_DIR="$D" OUTPUT_DIR="$O" SCRATCH_DIR="$SCR" HOME="$SCR" NCPU=${NCPU:-2} MEM_GB=24 taskset -c 2,3 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/verify/bin/sessions
