#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; W=$S/fable_work/chaos; P=$S/mechbot; cd $W
while [ ! -f qa/lanes.done ]; do sleep 10; done
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
mkdir -p qa/probe qa/conf qa/unit
laneC() {
  for sd in $(seq 1 12); do OVR='{"fuseMs":1e9}' nice -n 19 env $JSC $P/bun qa/probe.js $W/builds/CH1_s1/bot/lib $sd; done > qa/probe/CH1_s1.jsonl 2> qa/probe/CH1_s1.err
  for n in CH1_s1 CH1_s2 CH1_s3 CH1DL_s1 CH1AL_s1 CH1PM_s1; do for m in base v3dir; do nice -n 19 $P/tools/panel_r6/maps/run_check.sh $m $W/builds/$n/dist/bot.js > qa/conf/${n}_$m.txt 2>&1; done; done
}
laneD() {
  for sd in $(seq 1 12); do OVR='{"fuseMs":1e9}' nice -n 19 env $JSC $P/bun qa/probe.js $S/variants6/FNV_s1/bot/lib $sd; done > qa/probe/base.jsonl 2> qa/probe/base.err
  for t in tree tree2; do nice -n 19 $P/bun tools/test_chaos.mjs $W/$t > qa/unit/test_chaos_$t.txt 2>&1; nice -n 19 $P/bun tools/test_switch.mjs $W/$t > qa/unit/test_switch_$t.txt 2>&1; nice -n 19 $P/bun tools/test_tf2.mjs $W/$t > qa/unit/test_tf2_$t.txt 2>&1; done
  nice -n 19 $P/bun tools/test_chaos_r6.mjs $W/tree2 > qa/unit/test_chaos_r6_tree2.txt 2>&1
  for n in CH1_s1 CH1_s2 CH1_s3 CH1DL_s1 CH1AL_s1 CH1PM_s1; do echo "$n $(nice -n 19 env $JSC $P/bun qa/kitms.mjs $W/builds/$n/bot/lib 2>&1 | tail -1)"; done > qa/kitms.txt
  echo "FNV_s1 $(nice -n 19 env $JSC $P/bun qa/kitms.mjs $S/variants6/FNV_s1/bot/lib 2>&1 | tail -1)" >> qa/kitms.txt
}
laneC & laneD & wait; echo done > qa/post.done
