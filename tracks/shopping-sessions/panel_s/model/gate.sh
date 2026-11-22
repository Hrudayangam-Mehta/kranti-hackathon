#!/bin/sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
M=$S/panel_s/model
PY=$S/kit/venv/bin/python
SC=$S/kit/unz/starter-duckdb/scripts
BIN=$M/bin/probe_a
G=$M/gate
mkdir -p $G
echo "== binary $(sha256sum $BIN)"
for n in 1 4; do
  SCR=$(mktemp -d -p $G/scr)
  echo "== fixtures NCPU=$n (SCRATCH_DIR set)"
  (cd $SC && env SCRATCH_DIR=$SCR NCPU=$n $PY -B run_fixtures.py ../fixtures -- taskset -c 0,1 $BIN 2>&1 | tail -2)
  echo "rehearsal dirs: $(ls $SCR)"
done
for n in 1 4 8; do
  SCR=$(mktemp -d -p $G/scr)
  O=$G/dev_n$n; rm -rf $O; mkdir -p $O
  env -i DATA_DIR=$S/kit/data/dev OUTPUT_DIR=$O SCRATCH_DIR=$SCR HOME=$SCR NCPU=$n MEM_GB=24 taskset -c 0,1 $BIN >$G/dev_n$n.stdout 2>$G/dev_n$n.err
  st=$?
  echo "== dev NCPU=$n exit $st stdout_bytes $(wc -c <$G/dev_n$n.stdout) setups $(grep -c '^setup' $G/dev_n$n.err) rehearsal_files $(ls $SCR/rehearsal0/user_daily $SCR/rehearsal1/user_daily 2>/dev/null | grep -c parquet)"
  (cd $SC && $PY -B compare.py $O $S/kit/unz/dev-answer | tail -1)
done
SCR=$(mktemp -d -p $G/scr)
O=$G/p20m; rm -rf $O; mkdir -p $O
env -i DATA_DIR=$M/data/p20m OUTPUT_DIR=$O SCRATCH_DIR=$SCR HOME=$SCR NCPU=2 MEM_GB=24 taskset -c 0,1 $BIN >$G/p20m.stdout 2>$G/p20m.err
echo "== 20M exit $? stdout_bytes $(wc -c <$G/p20m.stdout) setups $(grep -c '^setup' $G/p20m.err)"
R=$G/p20m_rel16; rm -rf $R; mkdir -p $R
env -i DATA_DIR=$M/data/p20m OUTPUT_DIR=$R NCPU=2 MEM_GB=24 taskset -c 0,1 $M/bin/rel16 >/dev/null 2>$G/p20m_rel16.err
echo "rel16 exit $?"
(cd $SC && $PY -B compare.py $O $R | tail -1 && $PY -B compare.py $R $O | tail -1)
echo "== seeds"
$PY -B $M/vtools/seeds.py s11:11:300000:75000 s101:101:200000:400000 s303:303:100000:25000 s7:7:500000:125000 s62:62:1000000:250000 s15:15:600000:150000
rm -rf $G/scr/*
