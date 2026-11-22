#!/bin/bash
# verifier gate for one binary: fixtures, dev5, dev4, slow path, p20m5 vs rel17 reference output, rerun into non-empty folder
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
V=$S/v5c_verify
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
BIN=$1
NAME=$(basename $BIN)
G=$V/runs/gate_$NAME
mkdir -p $G $V/tmp
echo "=== gate $NAME $(sha256sum $BIN | cut -c1-64) $(date -u +%H:%M:%S)"
for n in 1 4; do
  r=$(cd $K && env TMPDIR=$V/tmp NCPU=$n $PY scripts/run_fixtures.py fixtures -- nice -n 10 taskset -c 2,3 $BIN > $G/fixtures_n$n.log 2>&1; tail -1 $G/fixtures_n$n.log)
  echo "fixtures NCPU=$n: $r"
done
run_dev() {
  local SET=$1 n=$2 EXTRA=$3
  if [ "$SET" = v5 ]; then DATA=$S/v5model/data/dev5; ANS=$S/v5model/kit5/devans/dev-answer; else DATA=$S/kit/data/dev; ANS=$S/kit/unz/dev-answer; fi
  local O=$G/dev_${SET}_n${n}${EXTRA:+_$EXTRA}
  rm -rf $O; mkdir -p $O
  env -i DATA_DIR=$DATA OUTPUT_DIR=$O NCPU=$n $EXTRA nice -n 10 taskset -c 2,3 $BIN > $O.stdout 2> $O.err; rc=$?
  a=$(cd $K/scripts && $PY compare.py $O $ANS | tail -1)
  b=$(cd $K/scripts && $PY compare.py $ANS $O | tail -1)
  echo "dev $SET NCPU=$n $EXTRA: exit=$rc stdout_bytes=$(wc -c < $O.stdout) files=$(ls $O/user_daily | wc -l)/$(ls $O/campaign_daily | wc -l) $a / $b"
  rm -rf $O
}
for n in 1 3 4 8; do run_dev v5 $n; done
run_dev v5 2 SESSIONS_PATH=slow
run_dev v5 1 SESSIONS_PATH=slow
run_dev v5 1 SESSIONS_SCALAR=1
for n in 1 4; do run_dev v4 $n; done
echo "--- p20m5 NCPU=2 (fresh dir)"
REF=$S/v5gate/rel17_p20m5_out
O=$G/p20m5; rm -rf $O; mkdir -p $O
/usr/bin/time -f "wall %e user %U sys %S maxrss %M KB" -o $O.time env -i DATA_DIR=$S/v5model/data/p20m5 OUTPUT_DIR=$O NCPU=2 nice -n 10 taskset -c 2,3 $BIN > $O.stdout 2> $O.err; echo "exit=$? stdout_bytes=$(wc -c < $O.stdout) $(cat $O.time)"
grep -E 'copies|surviving|sessions|prefixes' $O.err
a=$(cd $K/scripts && $PY compare.py $O $REF | tail -1); b=$(cd $K/scripts && $PY compare.py $REF $O | tail -1)
c=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $O $REF | tail -1); d=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $REF $O | tail -1)
echo "p20m5 vs rel17 ref: compare $a / $b; rowdiff $c / $d"
echo "--- rerun into the non-empty folder (stale parquet + junk + dotfiles), NCPU=8"
cp $O/user_daily/$(ls $O/user_daily | head -1) $O/user_daily/stale-zzz.parquet
cp $O/campaign_daily/$(ls $O/campaign_daily | head -1) $O/campaign_daily/stale-zzz.parquet
echo junk > $O/user_daily/zz.txt; echo junk > $O/campaign_daily/_junk.parquet; touch $O/user_daily/.hidden; mkdir -p $O/user_daily/subdir; echo x > $O/user_daily/subdir/a.parquet
ln -s /etc/hostname $O/campaign_daily/link.parquet
before_u=$(ls $O/user_daily | wc -l)
env -i DATA_DIR=$S/v5model/data/p20m5 OUTPUT_DIR=$O NCPU=8 nice -n 10 taskset -c 2,3 $BIN > $O.stdout2 2> $O.err2; echo "exit=$? stdout_bytes=$(wc -c < $O.stdout2)"
echo "leftovers user_daily: $(ls -a $O/user_daily | grep -v -E '^part|^\.$|^\.\.$' | tr '\n' ' ') | campaign_daily: $(ls -a $O/campaign_daily | grep -v -E '^part|^\.$|^\.\.$' | tr '\n' ' ')"
a=$(cd $K/scripts && $PY compare.py $O $REF | tail -1); b=$(cd $K/scripts && $PY compare.py $REF $O | tail -1)
c=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $O $REF | tail -1); d=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $REF $O | tail -1)
echo "rerun p20m5 vs rel17 ref: compare $a / $b; rowdiff $c / $d"
rm -rf $O
echo "=== gate done $(date -u +%H:%M:%S)"
