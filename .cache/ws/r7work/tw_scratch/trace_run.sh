#!/bin/bash
L=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch/trace07/lib
run() { taskset -c $1 /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch/trace_keys.mjs $L $2 $3 $4 "$5" /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch/trace_out/$6.json > /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch/trace_out/$6.txt 2>&1; }
( run 0 match 1 squad '{"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on"}' m1
  run 0 match 2 squad '{"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","loseCover":"near","finish":"ttkb","isolate":"near"}' m2
  run 0 match 3 squad '{"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","laserGrab":"wide","loseExit":"on","healDoc":"full"}' m3
  run 0 match 4 squad '{"hunt":"h50"}' m4
  run 0 match 411 ffa '{"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","fb":"on"}' f411
  run 0 match 5 squad '{}' m5 ) &
( run 1 match 6 squad '{"retreat":"pulse","laserEcon":"on","focus":"add","seek":"on","io":"all"}' m6
  run 1 match 412 ffa '{}' f412
  run 1 stream /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/check/stream.jsonl.gz auto '{"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on"}' kit
  run 1 stream /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/release_gate/long4800.jsonl.gz squad '{"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on"}' l4800
  run 1 match 7 squad '{"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on","crateGate":"all","aimDwell":"on","openFarm":"d0","R3":"gun"}' m7
  run 1 match 8 squad '{"r3a2":"off","pass2b":"off"}' m8 ) &
wait
echo TRACE_DONE
