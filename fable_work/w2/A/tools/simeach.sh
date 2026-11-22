#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; A=$S/fable_work/w2/A
for p in "$@"; do k=${p%%:*}; v=${p#*:}; $A/tools/sim.sh ${k}_$v $A/tree/lib "\"$k\":\"$v\""; done
