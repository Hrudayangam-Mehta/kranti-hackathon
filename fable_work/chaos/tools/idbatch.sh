#!/bin/bash
# R7a identity batch: record one lib under several SELECTs on the R3a2 identity set (kit / long4800 / long11 / long23p x
# squad / auto, sim squad 1-6) and the FFA-inert set (kit + check2a ffa_s1-4 x auto / forced ffa, sim FFA 411-414).
#   TAG=<name> LIB=<lib dir> SELS="DEF V4 K0" [EXTRA='"key":"val"'] [SET=all|ffa|r3a2] [SEEDS="1 2 3 4 5 6"] idbatch.sh
# Output: r7work/id/<TAG>/<SEL>_<src>.{jsonl,meta.json,txt}. Lanes: one process per core on cores 0 and 1 (CORES).
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
TAG=${TAG:?}; LIB=${LIB:?}; SELS=${SELS:-"DEF V4 K0"}; SET=${SET:-all}; CORES=${CORES:-"0 1"}; EXTRA=${EXTRA:-}
O=$W/id/$TAG; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
declare -A SJ
SJ[DEF]=''
SJ[V4]='"retreat":"d3"'
SJ[K0]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std"'
SJ[KS]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on"'
SJ[KB]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70"'
ovr() { local s=${SJ[$1]}; if [ -n "$EXTRA" ]; then if [ -n "$s" ]; then s="$s,$EXTRA"; else s="$EXTRA"; fi; fi; echo "{\"select\":{$s}}"; }
STREAMS="kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz"
FSTREAMS="kit:$P/kit/check/stream.jsonl.gz f1:$P/tools/check2a/streams/ffa_s1.jsonl.gz f2:$P/tools/check2a/streams/ffa_s2.jsonl.gz f3:$P/tools/check2a/streams/ffa_s3.jsonl.gz f4:$P/tools/check2a/streams/ffa_s4.jsonl.gz"
jobs_for() {
  local sel=$1
  if [ "$SET" = all ] || [ "$SET" = r3a2 ]; then
    for s in $STREAMS; do n=${s%%:*}; f=${s#*:}; for e in squad auto; do echo "${sel}_${n}_$e|stream|$f|$e"; done; done
    for sd in ${SEEDS:-1 2 3 4 5 6}; do echo "${sel}_sq$sd|match|$sd|squad"; done
  fi
  if [ "$SET" = all ] || [ "$SET" = ffa ]; then
    for s in $FSTREAMS; do n=${s%%:*}; f=${s#*:}; for e in auto ffa; do [ "$n" = kit ] && [ "$e" = auto ] && [ "$SET" = all ] && continue; echo "${sel}_${n}_$e|stream|$f|$e"; done; done
    for sd in 411 412 413 414; do echo "${sel}_ff$sd|match|$sd|ffa"; done
  fi
}
ALL=$(for sel in $SELS; do jobs_for $sel; done)
NL=$(echo $CORES | wc -w)
lane() {
  local core=$1 idx=$2 k=0
  while IFS='|' read -r name cmd a1 a2; do
    if [ $((k % NL)) -eq $idx ] && [ ! -f $O/$name.meta.json ]; then
      sel=${name%%_*}
      OVR="$(ovr $sel)" taskset -c $core env $JSC $P/bun $W/tools/rec7.js $LIB $cmd $a1 $a2 $O/$name > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt
    fi
    k=$((k+1))
  done <<< "$ALL"
}
i=0; for core in $CORES; do lane $core $i & i=$((i+1)); done; wait
echo "$(echo "$ALL" | wc -l) jobs done for $TAG" > $O/done.txt
cat $O/done.txt
