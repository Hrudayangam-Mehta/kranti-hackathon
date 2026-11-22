#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel19_work
BIN=$1; DATA=$2; OUT=$3; NCPU=$4; shift 4
rm -rf $OUT; mkdir -p $OUT
$S/kit/venv/bin/python -B $W/tools/timed.py $OUT env -i DATA_DIR=$DATA OUTPUT_DIR=$OUT NCPU=$NCPU "$@" nice -n 10 taskset -c 2,3 $BIN
rc=$?
echo "run $(basename $BIN) $(basename $DATA) NCPU=$NCPU $*: exit=$rc stdout_bytes=$(wc -c < $OUT.stdout) files=$(ls $OUT/user_daily | wc -l)/$(ls $OUT/campaign_daily | wc -l) $(cat $OUT.time) | $(grep -E '^buckets (on|off)' $OUT.err | cut -c1-30)"
