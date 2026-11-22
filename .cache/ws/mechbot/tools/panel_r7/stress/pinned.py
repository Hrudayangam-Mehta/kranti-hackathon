#!/usr/bin/env python3
"""Pinned episodes: a travel leg (zone/loot/grab/drop/retreat/hide/isolate/regain/drone/'') commanded |move| > 0.5 in
>= 80% of the frames of a 5 s window while the net displacement over the window stays < 4 m (catches oscillation that
the speed-based stuck metric misses). usage: python3 -I pinned.py <trace glob or dump glob> ..."""
import glob, gzip, json, math, sys, collections
TRAVEL = {'zone', 'loot', 'grab', 'drop', 'retreat', 'hide', 'isolate', 'regain', 'drone', 'hop', ''}
def frames(f):
    d = json.load(gzip.open(f, 'rt')) if f.endswith('.gz') else json.load(open(f))
    return (d['frames'], d.get('seed')) if isinstance(d, dict) else (d, None)
for pat in sys.argv[1:]:
    files = sorted(glob.glob(pat)); tot = 0; eps = []
    for f in files:
        fr, seed = frames(f); tot += 1
        W = 50; i = 0; last_end = -1
        while i + W <= len(fr):
            win = fr[i:i + W]
            if win[-1]['t'] - win[0]['t'] > 5.6: i += 1; continue
            mv = sum(1 for x in win if math.hypot(*x['mv']) > 0.5)
            disp = math.hypot(win[-1]['x'] - win[0]['x'], win[-1]['y'] - win[0]['y'])
            legs = collections.Counter(x.get('lg', '') for x in win)
            lg = legs.most_common(1)[0][0]
            g0, g1 = win[0].get('gl'), win[-1].get('gl')
            gd0 = math.hypot(g0[0] - win[0]['x'], g0[1] - win[0]['y']) if g0 else 0
            gd1 = math.hypot(g1[0] - win[-1]['x'], g1[1] - win[-1]['y']) if g1 else 0
            far = g0 is not None and g1 is not None and gd1 > 8 and gd1 > gd0 - 3 and math.hypot(g1[0] - g0[0], g1[1] - g0[1]) < 6
            if mv >= 0.8 * W and disp < 4 and lg in TRAVEL and far and win[0]['t'] > last_end:
                eps.append((f.split('/')[-1], round(win[0]['t'], 1), round(win[0]['x']), round(win[0]['y']), lg, win[0].get('md'), round(disp, 1), 'goal', g1, round(gd1)))
                last_end = win[-1]['t']; i += W; continue
            i += 5
    print(pat.split('/')[-1], 'files', tot, 'pinned episodes', len(eps))
    for e in eps[:12]: print('   ', e)
