#!/bin/bash
# Re-record every recording of a tag whose fuse tripped (a decision > 30 ms on the shared machine), up to TRIES times.
#   TAG=<name> LIB=<lib dir> [EXTRA=...] refuse.sh      (uses the same SELECT table as idbatch.sh)
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
TAG=${TAG:?}; LIB=${LIB:?}; TRIES=${TRIES:-4}; EXTRA=${EXTRA:-}; CORE=${CORE:-0}
O=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch/id/$TAG
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
declare -A SJ
SJ[DEF]=''
SJ[V4]='"retreat":"d3"'
SJ[K0]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std"'
SJ[KS]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on"'
SJ[KB]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70"'
SJ[FILE]=''
SJ[KSF]='"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on","aggr":"any70f","fb":"on"'
ovr() { local s=${SJ[$1]}; if [ -n "$EXTRA" ]; then if [ -n "$s" ]; then s="$s,$EXTRA"; else s="$EXTRA"; fi; fi; if [ -n "$TOP" ]; then echo "{\"select\":{$s},$TOP}"; else echo "{\"select\":{$s}}"; fi; }
for try in $(seq 1 $TRIES); do
  bad=0
  for m in $O/*.meta.json; do
    f=$(python3 -I -c "import json,sys; m=json.load(open(sys.argv[1])); print(m['fuse'], m['cmd'], m['a1'], m['a2'])" $m)
    set -- $f
    [ "$1" = 0 ] && continue
    bad=$((bad+1)); name=$(basename $m .meta.json); sel=${name%%_*}
    OVR="$(ovr $sel)" taskset -c $CORE env $JSC $P/bun $W/tools/rec7.js $LIB $2 $3 $4 $O/$name > $O/$name.txt 2>&1
    echo "try $try re-recorded $name: $(grep -oE '"fuse":[0-9]+' $O/$name.txt | head -1)"
  done
  [ $bad = 0 ] && { echo "no fuse trips left in $TAG"; break; }
done
