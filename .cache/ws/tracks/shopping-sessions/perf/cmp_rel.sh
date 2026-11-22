#!/bin/sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
for b in m2_stage rel15; do
  O=$S/perf/tmp/o20_$b; rm -rf $O; mkdir -p $O
  env -i DATA_DIR=$S/m1data/p20m OUTPUT_DIR=$O NCPU=2 taskset -c 2,3 $S/perf/bin/$b > $O.stdout 2> $O.stderr; rc=$?
  r=$(cd $S/kit/unz/starter-duckdb && $S/kit/venv/bin/python -B scripts/compare.py $O $S/perf/out20_m1 2>&1 | tail -1)
  echo "$b exit=$rc stdout_bytes=$(wc -c < $O.stdout) compare: $r"
  rm -rf $O $O.stdout $O.stderr
done
cd $S/perf && QUIET=25 python3 ab.py 5 m2_stage rel15 rel1
echo AB_DONE
