#!/bin/bash
# usage: weak.sh LABEL BIN
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
J=$S/v5judge; PY="$S/kit/venv/bin/python -B"; SC=$S/kit/unz/starter-duckdb/scripts
L=$1; BIN=$(readlink -f $2)
run() { local name=$1 data=$2 exp=$3 n=$4; local out=$J/vruns/${L}_$name; rm -rf $out; mkdir -p $out
  local t0=$(date +%s.%N); env DATA_DIR=$data OUTPUT_DIR=$out NCPU=$n PATH=/usr/bin:/bin taskset -c 0-3 $BIN > $out.stdout 2> $out.stderr; local rc=$?; local t1=$(date +%s.%N)
  echo "$L $name NCPU=$n: exit=$rc stdout=$(stat -c %s $out.stdout) wall=$(echo "$t1 - $t0" | bc)s $(cd $SC && $PY compare.py $out $exp 2>&1 | tail -1) / $(cd $SC && $PY compare.py $exp $out 2>&1 | tail -1)"; }
for n in 1 4; do run dev5_n$n $S/v5model/data/dev5 $S/v5model/kit5/devans/dev-answer $n; done
for n in 1 4; do run craft1_n$n $J/data/craft1 $J/vruns/craft1_ref $n; done
run repro_n1 $J/data/repro_emptycamp $J/vruns/repro_ref 1
run craftpb_n4 $J/data/craft_pb $J/vruns/craft_pb_ref 4
(cd $SC && env NCPU=4 $PY run_fixtures.py ../fixtures -- taskset -c 0-3 $BIN 2>&1 | tail -1 | sed "s/^/$L fixtures NCPU=4: /")
