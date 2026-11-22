#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; W=$S/fable_work/switch; cd $W
lane() { for n in "$@"; do case $n in
  DEFref) qa/idq.sh def_ck07 $S/r7work/ckpt_07_LG/lib '{"fuseMs":1e9}';;
  DEFtree) qa/idq.sh def_tree $W/tree/lib '{"fuseMs":1e9}';;
  *) qa/idq.sh b_$n $W/builds/SW_${n}_s1/bot/lib '{"fuseMs":1e9}';; esac; done; }
lane PM UTtgt DL UF FUwork DEFref > qa/lane1.log 2>&1 &
lane ID UT DLidle UTwait DEFtree > qa/lane2.log 2>&1 &
wait; echo ALLDONE > qa/lanes.done
