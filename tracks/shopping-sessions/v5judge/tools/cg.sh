#!/bin/bash
J=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5judge
D=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/v5model/data/dev5
for b in rel17 A B; do
  rm -rf $J/runs/cg_$b; mkdir -p $J/runs/cg_$b
  env DATA_DIR=$D OUTPUT_DIR=$J/runs/cg_$b NCPU=1 PATH=/usr/bin:/bin taskset -c 0-3 valgrind --tool=cachegrind --cache-sim=no --cachegrind-out-file=$J/cg/$b.out $J/bin/$b > $J/cg/$b.stdout 2> $J/cg/$b.err
  echo "$b rc=$? stdout=$(stat -c %s $J/cg/$b.stdout) $(grep -E 'I +refs' $J/cg/$b.err)"
done
