#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel19_work
BIN=$1
R=$W/runs/full
mkdir -p $R
echo "== 20M"
[ -f $R/p20_rel16/.ok ] || { $W/tools/bigrun.sh $W/bin/rel16 $S/m1data/p20m $R/p20_rel16 2 && touch $R/p20_rel16/.ok; }
$W/tools/bigrun.sh $BIN $S/m1data/p20m $R/p20_n2 2
$W/tools/cmp2.sh $R/p20_n2 $R/p20_rel16
grep -E "^(buckets  |multi|sessions )" $R/p20_n2.err
$W/tools/bigrun.sh $BIN $S/m1data/p20m $R/p20_n8 8
$W/tools/cmp2.sh $R/p20_n8 $R/p20_rel16
rm -rf $R/p20_n8
echo "== 60M"
[ -f $R/p60_rel16/.ok ] || { $W/tools/bigrun.sh $W/bin/rel16 $S/m1data/p60m $R/p60_rel16 2 && touch $R/p60_rel16/.ok; }
$W/tools/bigrun.sh $BIN $S/m1data/p60m $R/p60_n2 2
$W/tools/cmp2.sh $R/p60_n2 $R/p60_rel16
grep -E "^(buckets  |multi|sessions )" $R/p60_n2.err
echo "== done"
