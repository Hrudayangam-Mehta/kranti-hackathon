#!/bin/sh
D=${1:-$DATA_DIR}; O=${2:-$OUTPUT_DIR}
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel18_work
BIN=${ENG_BIN:-$W/bin/rel18}
SCR=$(mktemp -d -p "$W/tmp/scr")
nice -n 10 taskset -c 2,3 env -i DATA_DIR="$D" OUTPUT_DIR="$O" SCRATCH_DIR="$SCR" HOME="$SCR" NCPU="${NCPU:-4}" MEM_GB=24 \
  ${SESSIONS_F2:+SESSIONS_F2=$SESSIONS_F2} ${SESSIONS_PATH:+SESSIONS_PATH=$SESSIONS_PATH} \
  "$BIN" >"$O.stdout" 2>"$O.err"
rc=$?
rmdir "$SCR" 2>/dev/null
exit $rc
