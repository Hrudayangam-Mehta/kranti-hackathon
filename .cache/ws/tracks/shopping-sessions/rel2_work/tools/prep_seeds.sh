#!/bin/sh
# prep_seeds.sh EVENTS seed:clicks ... : generate datasets under rel2_work/gate/sSEED and ref.py answers under sSEED_ref
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
G=$S/rel2_work/gate
GEN=$S/kit/build/generator/target/release/generate
PY=$S/kit/venv/bin/python
EV=$1; shift
for spec in "$@"; do
  seed=${spec%%:*}; ck=${spec##*:}
  (
  rm -rf $G/s$seed $G/s${seed}_ref
  $GEN --seed $seed --events $EV --clicks $ck --output $G/s$seed --threads 1 >/dev/null 2>&1
  t0=$(date +%s)
  $PY -B $S/verify/ref.py $G/s$seed $G/s${seed}_ref >/dev/null 2>$G/s${seed}_ref.log && echo "ref s$seed ok $(( $(date +%s) - t0 ))s $(cat $G/s$seed/manifest.json | tr -d '\n ')" || echo "ref s$seed FAIL"
  ) &
done
wait
