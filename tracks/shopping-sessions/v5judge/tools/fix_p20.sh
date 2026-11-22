#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions; J=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5judge; PY="$S/kit/venv/bin/python -B"; SC=$S/kit/unz/starter-duckdb/scripts
for b in A B; do for n in 1 4; do
  (cd $SC && env NCPU=$n $PY run_fixtures.py ../fixtures -- taskset -c 0-3 $J/bin/$b > $J/logs/fixtures_${b}_n$n.log 2>&1)
  echo "fixtures $b NCPU=$n: $(tail -1 $J/logs/fixtures_${b}_n$n.log) (FAIL lines: $(grep -c FAIL $J/logs/fixtures_${b}_n$n.log))"
done; done
$J/tools/p20cmp.sh $J/runs/ab_A
$J/tools/p20cmp.sh $J/runs/ab_B
out=$J/runs/A_p20m5_n2; rm -rf $out; mkdir -p $out
env DATA_DIR=$S/v5model/data/p20m5 OUTPUT_DIR=$out NCPU=2 PATH=/usr/bin:/bin taskset -c 0-3 $J/bin/A > $out.stdout 2> $out.stderr
echo "A p20m5 NCPU=2 fresh: exit=$? stdout=$(stat -c %s $out.stdout)"
$J/tools/p20cmp.sh $out
