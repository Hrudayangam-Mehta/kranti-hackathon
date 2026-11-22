#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel19_work
BIN=$1
R=$W/runs/full
mkdir -p $R
echo "== fixtures and dev"
$W/tools/gate.sh $BIN "1 4" "1 4 8"
$W/tools/gate.sh $BIN "8" "" SESSIONS_SCALAR=1
$W/tools/gate.sh $BIN "" "1 8" SESSIONS_F2=0
$W/tools/gate.sh $BIN "" "2" SESSIONS_LANE=G
$W/tools/gate.sh $BIN "" "1 4" SESSIONS_SCALAR=1
$W/tools/gate.sh $BIN "" "4" SESSIONS_PATH=slow
$W/tools/gate.sh $BIN "" "8" SESSIONS_TEST_BUCKET_BITS=6
$W/tools/rerun.sh $BIN
echo "== 20M"
[ -f $R/p20_rel16/.ok ] || { $W/tools/bigrun.sh $W/bin/rel16 $S/m1data/p20m $R/p20_rel16 2 && touch $R/p20_rel16/.ok; }
$W/tools/bigrun.sh $BIN $S/m1data/p20m $R/p20_n2 2
$W/tools/cmp2.sh $R/p20_n2 $R/p20_rel16
$W/tools/bigrun.sh $BIN $S/m1data/p20m $R/p20_n8 8
$W/tools/cmp2.sh $R/p20_n8 $R/p20_rel16
grep -E "^(buckets  |multi|sessions )" $R/p20_n2.err
rm -rf $R/p20_n8
echo "== seeds"
BIN=$BIN CONFIGS="NCPU=1;NCPU=3;NCPU=8;NCPU=2,SESSIONS_TEST_BUCKET_BITS=8" $S/kit/venv/bin/python -B $W/tools/seeds.py check s2481:2481:1000000:250000 s2793:2793:300000:75000 s537:537:50000:500000 s1372:1372:300000:1200000 s15:15:600000:150000 s62:62:500000:125000 s101:101:200000:400000 s3:3:1000000:250000 s9001:9001:400000:100000 s4242:4242:500000:125000
echo "== 60M"
[ -f $R/p60_rel16/.ok ] || { $W/tools/bigrun.sh $W/bin/rel16 $S/m1data/p60m $R/p60_rel16 2 && touch $R/p60_rel16/.ok; }
$W/tools/bigrun.sh $BIN $S/m1data/p60m $R/p60_n2 2
$W/tools/cmp2.sh $R/p60_n2 $R/p60_rel16
grep -E "^(buckets  |multi|sessions )" $R/p60_n2.err
echo "== done"
