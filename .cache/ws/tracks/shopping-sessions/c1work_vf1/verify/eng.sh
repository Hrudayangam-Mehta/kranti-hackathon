#!/bin/sh
D=${1:-$DATA_DIR}; O=${2:-$OUTPUT_DIR}
SCR=$(mktemp -d -p /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf1/tmp)
EXTRA=""
[ -n "$SESSIONS_LANE" ] && EXTRA="$EXTRA SESSIONS_LANE=$SESSIONS_LANE"
[ -n "$SESSIONS_PATH" ] && EXTRA="$EXTRA SESSIONS_PATH=$SESSIONS_PATH"
[ -n "$SESSIONS_TEST_USER_KEY" ] && EXTRA="$EXTRA SESSIONS_TEST_USER_KEY=$SESSIONS_TEST_USER_KEY"
[ -n "$SESSIONS_TEST_TWIST" ] && EXTRA="$EXTRA SESSIONS_TEST_TWIST=$SESSIONS_TEST_TWIST"
[ -n "$SESSIONS_TEST_GCAP" ] && EXTRA="$EXTRA SESSIONS_TEST_GCAP=$SESSIONS_TEST_GCAP"
[ -n "$SESSIONS_SCALAR" ] && EXTRA="$EXTRA SESSIONS_SCALAR=$SESSIONS_SCALAR"
BIN=${ENG_BIN:-/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf1/bin/sessions}
env -i DATA_DIR="$D" OUTPUT_DIR="$O" SCRATCH_DIR="$SCR" HOME="$SCR" NCPU=${NCPU:-2} MEM_GB=24 $EXTRA taskset -c 0,1 $BIN > $O.stdout 2> $O.stderr
RC=$?
rm -rf "$SCR"
cat $O.stderr >&2
if [ -s $O.stdout ]; then echo "STDOUT_NOT_EMPTY" >&2; exit 97; fi
exit $RC
