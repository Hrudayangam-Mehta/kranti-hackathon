"""Sections 3/4: reaction to being hit (turn, return fire, movement), retreat by HP, regen episodes."""
import sys, os, math, collections, json, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
hits = [e for e in R.events if e['e'] == 'hit' and e['dst'] < 100 and e['src'] is not None and e['src'] < 100 and e['src'] != e['dst']]
shots_by = collections.defaultdict(list)
for o in G:
    if o['tgt'] is not None and o['tgt'] < 100: shots_by[o['s']].append((o['tf'], o['tgt']))
for s in shots_by: shots_by[s].sort()
# other weapon uses also count as "attacking": zaps, lasers, mortar hits -> use hit events as proxy for attack on X
att_by = collections.defaultdict(list)   # (V) -> list of (t, X)
for h in hits: att_by[h['dst']].append((h['t'], h['src'], h['w'], h['amt'], bool(h.get('rear'))))
def engaged(s, tick):
    lst = shots_by.get(s)
    if not lst: return None
    i = bisect.bisect_right(lst, (tick, 999)) - 1
    if i >= 0 and tick - lst[i][0] <= 40 and R.alive(lst[i][1], tick): return lst[i][1]
    return None
def bearing(a, b, t):
    pa = R.pos(a, t); pb = R.pos(b, t)
    if not pa or not pb: return None
    return math.atan2(pb[1] - pa[1], pb[0] - pa[0])
# ---------------- attack onsets
ons = []
last = {}
for h in hits:
    key = (h['dst'], h['src'])
    if key not in last or h['t'] - last[key] > 100:
        ons.append(h)
    last[key] = h['t']
print('attack onsets (first hit by X on V after >=5 s without hits from X):', len(ons))
recs = []
for h in ons:
    V, X, t0 = h['dst'], h['src'], h['t']
    te = t0 - (t0 % 2)            # frame at/before
    rv = R.row(V, te)
    if not rv: continue
    b = bearing(V, X, te)
    if b is None: continue
    pv = R.pos(V, te); px = R.pos(X, te); d = math.dist(pv, px)
    off = abs(angdiff(rv[MYAW], b))
    in_fov = off <= math.radians(60) or d <= 45
    eng = engaged(V, te)
    # turn response
    turn = None
    for t in range(te, min(te + 200, R.end_tick), 2):
        r = R.row(V, t)
        if not r or not R.alive(X, t): break
        bb = bearing(V, X, t)
        if abs(angdiff(r[MYAW], bb)) <= math.radians(10):
            turn = (t - t0) * TICK; break
    # return fire
    ret = None
    for (tf, tg) in shots_by.get(V, []):
        if tf >= t0 and tg == X:
            ret = (tf - t0) * TICK; break
        if tf > t0 + 200: break
    # how long did X keep hitting V
    seq = [a for a in att_by[V] if a[1] == X and t0 <= a[0] <= t0 + 200]
    dur = (max(a[0] for a in seq) - t0) * TICK
    # movement before/after
    def mv(ta, tb):
        sp = []; bo = 0; air = 0; n = 0
        for t in range(ta, tb, 2):
            a = R.row(V, t); c = R.row(V, t + 2)
            if a and c:
                sp.append(math.hypot(c[MX] - a[MX], c[MY] - a[MY]) / 0.1); bo += 1 if c[MFL] & 2 else 0; air += 0 if c[MFL] & 1 else 1; n += 1
        return (mean(sp) if sp else float('nan'), bo / n if n else float('nan'), air / n if n else float('nan'))
    before = mv(te - 20, te); after = mv(te, te + 20)
    recs.append({'V': V, 'X': X, 'type': R.names[V], 't0': t0, 'd': d, 'off_deg': math.degrees(off), 'in_fov': in_fov, 'eng': eng, 'turn': turn, 'ret': ret, 'dur': dur, 'n_hits': len(seq),
                 'sp_b': before[0], 'sp_a': after[0], 'bo_b': before[1], 'bo_a': after[1], 'air_b': before[2], 'air_a': after[2], 'w': h['w'], 'rear': bool(h.get('rear')),
                 'died': R.death_tick.get(V) is not None and R.death_tick[V] <= t0 + 200})
def summarize(g, label):
    if not g: return [label, 0] + ['n/a'] * 7
    tr = [r['turn'] for r in g if r['turn'] is not None]; rt = [r['ret'] for r in g if r['ret'] is not None]
    return [label, len(g), 100.0 * len(tr) / len(g), median(tr) if tr else float('nan'), pct(tr, .9) if tr else float('nan'), 100.0 * len(rt) / len(g), median(rt) if rt else float('nan'), pct(rt, .9) if rt else float('nan'), median([r['d'] for r in g])]
print('\n## turn / return-fire response after the first hit from a new attacker (within 10 s)')
rows = [summarize(recs, 'ALL'),
        summarize([r for r in recs if r['in_fov'] and r['eng'] == r['X']], 'attacker already my target'),
        summarize([r for r in recs if r['in_fov'] and r['eng'] != r['X']], 'attacker in my FOV/near, not my target'),
        summarize([r for r in recs if not r['in_fov']], 'attacker outside my FOV (>60 deg off aim, >45 m)'),
        summarize([r for r in recs if not r['in_fov'] and r['eng'] is not None], '  ... while I am shooting someone else'),
        summarize([r for r in recs if not r['in_fov'] and r['eng'] is None], '  ... while I am not shooting'),
        summarize([r for r in recs if r['rear']], 'first hit was a rear hit')]
print(table(['situation', 'n', '% turned to within 10 deg', 'median s to turn', 'p90', '% returned fire', 'median s to first return shot', 'p90', 'median dist'], rows))
print('per type, attacker outside FOV:')
rows = [summarize([r for r in recs if not r['in_fov'] and r['type'] == ty], ty) for ty in TYPES]
print(table(['type', 'n', '% turned', 'median s', 'p90', '% returned fire', 'median s', 'p90', 'median dist'], rows))
nf = [r for r in recs if not r['in_fov']]
never = [r for r in nf if r['turn'] is None]
print('outside-FOV onsets where the victim never turned within 10 s: %d of %d ; in those the attacker landed a median of %d hits over %.1f s ; victim died within 10 s in %d' % (len(never), len(nf), median([r['n_hits'] for r in never]) if never else 0, median([r['dur'] for r in never]) if never else 0, sum(1 for r in never if r['died'])))
slow = [r for r in nf if r['turn'] is not None]
print('  turn delay distribution for outside-FOV onsets (s):', sorted(round(r['turn'], 2) for r in slow))
print('\n## movement 1 s before vs 1 s after the first hit')
rows = []
for ty in ['ALL'] + TYPES:
    g = [r for r in recs if (ty == 'ALL' or r['type'] == ty) and not math.isnan(r['sp_b']) and not math.isnan(r['sp_a'])]
    rows.append([ty, len(g), mean([r['sp_b'] for r in g]), mean([r['sp_a'] for r in g]), 100 * mean([r['bo_b'] for r in g]), 100 * mean([r['bo_a'] for r in g]), 100 * mean([r['air_b'] for r in g]), 100 * mean([r['air_a'] for r in g])])
print(table(['type', 'n', 'speed before', 'speed after', '% boost before', '% boost after', '% airborne before', '% airborne after'], rows))
dump('reactions.json', recs)

# ---------------- retreat by HP: radial velocity relative to the most recent attacker (hit within 2 s)
print('\n## when recently hit (attacker hit me within the last 2 s): my radial velocity relative to that attacker by my HP fraction')
HB = [(0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.01)]
data = collections.defaultdict(list)
for mid in R.ids:
    lst = sorted(att_by[mid])
    tk = [a[0] for a in lst]
    rows_m = R.m[mid]
    for k in range(1, R.nf):
        a, b = rows_m[k - 1], rows_m[k]
        if not a or not b or R.ticks[k] - R.ticks[k - 1] != 2: continue
        t = R.ticks[k]
        i = bisect.bisect_right(tk, t) - 1
        if i < 0 or t - tk[i] > 40: continue
        X = lst[i][1]
        px = R.pos(X, t)
        if not px: continue
        rel = (px[0] - b[MX], px[1] - b[MY]); d = math.hypot(*rel)
        v = ((b[MX] - a[MX]) / 0.1, (b[MY] - a[MY]) / 0.1)
        vr = (v[0] * rel[0] + v[1] * rel[1]) / d
        firing = engaged(mid, t) is not None
        data[R.names[mid]].append((b[MHP] / b[MMAX], vr, d, firing, bool(b[MFL] & 2)))
rows = []
for ty in ['ALL'] + TYPES:
    row = [ty]
    for lo, hi in HB:
        g = [x for t2 in (TYPES if ty == 'ALL' else [ty]) for x in data[t2] if lo <= x[0] < hi]
        row.append('%+.1f / %.0f%% / %.0f%% (n=%d)' % (mean([x[1] for x in g]), 100 * sum(1 for x in g if x[1] < -4) / len(g), 100 * sum(1 for x in g if x[3]) / len(g), len(g)) if len(g) >= 20 else 'n<20')
    rows.append(row)
print('cell = mean closing speed toward attacker (m/s) / % frames fleeing (< -4 m/s) / % frames still firing (shot within 2 s) (n frames)')
print(table(['type'] + ['HP %d-%d%%' % (lo * 100, min(hi, 1) * 100) for lo, hi in HB], rows))
res = {'retreat_by_hp': {r[0]: r[1:] for r in rows}}

# ---------------- regen episodes
print('\n## HP regeneration episodes (contiguous HP increase >= 1 s, not from cubes/drops)')
eps = []
for mid in R.ids:
    rows_m = R.m[mid]; k = 1
    while k < R.nf:
        a, b = rows_m[k - 1], rows_m[k]
        if a and b and b[MHP] > a[MHP] and b[MMAX] == a[MMAX]:
            j = k
            while j + 1 < R.nf and rows_m[j + 1] and rows_m[j + 1][MHP] > rows_m[j][MHP] and rows_m[j + 1][MMAX] == rows_m[j][MMAX]: j += 1
            if j - k >= 10:
                eps.append({'mid': mid, 'type': R.names[mid], 't0': R.ticks[k - 1], 't1': R.ticks[j], 'hp0': a[MHP], 'hp1': rows_m[j][MHP], 'max': a[MMAX]})
            k = j + 1
        else: k += 1
def nearest_enemy(mid, t):
    p = R.pos(mid, t); best = (999, None)
    for m in R.ids:
        if m == mid: continue
        q = R.pos(m, t)
        if q:
            d = math.dist(p, q)
            if d < best[0]: best = (d, m)
    return best
for e in eps:
    mid = e['mid']
    # the 5 s before regen start: speed, hidden from all enemies?
    sp = []; hidden = 0; n = 0; dn = []
    for t in range(e['t0'] - 100, e['t0'], 4):
        a = R.row(mid, t); c = R.row(mid, t + 2)
        if not a or not c: continue
        sp.append(math.hypot(c[MX] - a[MX], c[MY] - a[MY]) / 0.1)
        p = R.pos(mid, t)
        vis = False
        for m in R.ids:
            if m == mid: continue
            q = R.pos(m, t)
            if q and math.dist(p, q) <= 200 and W.los(q[0], q[1], q[2] + 8, p[0], p[1], p[2] + 4.5) >= 1: vis = True; break
        hidden += 0 if vis else 1; n += 1
        dn.append(nearest_enemy(mid, t)[0])
    e['wait_speed'] = mean(sp) if sp else None; e['wait_hidden'] = hidden / n if n else None; e['wait_dnear'] = mean(dn) if dn else None
    spr = []
    for t in range(e['t0'], e['t1'], 4):
        a = R.row(mid, t); c = R.row(mid, t + 2)
        if a and c: spr.append(math.hypot(c[MX] - a[MX], c[MY] - a[MY]) / 0.1)
    e['regen_speed'] = mean(spr) if spr else None
    # why did it end
    nxt = [a for a in att_by[mid] if e['t1'] <= a[0] <= e['t1'] + 4]
    e['end'] = 'full' if e['hp1'] >= e['max'] - 5 else 'took damage' if nxt else 'dealt damage/zone/other'
rows = []
for ty in ['ALL'] + TYPES:
    g = [e for e in eps if ty == 'ALL' or e['type'] == ty]
    if not g: rows.append([ty, 0] + ['n/a'] * 8); continue
    rows.append([ty, len(g), sum(e['hp1'] - e['hp0'] for e in g), median([e['hp0'] / e['max'] for e in g]) * 100, median([e['hp1'] / e['max'] for e in g]) * 100,
                 median([e['wait_speed'] for e in g if e['wait_speed'] is not None]), 100 * mean([e['wait_hidden'] for e in g if e['wait_hidden'] is not None]), median([e['wait_dnear'] for e in g if e['wait_dnear'] is not None]),
                 median([e['regen_speed'] for e in g if e['regen_speed'] is not None]), 100.0 * sum(1 for e in g if e['end'] == 'full') / len(g)])
print(table(['type', 'episodes', 'HP regenerated', 'median start HP %', 'median end HP %', 'median speed in the 5 s before', '% of that time out of every enemy LOS', 'median nearest-enemy dist', 'median speed while regenerating', '% ended at full HP'], rows))
print('  end reasons:', collections.Counter(e['end'] for e in eps))
res['regen'] = {r[0]: r[1:] for r in rows}
dump('retreat.json', res)
