#!/bin/sh
D=${1:-$DATA_DIR}; O=${2:-$OUTPUT_DIR}
SCR=$(mktemp -d -p /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work/run/scr)
exec env -i DATA_DIR="$D" OUTPUT_DIR="$O" SCRATCH_DIR="$SCR" HOME="$SCR" NCPU=${NCPU:-2} MEM_GB=24 ${SESSIONS_LANE:+SESSIONS_LANE=$SESSIONS_LANE} ${SESSIONS_TEST_USER_KEY:+SESSIONS_TEST_USER_KEY=$SESSIONS_TEST_USER_KEY} ${SESSIONS_TEST_TWIST:+SESSIONS_TEST_TWIST=$SESSIONS_TEST_TWIST} ${SESSIONS_TEST_GCAP:+SESSIONS_TEST_GCAP=$SESSIONS_TEST_GCAP} taskset -c 0,1 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work/target/x86_64-unknown-linux-gnu/release/sessions 2>"$O.err"
