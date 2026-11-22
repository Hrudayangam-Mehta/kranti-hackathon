#!/bin/sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
K=$S/kit; G=$K/build/generator/target/release/generate; B=${BIN:-$S/m1tools/bin/sessions}
W=$S/m1data/fuzz; mkdir -p $W
for seed in "$@"; do
  events=$(( 20000 + (seed * 7919) % 60000 )); clicks=$(( events / 2 ))
  rm -rf $W/gen $W/mut $W/out_rust $W/out_ref
  taskset -c 2,3 $G --seed $seed --events $events --clicks $clicks --threads 2 --output $W/gen >/dev/null 2>&1 || { echo "gen fail $seed"; continue; }
  python3 $S/m1tools/mutate.py $W/gen $W/mut $seed || { echo "mutate fail $seed"; continue; }
  mkdir -p $W/out_rust
  DATA_DIR=$W/mut OUTPUT_DIR=$W/out_rust NCPU=2 taskset -c 2,3 $B 2>$W/rust.log || { echo "rust fail $seed"; cat $W/rust.log; continue; }
  taskset -c 2,3 $K/venv/bin/python $S/m1tools/reference.py $W/mut $W/out_ref || { echo "ref fail $seed"; continue; }
  res=$(cd $K/unz/starter-duckdb && $K/venv/bin/python scripts/compare.py $W/out_rust $W/out_ref | tr '\n' ' ' | grep -o 'user_daily: rows [0-9]* vs [0-9]*\|campaign_daily: rows [0-9]* vs [0-9]*\|MATCH\|DIFFER' | tr '\n' ' ')
  echo "fuzz seed $seed events $events: $res"
  case "$res" in *DIFFER*) cp -r $W/mut $W/keep-$seed;; esac
done
