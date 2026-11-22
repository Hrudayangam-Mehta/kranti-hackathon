#!/bin/bash
# usage: gate.sh BIN [quick]   full gate: fixtures NCPU 1,4; dev5 NCPU 1,4,8 + slow; rerun non-empty; v4 dev; p20m5 vs afix ref
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
D=$S/v5d; PY="$S/kit/venv/bin/python -B"; K=$S/kit/unz/starter-duckdb
BIN=$1; MODE=${2:-full}; NAME=$(basename $BIN); G=$D/runs/gate_$NAME; rm -rf $G; mkdir -p $G $D/tmp
echo "binary $NAME $(sha256sum $BIN | cut -c1-64) mode $MODE"
cmpboth() { a=$(cd $K/scripts && $PY compare.py $1 $2 | tail -1); b=$(cd $K/scripts && $PY compare.py $2 $1 | tail -1); echo "$a / $b"; }
run() { local data=$1 out=$2; shift 2; env -i DATA_DIR=$data OUTPUT_DIR=$out "$@" nice -n 10 taskset -c 0,1 $BIN > $out.stdout 2> $out.err; echo "exit=$? stdout=$(wc -c < $out.stdout)"; }
if [ "$MODE" = quick ]; then
  r=$(cd $K && TMPDIR=$D/tmp NCPU=4 $PY scripts/run_fixtures.py fixtures -- nice -n 10 taskset -c 0,1 $BIN > $G/fixtures_n4.log 2>&1; tail -1 $G/fixtures_n4.log); echo "fixtures NCPU=4: $r"
  for n in 1 8; do O=$G/dev5_n$n; mkdir -p $O; echo "v5 dev NCPU=$n: $(run $S/v5model/data/dev5 $O NCPU=$n) $(cmpboth $O $S/v5model/kit5/devans/dev-answer)"; done
  exit 0
fi
for n in 1 4; do
  r=$(cd $K && TMPDIR=$D/tmp NCPU=$n $PY scripts/run_fixtures.py fixtures -- nice -n 10 taskset -c 0,1 $BIN > $G/fixtures_n$n.log 2>&1; tail -1 $G/fixtures_n$n.log)
  echo "fixtures NCPU=$n: $r"
done
for n in 1 4 8; do O=$G/dev5_n$n; mkdir -p $O; echo "v5 dev NCPU=$n: $(run $S/v5model/data/dev5 $O NCPU=$n) $(cmpboth $O $S/v5model/kit5/devans/dev-answer)"; done
O=$G/dev5_slow; mkdir -p $O; echo "v5 dev slow NCPU=4: $(run $S/v5model/data/dev5 $O NCPU=4 SESSIONS_PATH=slow) $(cmpboth $O $S/v5model/kit5/devans/dev-answer)"
O=$G/dev5_n4; echo "v5 dev rerun into non-empty NCPU=4 (files before $(ls $O/user_daily | wc -l)): $(run $S/v5model/data/dev5 $O NCPU=4) $(cmpboth $O $S/v5model/kit5/devans/dev-answer) files after $(ls $O/user_daily | wc -l)"
for n in 1 4; do O=$G/dev4_n$n; mkdir -p $O; echo "v4 dev NCPU=$n: $(run $S/kit/data/dev $O NCPU=$n) $(cmpboth $O $S/kit/unz/dev-answer)"; done
for n in 3 8; do O=$G/p20m5_n$n; mkdir -p $O; echo "p20m5 NCPU=$n: $(run $S/v5model/data/p20m5 $O NCPU=$n) vs afix: $(cmpboth $O $D/runs/afix_p20m5_ref)"; $PY $S/panel_s/threads/tools/rowdiff.py $O $D/runs/afix_p20m5_ref; rm -rf $O; done
for c in craft1 craft2 craft_pb empty1 empty2 empty3 repro_emptycamp mini1 min_1_5; do
  data=$S/v5judge/data/$c; [ -d $data ] || continue
  O=$G/craft_$c; mkdir -p $O; R=$G/ref_$c; rm -rf $R
  $PY $S/verify/ref.py $data $R > $G/ref_$c.log 2>&1; rr=$?
  echo "crafted $c: $(run $data $O NCPU=3) ref_rc=$rr $(cmpboth $O $R)"
done
