#!/bin/bash
# runvar.sh <name> <overrides.json|-> [botdir]   -> runs/var/<name>.json + traces
cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/gapwork
name=$1; ov=$2; root=${3:-/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/gapwork}
OUT=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/gapwork/runs/var; mkdir -p $OUT
extra=""; [ "$ov" != "-" ] && extra="--overrides $ov"
cd $root
taskset -c 2,3 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun sim/run.js --bot ours --mode squad --seeds ${SEEDS:-$(seq -s, 1 21)} --jobs 2 --timeout 1000 --map-dir /srv/mech-sparring/_arena --quiet --trace $OUT/traces --trace-tag $name $extra --json $OUT/$name.json > $OUT/$name.txt 2>&1
grep "mean score" $OUT/$name.txt | sed 's/  causes.*//' | sed "s/^/$name: /"
