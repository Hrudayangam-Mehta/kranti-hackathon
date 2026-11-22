#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/v5c
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
BIN=$1
NAME=$(basename $BIN)
G=$W/runs/full_$NAME
mkdir -p $G
echo "=== fullgate $NAME $(sha256sum $BIN | cut -c1-64) $(date -u +%H:%M:%S)"
$W/tools/gate.sh $BIN "1 4" "1 4 8" v5
$W/tools/gate.sh $BIN "" "2" v5 SESSIONS_PATH=slow
$W/tools/gate.sh $BIN "" "1 4" v4
echo "--- p20m5 NCPU=2 (fresh dir)"
O=$G/p20m5; rm -rf $O; mkdir -p $O
env -i DATA_DIR=$S/v5model/data/p20m5 OUTPUT_DIR=$O NCPU=2 nice -n 10 taskset -c 2,3 $BIN > $O.stdout 2> $O.err; echo "exit=$? stdout_bytes=$(wc -c < $O.stdout)"; grep -E 'copies|surviving|sessions' $O.err
$W/tools/p20cmp.sh $O
echo "--- rerun into the non-empty folder with junk, NCPU=8"
echo junk > $O/user_daily/zz.txt; echo junk > $O/campaign_daily/_junk.parquet; touch $O/user_daily/.hidden
env -i DATA_DIR=$S/v5model/data/p20m5 OUTPUT_DIR=$O NCPU=8 nice -n 10 taskset -c 2,3 $BIN > $O.stdout2 2> $O.err2; echo "exit=$? stdout_bytes=$(wc -c < $O.stdout2) leftovers: $(ls -a $O/user_daily | grep -v parquet | tr '\n' ' ') $(ls -a $O/campaign_daily | grep -v -E '^part' | tr '\n' ' ')"
$W/tools/p20cmp.sh $O
rm -rf $O
echo "--- crafted IDs"
$PY $W/tools/craft.py $BIN 2>&1 | grep -E '^craft_|CRASH' | cut -c1-110
echo "--- v5 seeds vs ref.py"
$PY $W/tools/seeds.py $BIN s249feb:249:1000000:400000:2 s272feb:272:200000:100000:4 s11:11:1000000:200000:3 s1234clicks:1234:400000:2000000:2 s5tiny:5:1000:1000:2 s99fewclicks:99:50000:10:1 s2027:2027:300000:300000:1 s4242:4242:800000:50000:8
echo "=== done $(date -u +%H:%M:%S)"
