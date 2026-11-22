#!/bin/bash
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad; W=$S/fable_work/chaos; cd $W
FNV='"laserRange":"far","healExit":"70","farmHp":"90","strafe":"d4","ffaPair":"on","beamClue":"off","gunlessClue":"off","idlePull":"off","env":"auto","ffaCounters":"on","ffaRules":"on","aimDwell":"off","R1":"on","crateGate":"ffa","R2":"on","R3":"on","aimCal":"off","openFarm":"on","cxFinish":"on","cxKiterRamp":"on","cxBrawler":"off","ffaThirdFix":"on","ffaBreakFix":"on","hidePlanCap":"on","pass2b":"on","fightEarly":"on","laserEcon":"off","focus":"mult","retreat":"d3","boost":"spend","upg":"std","ffaDropGate":"on","finalPoint":"on","ffaTwo":"on","ffaThree":"on","ffaGate":"on","hunt":"off","seek":"on","aggr":"any70f","r3a2":"on","pocketCfg":"on","io":"v4","ioMerge":"on","loseExit":"off","loseCover":"never","oneHit":"off","fightOn":"off","finish":"off","isolate":"any","seekCrowd":"off","laserGrab":"std","anchorCfg":"on","warmPocket":"on","fb":"on","healDoc":"off","fuse":"wall","dropLife":"off","util":"off","pauseMove":"off","isoDwell":"off","upgFix":"off","cubes":"off","boostCharge":"off","cratePath":"std","alpha":"off"'
old() { echo "{\"select\":{$FNV$1},\"salt\":${2:-1},\"fuseMs\":1e9}"; }
B='{"fuseMs":1e9}'
laneA() {
  qa/idq.sh ref $S/variants6/FNV_s1/bot/lib "$B"
  qa/idq.sh old_tree $W/tree/lib "$(old)"
  qa/idq.sh old_tree2 $W/tree2/lib "$(old)"
  qa/idq.sh b_CH1_s1 $W/builds/CH1_s1/bot/lib "$B"
  for s in 2 3; do qa/idq.sh ref_s$s $S/variants6/FNV_s$s/bot/lib "$B" ffa8; qa/idq.sh b_CH1_s$s $W/builds/CH1_s$s/bot/lib "$B" ffa8; done
  for v in focus:kill laserGrab:spawn cubes:snow laserRange:midsq boostCharge:on; do qa/idq.sh p_${v%%:*} $W/tree2/lib "$(old ",\"${v%%:*}\":\"${v#*:}\"")" ffa8; done
}
laneB() {
  qa/idq.sh b_CH1DL_s1 $W/builds/CH1DL_s1/bot/lib "$B"
  qa/idq.sh b_CH1AL_s1 $W/builds/CH1AL_s1/bot/lib "$B"
  qa/idq.sh b_CH1PM_s1 $W/builds/CH1PM_s1/bot/lib "$B"
  for v in farmHp:50sq cratePath:80 upg:laser alpha:on strafe:fast75 upgFix:on; do qa/idq.sh p_${v%%:*} $W/tree2/lib "$(old ",\"${v%%:*}\":\"${v#*:}\"")" ffa8; done
}
laneA > qa/laneA.log 2>&1 &
laneB > qa/laneB.log 2>&1 &
wait; echo ALLDONE > qa/lanes.done
