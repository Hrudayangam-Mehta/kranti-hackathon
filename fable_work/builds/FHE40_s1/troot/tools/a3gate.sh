#!/bin/bash
# R7a amendment A3 count gate: null results of the campus hop limits (counters.hopOldNull) over sim squad 1-40 and
# FFA 411-414, pocketCfg off (old behaviour). SEL = V4 | KS. Output r7work/id/a3_<SEL>/ and a summary line.
W=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work
P=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
SEL=${SEL:-V4}; LIB=${LIB:-$W/bot/lib}; O=$W/id/a3_$SEL; mkdir -p $O
JSC="BUN_JSC_useFTLJIT=0 BUN_JSC_useConcurrentJIT=1 BUN_JSC_useConcurrentGC=0 BUN_JSC_numberOfGCMarkers=1 BUN_JSC_numberOfBaselineCompilerThreads=1 BUN_JSC_numberOfDFGCompilerThreads=1 BUN_JSC_numberOfFTLCompilerThreads=1 BUN_JSC_minNumberOfWorklistThreads=1 BUN_JSC_maxNumberOfWorklistThreads=1"
case $SEL in
  V4) OV='{"select":{"retreat":"d3"}}';;
  KS) OV='{"select":{"retreat":"d3","laserEcon":"off","laserRange":"far","focus":"mult","farmHp":"90","upg":"std","seek":"on"}}';;
esac
JOBS=$( { for s in $(seq 1 40); do echo "sq$s match $s squad"; done; for s in 411 412 413 414; do echo "ff$s match $s ffa"; done; } )
lane() { local core=$1 idx=$2 k=0
  while read -r name cmd a1 a2; do
    if [ $((k % 2)) -eq $idx ] && [ ! -f $O/$name.meta.json ]; then OVR="$OV" taskset -c $core env $JSC $P/bun $W/tools/rec7.js $LIB $cmd $a1 $a2 $O/$name > $O/$name.txt 2>&1; fi
    k=$((k+1)); done <<< "$JOBS"; }
lane 0 0 & lane 1 1 & wait
python3 -I - "$O" <<'EOF'
import json, glob, sys
tot = 0; hops = 0; fuse = 0; err = 0; n = 0; where = []
for f in sorted(glob.glob(sys.argv[1] + '/*.meta.json')):
    m = json.load(open(f)); c = m.get('counters', {}); n += 1
    k = c.get('hopOldNull', 0); tot += k; hops += c.get('hops', 0); fuse += m['fuse']; err += m['errors']
    if k: where.append((f.split('/')[-1].split('.')[0], k))
print(f"A3 gate {sys.argv[1].split('/')[-1]}: {n} matches, campus-limit null hop plans {tot} {where}, hops made {hops}, fuse {fuse}, errors {err}")
EOF
