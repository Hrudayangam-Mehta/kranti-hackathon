# python3 firstdiff.py <tagA> <tagB> : per source, first differing decision / tick, the number of differing decisions,
# and whether the first difference is the trigger decision (first foreign death or the zone-late radius of tag A's stream).
import json, sys, os
V = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch/vfy'
A, B = sys.argv[1], sys.argv[2]
jobs = "kit_squad kit_auto l4800_squad l4800_auto l11_squad l11_auto l23p_squad l23p_auto sq1 sq2 sq3 sq4 sq5 sq6 kit_ffa f1_auto f1_ffa f2_auto f2_ffa f3_auto f3_ffa f4_auto f4_ffa ff411 ff412 ff413 ff414".split()
same = 0
for j in jobs:
    fa, fb = f'{V}/id/{A}/{j}', f'{V}/id/{B}/{j}'
    if not os.path.exists(fa + '.meta.json') or not os.path.exists(fb + '.meta.json'): print(j, 'MISSING'); continue
    X = open(fa + '.jsonl').read().split('\n'); Y = open(fb + '.jsonl').read().split('\n')
    ma = json.load(open(fa + '.meta.json'))
    d = [i for i in range(min(len(X), len(Y))) if X[i] != Y[i]]
    if not d and len(X) == len(Y): same += 1; continue
    i = d[0] if d else min(len(X), len(Y))
    tick = json.loads(X[i])['tick'] if i < len(X) and X[i] else None
    print(f"{j:12s} first diff decision {i} tick {tick}; differing decisions {len(d)} (n {len(X)-1} vs {len(Y)-1}); A firstForeign tick {ma['firstForeignTick']} latch {ma['latchTick']} flips {ma['counters'].get('twFlips')}")
print(f'{A} vs {B}: {same}/{len(jobs)} identical')
