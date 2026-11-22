"""Hop triggers; LOS-to-first-shot delay; travel behaviour when not engaged."""
import sys, os, math, collections, json, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
segs = json.load(open(os.path.join(OUT, 'mech_move.json')))['segs']
hits = [e for e in R.events if e['e'] == 'hit' and e['dst'] < 100 and e['w'] != 'zone']
hit_t = collections.defaultdict(list)
for h in hits: hit_t[h['dst']].append(h['t'])
shots_by = collections.defaultdict(list)
for o in G:
    if o['tgt'] is not None and o['tgt'] < 100: shots_by[o['s']].append((o['tf'], o['tgt']))
print('## hop triggers (airborne segments with jet)')
rows = collections.Counter(); land = collections.Counter(); n = 0
std = [s for s in segs if s['jet']]
for s in std:
    mid = s['mid']; t0 = s['t0']
    r0 = R.row(mid, t0); r1 = R.row(mid, t0 + 4)
    if not r0 or not r1: continue
    n += 1
    vx, vy = (r1[MX] - r0[MX]), (r1[MY] - r0[MY]); sp = math.hypot(vx, vy)
    blocked_ahead = False; wall_h = None
    if sp > 0.2:
        ux, uy = vx / sp, vy / sp
        for d in range(2, 26, 2):
            x, y = r0[MX] + ux * d, r0[MY] + uy * d
            top = W.surface_z(x, y) - r0[MZ]
            if top > 1.3:
                blocked_ahead = True; wall_h = top; break
            if W.ground(x, y) - r0[MZ] > 1.3 + d * 1.19:   # steeper than 50 deg
                blocked_ahead = True; wall_h = W.ground(x, y) - r0[MZ]; break
    recent_hit = any(t0 - 20 <= t <= t0 + 2 for t in hit_t[mid])
    eng = any(abs(t - t0) <= 40 for (t, _) in shots_by.get(mid, []))
    key = ('obstacle within 25 m ahead' if blocked_ahead else 'no obstacle ahead', 'hit in previous 1 s' if recent_hit else 'not hit', 'engaged' if eng else 'not engaged')
    rows[key] += 1
    rl = R.row(mid, s['t1'])
    if rl:
        h = rl[MZ] - W.ground(rl[MX], rl[MY])
        land['roof/structure (>3 m above terrain)' if h > 3 else 'ground'] += 1
    s['obst'] = blocked_ahead; s['wall_h'] = wall_h
for k, v in sorted(rows.items(), key=lambda kv: -kv[1]): print('   %-70s %d (%.0f%%)' % (str(k), v, 100.0 * v / n))
print('  landing surface:', dict(land), ' ; hops with an obstacle ahead: %d of %d ; obstacle heights p50 %.1f p90 %.1f' % (sum(1 for s in std if s.get('obst')), n, pct([s['wall_h'] for s in std if s.get('wall_h')], .5), pct([s['wall_h'] for s in std if s.get('wall_h')], .9)))
# baseline: how often is there an obstacle ahead for random grounded moving frames
b = 0; bn = 0
for mid in R.ids:
    for k in range(5, R.nf - 5, 37):
        r0 = R.m[mid][k]; r1 = R.m[mid][k + 2]
        if not r0 or not r1 or not (r0[MFL] & 1): continue
        vx, vy = r1[MX] - r0[MX], r1[MY] - r0[MY]; sp = math.hypot(vx, vy)
        if sp < 0.5: continue
        ux, uy = vx / sp, vy / sp; bl = False
        for d in range(2, 26, 2):
            x, y = r0[MX] + ux * d, r0[MY] + uy * d
            if W.surface_z(x, y) - r0[MZ] > 1.3: bl = True; break
        bn += 1; b += 1 if bl else 0
print('  baseline: random grounded moving frames with an obstacle within 25 m ahead: %d of %d (%.0f%%)' % (b, bn, 100.0 * b / bn))
# hop phase: time into the hop cycle vs being hit?  hop frequency while under fire vs not, among engaged frames
# ---- LOS established -> first shot delay
print('\n## delay between a clear line of fire opening and the first gun shot at that target (new engagements)')
def los(s, c, t):
    ps = R.pos(s, t); pc = R.pos(c, t)
    if not ps or not pc or math.dist(ps, pc) > 200: return False
    return W.los(ps[0], ps[1], ps[2] + 8, pc[0], pc[1], pc[2] + 4.5) >= 1.0 or W.los(ps[0], ps[1], ps[2] + 8, pc[0], pc[1], pc[2] + 9) >= 1.0
runs = []
for s, lst in shots_by.items():
    lst.sort(); prev = None
    for (t, c) in lst:
        if prev is None or prev[1] != c or t - prev[0] > 100: runs.append((s, c, t))
        prev = (t, c)
delays = []; infov = []
for (s, c, t) in runs:
    k = t - 1; n = 0
    while k > 0 and n < 200 and los(s, c, k): k -= 2; n += 2
    if n >= 200 or k <= 0: continue          # LOS was there for >=10 s: not a fresh acquisition
    d = (t - (k + 2)) * TICK
    # was the target within the shooter's 120 deg wedge when the line opened?
    r = R.row(s, k + 2); ps = R.pos(s, k + 2); pc = R.pos(c, k + 2)
    off = abs(angdiff(r[MYAW], math.atan2(pc[1] - ps[1], pc[0] - ps[0])))
    delays.append(d); infov.append((d, math.degrees(off), math.dist(ps, pc), R.names[s]))
print('  fresh acquisitions: %d ; delay p10 %.2f p25 %.2f p50 %.2f p75 %.2f p90 %.2f s' % (len(delays), pct(delays, .1), pct(delays, .25), pct(delays, .5), pct(delays, .75), pct(delays, .9)))
a = [x[0] for x in infov if x[1] <= 60]; bb = [x[0] for x in infov if x[1] > 60]
print('  target inside the 120 deg wedge when the line opened: n=%d median %.2f s p25 %.2f p75 %.2f ; outside the wedge: n=%d median %.2f s' % (len(a), median(a), pct(a, .25), pct(a, .75), len(bb), median(bb) if bb else float('nan')))
print('  shortest delays:', sorted(round(x, 2) for x in delays)[:15])
# ---- travel behaviour when not engaged
print('\n## not engaged (no weapon use within 3 s): speed and heading relative to the next zone centre')
Z = R.hdr['zone']
def next_centre(tick):
    t = tick * TICK
    for i in range(1, len(Z)):
        if t < Z[i]['shrink_end']: return Z[i]['center'], Z[i]['radius']
    return Z[-1]['center'], 0
all_t = collections.defaultdict(list)
for o in G: all_t[o['s']].append(o['tf'])
for e in R.events:
    if e['e'] in ('zap', 'laser', 'charge'): all_t[e['id']].append(e['t'])
for s in all_t: all_t[s].sort()
def quiet(mid, t, w=60):
    lst = all_t.get(mid, []); i = bisect.bisect_left(lst, t - w)
    return not (i < len(lst) and lst[i] <= t + w)
rows = []
for ty in ['ALL', 'expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']:
    sp = []; boost = 0; still = 0; n = 0; toward = []; inside = 0
    for mid in R.ids:
        if ty != 'ALL' and R.names[mid] != ty: continue
        rows_m = R.m[mid]
        for k in range(1, R.nf, 2):
            a, b = rows_m[k - 1], rows_m[k]
            if not a or not b or R.ticks[k] - R.ticks[k - 1] != 2 or not quiet(mid, R.ticks[k]): continue
            v = ((b[MX] - a[MX]) / 0.1, (b[MY] - a[MY]) / 0.1); s = math.hypot(*v)
            n += 1; sp.append(s); boost += 1 if b[MFL] & 2 else 0; still += 1 if s < 1 else 0
            c, rad = next_centre(R.ticks[k]); rel = (c[0] - b[MX], c[1] - b[MY]); d = math.hypot(*rel)
            if d <= rad: inside += 1
            if s > 3 and d > 1: toward.append((v[0] * rel[0] + v[1] * rel[1]) / (s * d))
    rows.append([ty, n / 5.0, mean(sp), 100.0 * boost / n, 100.0 * still / n, 100.0 * inside / n, mean(toward), 100.0 * sum(1 for x in toward if x > 0.7) / len(toward)])
print(table(['type', 'seconds', 'mean speed', '% boost flag', '% standing still', '% of time already inside next circle', 'mean cos(heading, bearing to next centre)', '% heading within 45 deg of next centre'], rows))
