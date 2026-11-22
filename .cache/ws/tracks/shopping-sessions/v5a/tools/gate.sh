#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
A=$S/v5a; PY="$S/kit/venv/bin/python -B"; K=$S/kit/unz/starter-duckdb
BIN=$1; NAME=$(basename $BIN); G=$A/runs/gate_$NAME; rm -rf $G; mkdir -p $G $A/tmp
echo "binary $NAME $(sha256sum $BIN | cut -c1-64)"
for n in 1 4; do
  r=$(cd $K && TMPDIR=$A/tmp NCPU=$n $PY scripts/run_fixtures.py fixtures -- nice -n 10 taskset -c 2,3 $BIN > $G/fixtures_n$n.log 2>&1; tail -1 $G/fixtures_n$n.log)
  echo "fixtures NCPU=$n: $r"
done
cmpboth() { a=$(cd $K/scripts && $PY compare.py $1 $2 | tail -1); b=$(cd $K/scripts && $PY compare.py $2 $1 | tail -1); echo "$a / $b"; }
run() { local data=$1 out=$2; shift 2; env -i DATA_DIR=$data OUTPUT_DIR=$out "$@" nice -n 10 taskset -c 2,3 $BIN > $out.stdout 2> $out.err; echo "exit=$? stdout=$(wc -c < $out.stdout)"; }
for n in 1 4 8; do O=$G/dev5_n$n; mkdir -p $O; echo "v5 dev NCPU=$n: $(run $S/v5model/data/dev5 $O NCPU=$n) $(cmpboth $O $S/v5model/kit5/devans/dev-answer)"; done
O=$G/dev5_slow; mkdir -p $O; echo "v5 dev slow NCPU=4: $(run $S/v5model/data/dev5 $O NCPU=4 SESSIONS_PATH=slow) $(cmpboth $O $S/v5model/kit5/devans/dev-answer)"
O=$G/dev5_n4; echo "v5 dev rerun into non-empty NCPU=4 (files before $(ls $O/user_daily | wc -l)): $(run $S/v5model/data/dev5 $O NCPU=4) $(cmpboth $O $S/v5model/kit5/devans/dev-answer) files after $(ls $O/user_daily | wc -l)"
for n in 1 4; do O=$G/dev4_n$n; mkdir -p $O; echo "v4 dev NCPU=$n: $(run $S/kit/data/dev $O NCPU=$n) $(cmpboth $O $S/kit/unz/dev-answer)"; done
O=$G/p20m5; mkdir -p $O; echo "p20m5 NCPU=2: $(run $S/v5model/data/p20m5 $O NCPU=2) vs rel17: $(cmpboth $O $S/v5gate/rel17_p20m5_out)"
$PY $S/panel_s/threads/tools/rowdiff.py $O $S/v5gate/rel17_p20m5_out
rm -rf $O
