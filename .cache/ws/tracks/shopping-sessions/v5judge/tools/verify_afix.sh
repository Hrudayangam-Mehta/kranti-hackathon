#!/bin/bash
J=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5judge; S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
$J/tools/gate.sh Afix $J/bin/Afix
$J/tools/attack2.sh Afix $J/bin/Afix
out=$J/runs/Afix_p20m5_n2; rm -rf $out; mkdir -p $out
env DATA_DIR=$S/v5model/data/p20m5 OUTPUT_DIR=$out NCPU=2 PATH=/usr/bin:/bin taskset -c 0-3 $J/bin/Afix > $out.stdout 2> $out.stderr
echo "Afix p20m5 NCPU=2 fresh: exit=$? stdout=$(stat -c %s $out.stdout)"; $J/tools/p20cmp.sh $out
out=$J/runs/B_p20m5_n2; rm -rf $out; mkdir -p $out
env DATA_DIR=$S/v5model/data/p20m5 OUTPUT_DIR=$out NCPU=2 PATH=/usr/bin:/bin taskset -c 0-3 $J/bin/B > $out.stdout 2> $out.stderr
echo "B p20m5 NCPU=2 fresh: exit=$? stdout=$(stat -c %s $out.stdout)"; $J/tools/p20cmp.sh $out
BINS="Afix=$J/bin/Afix" NCPUS=1,4,8 CORES=0-3 PAR=2 python3 $J/tools/seeds.py fx1160:1160:300000:75000 fx999:999:1000:100 fx543:543:200000:300000
while pgrep -f build_chain.sh > /dev/null; do sleep 5; done
python3 $J/tools/ab.py $S/v5model/data/p20m5 3 2,4 0-3 rel17=$J/bin/rel17 B=$J/bin/B Afix=$J/bin/Afix > $J/logs/ab_p20m5_afix.log 2>&1
rm -rf $J/runs/cg_Afix; mkdir -p $J/runs/cg_Afix
env DATA_DIR=$S/v5model/data/dev5 OUTPUT_DIR=$J/runs/cg_Afix NCPU=1 PATH=/usr/bin:/bin taskset -c 0-3 valgrind --tool=cachegrind --cache-sim=no --cachegrind-out-file=$J/cg/Afix.out $J/bin/Afix > $J/cg/Afix.stdout 2> $J/cg/Afix.err
echo "cachegrind Afix rc=$? $(grep -E 'I +refs' $J/cg/Afix.err)"
