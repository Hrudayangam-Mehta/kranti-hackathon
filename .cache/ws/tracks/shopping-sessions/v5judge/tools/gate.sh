#!/bin/bash
# usage: gate.sh LABEL BIN
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
J=$S/v5judge
PY="$S/kit/venv/bin/python -B"
SC=$S/kit/unz/starter-duckdb/scripts
L=$1; BIN=$(readlink -f $2)
DEV5=$S/v5model/data/dev5; DEV5ANS=$S/v5model/kit5/devans/dev-answer
DEV4=$S/kit/data/dev; DEV4ANS=$S/kit/unz/dev-answer
echo "binary $L $(sha256sum $BIN | cut -d' ' -f1)"
for n in 1 4; do
  r=$(cd $SC && env PATH=/usr/bin:/bin NCPU=$n $PY run_fixtures.py ../fixtures -- taskset -c 0-3 $BIN 2>&1 | tail -1)
  echo "fixtures NCPU=$n: $r"
done
run() { # run NAME DATA EXPECTED NCPU [envs...]
  local name=$1 data=$2 exp=$3 n=$4; shift 4
  local out=$J/runs/${L}_$name
  rm -rf $out $out.stdout $out.stderr; mkdir -p $out
  env DATA_DIR=$data OUTPUT_DIR=$out NCPU=$n PATH=/usr/bin:/bin "$@" taskset -c 0-3 $BIN > $out.stdout 2> $out.stderr
  local rc=$? so=$(stat -c %s $out.stdout)
  local r1=$(cd $SC && $PY compare.py $out $exp 2>&1 | tail -1) r2=$(cd $SC && $PY compare.py $exp $out 2>&1 | tail -1)
  echo "$name NCPU=$n $*: exit=$rc stdout=$so $r1 / $r2"
}
for n in 1 3 4 8; do run dev5_n$n $DEV5 $DEV5ANS $n; done
run dev5_slow_n4 $DEV5 $DEV5ANS 4 SESSIONS_PATH=slow
out=$J/runs/${L}_dev5_n4; before=$(ls $out/user_daily $out/campaign_daily | wc -l)
env DATA_DIR=$DEV5 OUTPUT_DIR=$out NCPU=4 PATH=/usr/bin:/bin taskset -c 0-3 $BIN > $out.stdout2 2> $out.stderr2; rc=$?
after=$(ls $out/user_daily $out/campaign_daily | wc -l)
echo "dev5 rerun into non-empty NCPU=4 (files before $before after $after): exit=$rc stdout=$(stat -c %s $out.stdout2) $(cd $SC && $PY compare.py $out $DEV5ANS 2>&1 | tail -1) / $(cd $SC && $PY compare.py $DEV5ANS $out 2>&1 | tail -1)"
for n in 1 4; do run dev4_n$n $DEV4 $DEV4ANS $n; done
