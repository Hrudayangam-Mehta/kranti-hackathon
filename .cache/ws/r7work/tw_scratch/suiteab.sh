#!/bin/bash
# A/B timing control: the four suites on ckpt_07 (suite07) and ckpt_08 (suite) back to back on core 1, same load
B=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun; T=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch
for s in test_world test_brain test_requests test_counters; do
  for v in suite07 suite; do (cd $T/$v/tools && taskset -c 1 $B $T/$v/tools/$s.js > $T/logs/ab_${v}_$s.txt 2>&1); echo "$v $s rc=$? :: $(grep -E '^[0-9]+/[0-9]+ ' $T/logs/ab_${v}_$s.txt | tail -1 | cut -c1-400)"; done
done
echo SUITEAB_DONE
