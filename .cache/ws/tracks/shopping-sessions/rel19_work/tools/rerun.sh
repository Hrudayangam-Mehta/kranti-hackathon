#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel19_work
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
BIN=$1
NAME=$(basename $BIN)
O=$W/runs/rerun_$NAME
rm -rf $O; mkdir -p $O
env -i DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$O NCPU=8 nice -n 10 taskset -c 2,3 $BIN > $O.1.stdout 2> $O.1.err; r1=$?
f1="$(ls $O/user_daily | wc -l)/$(ls $O/campaign_daily | wc -l)"
echo note > $O/user_daily/notes.txt; mkdir -p $O/user_daily/sub.parquet; echo x > $O/campaign_daily/_SUCCESS
env -i DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$O NCPU=1 nice -n 10 taskset -c 2,3 $BIN > $O.2.stdout 2> $O.2.err; r2=$?
a=$(cd $K/scripts && $PY compare.py $O $S/kit/unz/dev-answer | tail -1)
b=$(cd $K/scripts && $PY compare.py $S/kit/unz/dev-answer $O | tail -1)
echo "rerun $NAME: NCPU8 exit=$r1 files $f1, then NCPU1 into same dir exit=$r2 stdout=$(cat $O.1.stdout $O.2.stdout | wc -c) entries after: user_daily [$(ls $O/user_daily | tr '\n' ' ')] campaign_daily [$(ls $O/campaign_daily | tr '\n' ' ')] -> $a / $b"
