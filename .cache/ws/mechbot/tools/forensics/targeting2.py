"""Target selection refinement: candidates restricted to what the shooter could plausibly see
(geometric LOS and inside its 120 deg wedge at some frame in the previous 1 s, or within 45 m)."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
hits_on = collections.defaultdict(list)
for h in R.events:
    if h['e'] == 'hit' and h['dst'] < 100 and h['src'] is not None and h['src'] < 100: hits_on[h['dst']].append(h)
def seen(a, b, t):
    for tt in range(t, max(0, t - 22), -4):
        pa = R.pos(a, tt); pb = R.pos(b, tt); ra = R.row(a, tt)
        if not pa or not pb or not ra: continue
        d = math.dist(pa, pb)
        if d > 200: continue
        off = abs(angdiff(ra[MYAW], math.atan2(pb[1] - pa[1], pb[0] - pa[0])))
        if d > 45 and off > math.radians(60): continue
        if W.los(pa[0], pa[1], pa[2] + 8, pb[0], pb[1], pb[2] + 4.5) >= 1.0 or W.los(pa[0], pa[1], pa[2] + 8, pb[0], pb[1], pb[2] + 9) >= 1.0: return True
    return False
by_s = collections.defaultdict(list)
for o in G:
    if o['tgt'] is not None: by_s[o['s']].append(o)
runs = []
for s, lst in by_s.items():
    lst.sort(key=lambda o: o['tf']); prev = None
    for o in lst:
        if prev is None or prev['tgt'] != o['tgt'] or o['tf'] - prev['tf'] > 100:
            if o['tgt'] < 100: runs.append((s, o['tgt'], o['tf']))
        prev = o
st = collections.Counter(); ex = []
for (s, c, t) in runs:
    E = t - 1; ps = R.pos(s, E)
    cand = []
    for m in R.ids:
        if m == s or not R.alive(m, E): continue
        if m == c or seen(s, m, E):
            r = R.row(m, E)
            lh = max([h['t'] for h in hits_on[s] if h['src'] == m and 0 <= E - h['t'] <= 100] or [-1])
            cand.append((math.dist(ps, R.pos(m, E)), m, r[MHP], lh))
    if len(cand) < 2: st['single candidate'] += 1; continue
    st['multi'] += 1
    cand.sort()
    if cand[0][1] == c: st['nearest'] += 1
    if min(cand, key=lambda x: x[2])[1] == c: st['lowest_hp'] += 1
    att = [x for x in cand if x[3] >= 0]
    if att:
        st['has_attacker'] += 1
        if max(att, key=lambda x: x[3])[1] == c: st['last_attacker'] += 1
        if cand[0][1] != max(att, key=lambda x: x[3])[1]:
            st['conflict'] += 1
            if cand[0][1] == c: st['conflict_nearest'] += 1
            elif max(att, key=lambda x: x[3])[1] == c: st['conflict_attacker'] += 1
    st['baseline_sum'] += 1.0 / len(cand)
    if cand[0][1] != c: ex.append((s, R.names[s], t, c, [(round(d), m, hp, lh) for d, m, hp, lh in cand]))
print(dict(st))
m = st['multi']
print('new-target decisions with >= 2 plausible candidates: %d ; chose nearest %.0f%% ; chose lowest HP %.0f%% ; random baseline %.0f%%' % (m, 100.0 * st['nearest'] / m, 100.0 * st['lowest_hp'] / m, 100.0 * st['baseline_sum'] / m))
print('with a recent attacker among candidates: %d ; chose the last attacker %.0f%% ; nearest != last attacker in %d cases -> nearest %d, attacker %d' % (st['has_attacker'], 100.0 * st['last_attacker'] / max(1, st['has_attacker']), st['conflict'], st['conflict_nearest'], st['conflict_attacker']))
print('not-nearest examples (shooter, type, tick, chosen, [(dist, id, hp, last_hit_tick)]):')
for e in ex[:12]: print('  ', e)
