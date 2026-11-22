"""Engagement distance over time: episodes of shots at the same mech (gaps <= 2 s)."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
by_s = collections.defaultdict(list)
for o in G:
    if o['tgt'] is not None and o['tgt'] < 100: by_s[o['s']].append((o['tf'], o['tgt']))
eps = []
for s, lst in by_s.items():
    lst.sort(); cur = None
    for (t, c) in lst:
        if cur and cur['c'] == c and t - cur['t1'] <= 40: cur['t1'] = t; cur['n'] += 1
        else:
            cur = {'s': s, 'c': c, 't0': t, 't1': t, 'n': 1}; eps.append(cur)
def dist(a, b, t):
    pa = R.pos(a, t); pb = R.pos(b, t)
    return math.dist(pa, pb) if pa and pb else None
print('episodes', len(eps), 'duration s: p50 %.1f p75 %.1f p90 %.1f max %.1f' % tuple(pct([(e['t1'] - e['t0']) * TICK for e in eps], q) for q in (.5, .75, .9, 1)))
rows = []
for ty in ['ALL'] + TYPES:
    g = [e for e in eps if (ty == 'ALL' or R.names[e['s']] == ty) and e['t1'] - e['t0'] >= 60]
    row = [ty, len(g), median([dist(e['s'], e['c'], e['t0']) for e in g]) if g else float('nan')]
    for dt in (60, 120, 200):
        ch = [dist(e['s'], e['c'], e['t0'] + dt) - dist(e['s'], e['c'], e['t0']) for e in g if e['t1'] - e['t0'] >= dt and dist(e['s'], e['c'], e['t0'] + dt) is not None]
        row.append('%+.0f m (n=%d)' % (median(ch), len(ch)) if ch else 'n/a')
    ends = [dist(e['s'], e['c'], e['t1']) for e in g]
    row.append(median([x for x in ends if x is not None]) if g else float('nan'))
    rows.append(row)
print(table(['type', 'episodes >= 3 s', 'median distance at first shot', 'median change after 3 s', 'after 6 s', 'after 10 s', 'median distance at last shot'], rows))
# ALL episodes: start vs end distance
allr = [(dist(e['s'], e['c'], e['t0']), dist(e['s'], e['c'], e['t1'])) for e in eps if e['t1'] > e['t0']]
allr = [x for x in allr if x[0] is not None and x[1] is not None]
print('all multi-shot episodes: n %d ; closer at the end in %.0f%% ; median start %.0f m, median end %.0f m' % (len(allr), 100.0 * sum(1 for a, b in allr if b < a) / len(allr), median([a for a, b in allr]), median([b for a, b in allr])))
