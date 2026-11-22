#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
V=$S/v5c_verify
PY="$S/kit/venv/bin/python -B"
K=$S/kit/unz/starter-duckdb
BIN=$1
NAME=$(basename $BIN)
G=$V/runs/gate_$NAME
mkdir -p $G
REF=$S/v5gate/rel17_p20m5_out
echo "=== p20m5 $NAME $(sha256sum $BIN | cut -c1-64) $(date -u +%H:%M:%S)"
echo "--- p20m5 NCPU=2 (fresh dir)"
O=$G/p20m5; rm -rf $O; mkdir -p $O
t0=$(date +%s.%N)
env -i DATA_DIR=$S/v5model/data/p20m5 OUTPUT_DIR=$O NCPU=2 nice -n 10 taskset -c 2,3 $BIN > $O.stdout 2> $O.err; rc=$?
t1=$(date +%s.%N)
echo "exit=$rc stdout_bytes=$(wc -c < $O.stdout) wall=$(echo "$t1 - $t0" | bc) files=$(ls $O/user_daily | wc -l)/$(ls $O/campaign_daily | wc -l)"
grep -E 'copies|surviving|sessions|prefixes' $O.err
a=$(cd $K/scripts && $PY compare.py $O $REF | tail -1); b=$(cd $K/scripts && $PY compare.py $REF $O | tail -1)
c=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $O $REF | tail -1); d=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $REF $O | tail -1)
echo "p20m5 vs rel17 ref: compare $a / $b; rowdiff $c / $d"
echo "--- rerun into the non-empty folder (stale parquet copies + junk + dotfiles + symlink + subdir), NCPU=8"
cp $O/user_daily/$(ls $O/user_daily | head -1) $O/user_daily/stale-zzz.parquet
cp $O/campaign_daily/$(ls $O/campaign_daily | head -1) $O/campaign_daily/stale-zzz.parquet
echo junk > $O/user_daily/zz.txt; echo junk > $O/campaign_daily/_junk.parquet; touch $O/user_daily/.hidden; mkdir -p $O/user_daily/subdir; echo x > $O/user_daily/subdir/a.parquet
ln -s /etc/hostname $O/campaign_daily/link.parquet
echo "before rerun: user_daily $(ls -a $O/user_daily | wc -l) entries, campaign_daily $(ls -a $O/campaign_daily | wc -l) entries"
env -i DATA_DIR=$S/v5model/data/p20m5 OUTPUT_DIR=$O NCPU=8 nice -n 10 taskset -c 2,3 $BIN > $O.stdout2 2> $O.err2; echo "exit=$? stdout_bytes=$(wc -c < $O.stdout2) files=$(ls $O/user_daily | grep -c parquet)/$(ls $O/campaign_daily | grep -c parquet)"
echo "leftovers user_daily: $(ls -a $O/user_daily | grep -v -E '^part|^\.$|^\.\.$' | tr '\n' ' ') | campaign_daily: $(ls -a $O/campaign_daily | grep -v -E '^part|^\.$|^\.\.$' | tr '\n' ' ')"
rm -f $O/campaign_daily/link.parquet; rm -rf $O/user_daily/subdir
a=$(cd $K/scripts && $PY compare.py $O $REF | tail -1); b=$(cd $K/scripts && $PY compare.py $REF $O | tail -1)
c=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $O $REF | tail -1); d=$(cd $S/panel_s/threads/tools && $PY rowdiff.py $REF $O | tail -1)
echo "rerun p20m5 vs rel17 ref: compare $a / $b; rowdiff $c / $d"
grep -E 'copies|surviving|sessions|prefixes' $O.err2
rm -rf $O
echo "=== p20m5 done $(date -u +%H:%M:%S)"
