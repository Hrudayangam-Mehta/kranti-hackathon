#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
W=$S/rel19_work
R=$W/runs/full
BIN=$W/bin/rel19
echo "== 20M"
$W/tools/bigrun.sh $W/bin/rel16 $S/m1data/p20m $R/p20_rel16 2
$W/tools/cmp2.sh $R/p20_n2 $R/p20_rel16
$W/tools/bigrun.sh $BIN $S/m1data/p20m $R/p20_n8 8
$W/tools/cmp2.sh $R/p20_n8 $R/p20_rel16
rm -rf $R/p20_n8
echo "== 60M"
$W/tools/bigrun.sh $W/bin/rel16 $S/m1data/p60m $R/p60_rel16 2
$W/tools/cmp2.sh $R/p60_n2 $R/p60_rel16
echo "== done"
