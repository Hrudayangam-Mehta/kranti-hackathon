#!/bin/sh
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
K=$S/kit; G=$K/build/generator/target/release/generate; B=${BIN:-$S/m1tools/bin/sessions}
W=$S/m1data/diff; mkdir -p $W
for spec in "$@"; do
  seed=${spec%%:*}; rest=${spec#*:}; events=${rest%%:*}; clicks=${rest#*:}
  d=$W/s$seed-$events; rm -rf $d $W/out_rust $W/out_ref
  taskset -c 2,3 $G --seed $seed --events $events --clicks $clicks --threads 2 --output $d >/dev/null 2>&1 || { echo "gen fail $spec"; continue; }
  mkdir -p $W/out_rust
  DATA_DIR=$d OUTPUT_DIR=$W/out_rust NCPU=2 taskset -c 2,3 $B 2>$W/rust.log || { echo "rust fail $spec"; cat $W/rust.log; continue; }
  taskset -c 2,3 $K/venv/bin/python $S/m1tools/reference.py $d $W/out_ref || { echo "ref fail $spec"; continue; }
  ws=$(python3 -c "import json;print(json.load(open('$d/manifest.json'))['window_start'][:10])")
  res=$(cd $K/unz/starter-duckdb && $K/venv/bin/python scripts/compare.py $W/out_rust $W/out_ref | tr '\n' ' ' | grep -o 'user_daily: rows [0-9]* vs [0-9]*\|campaign_daily: rows [0-9]* vs [0-9]*\|MATCH\|DIFFER' | tr '\n' ' ')
  echo "seed $seed events $events clicks $clicks window $ws: $res"
  case "$res" in *MATCH*) rm -rf $d;; esac
done
