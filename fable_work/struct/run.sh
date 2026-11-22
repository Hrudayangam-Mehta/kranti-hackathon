#!/bin/bash
# usage: run.sh <simdir> <ovname> <seed0> <n> <tag>
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; W=$S/fable_work/struct
cd $W/$1 && nice -n 19 $S/mechbot/bun sim/run.js --bot ours --mode squad --matches $4 --seed $3 --jobs 1 --overrides $W/ov/$2.json --json $W/out/$5.json > $W/out/$5.txt 2>&1
