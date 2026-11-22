#!/bin/bash
# identity batch: TAG=<name> LIB=<lib dir> SELS="DEF KS KB FNV" [EXTRA='"key":"val"'] [OVX='"key":val'] [CORE=n] idb.sh ; output switch/id/<TAG>/
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad
W=$S/fable_work/chaos; P=$S/mechbot
TAG=${TAG:?}; LIB=${LIB:?}; SELS=${SELS:-"DEF KS KB FNV"}; EXTRA=${EXTRA:-}; OVX=${OVX:-}; SET=${SET:-all}
O=$W/id/$TAG; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
declare -A SJ
SJ[DEF]=''
SJ[KS]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on"'
SJ[KB]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70"'
SJ[FNV]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","loseCover":"never","fb":"on"'
ovr() { local s=${SJ[$1]}; [ -n "$EXTRA" ] && { [ -n "$s" ] && s="$s,$EXTRA" || s="$EXTRA"; }; local x='"fuseMs":1e9'; [ "$1" = FNV ] && x="$x,\"salt\":1"; [ -n "$OVX" ] && x="$x,$OVX"; echo "{\"select\":{$s},$x}"; }
STREAMS="kit:$P/kit/check/stream.jsonl.gz l4800:$P/tools/release_gate/long4800.jsonl.gz l11:$P/tools/pass2a/out/long11.jsonl.gz l23p:$P/tools/pass2a/out/long23p.jsonl.gz"
FSTREAMS="kit:$P/kit/check/stream.jsonl.gz f1:$P/tools/check2a/streams/ffa_s1.jsonl.gz f2:$P/tools/check2a/streams/ffa_s2.jsonl.gz f3:$P/tools/check2a/streams/ffa_s3.jsonl.gz f4:$P/tools/check2a/streams/ffa_s4.jsonl.gz"
for sel in $SELS; do
  { if [ $SET != ffa ]; then for s in $STREAMS; do n=${s%%:*}; f=${s#*:}; for e in squad auto; do echo "${sel}_${n}_$e|stream|$f|$e"; done; done
    for sd in 1 2 3 4 5 6; do echo "${sel}_sq$sd|match|$sd|squad"; done; fi
    for s in $FSTREAMS; do n=${s%%:*}; f=${s#*:}; for e in auto ffa; do [ "$n" = kit ] && [ "$e" = auto ] && [ $SET != ffa ] && continue; echo "${sel}_${n}_$e|stream|$f|$e"; done; done
    for sd in 411 412 413 414; do echo "${sel}_ff$sd|match|$sd|ffa"; done; } | while IFS='|' read -r name cmd a1 a2; do
      [ -f $O/$name.meta.json ] && continue
      OVR="$(ovr $sel)" nice -n 19 env $JSC $P/bun $W/tools/recs.js $LIB $cmd $a1 $a2 $O/$name > $O/$name.txt 2>&1 || echo "FAILED $name" >> $O/failures.txt
  done
done
echo "done $TAG" > $O/done.txt
