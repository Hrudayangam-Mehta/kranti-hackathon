#!/bin/sh
# Generate the 6 gate datasets (300k events) and their ref.py answers once.
T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
G=$T/try/scale/gate
GEN=$T/kit/build/generator/target/release/generate
PY=$T/kit/venv/bin/python
mkdir -p $G
for spec in 311:75000 312:150000 15:60000 62:90000 413:30000 514:300000; do
  seed=${spec%%:*}; ck=${spec##*:}
  (
  rm -rf $G/s$seed $G/s${seed}_ref
  $GEN --seed $seed --events 300000 --clicks $ck --output $G/s$seed --threads 1 >/dev/null 2>&1
  $PY -B $T/verify/ref.py $G/s$seed $G/s${seed}_ref >/dev/null 2>$G/s${seed}_ref.log && echo "ref s$seed ok" || echo "ref s$seed FAIL"
  ) &
done
wait
