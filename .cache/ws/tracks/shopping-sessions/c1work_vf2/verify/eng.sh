#!/bin/sh
D=${1:-$DATA_DIR}; O=${2:-$OUTPUT_DIR}
SCR=$(mktemp -d -p /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/tmp)
EXTRA=$(env | grep '^SESSIONS_' | tr '\n' ' ')
BIN=${ENG_BIN:-/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/c1work_vf2/bin/f2}
env -i DATA_DIR="$D" OUTPUT_DIR="$O" SCRATCH_DIR="$SCR" HOME="$SCR" NCPU=${NCPU:-2} MEM_GB=24 $EXTRA taskset -c 0,1 $BIN > $O.stdout 2> $O.stderr
RC=$?
rm -rf "$SCR"
cat $O.stderr >&2
if [ -s $O.stdout ]; then echo "STDOUT_NOT_EMPTY" >&2; exit 97; fi
exit $RC
