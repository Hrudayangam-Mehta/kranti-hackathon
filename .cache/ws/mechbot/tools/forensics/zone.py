"""Section 7: zone behaviour."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
Z = R.hdr['zone']
def zone_at(tick):
    for fr_i in (R.fi(tick),):
        z = R.frames[fr_i]['z']; return z
phases = [(Z[i - 1], Z[i]) for i in range(1, len(Z))]
print('zone schedule:', [(z['center'], z['radius'], z['shrink_start'], z['shrink_end']) for z in Z])
zdmg = collections.Counter(); zticks = collections.Counter()
for h in R.events:
    if h['e'] == 'hit' and h['w'] == 'zone': zdmg[h['dst']] += h['amt']; zticks[h['dst']] += 1
print('zone damage taken per mech:', {m: (round(zdmg[m], 1), round(zticks[m] * TICK, 1)) for m in R.ids if zdmg[m]}, '(damage, seconds outside)')
dmg_all = collections.Counter()
for h in R.events:
    if h['e'] == 'hit' and h['dst'] < 100: dmg_all[h['w']] += h['amt']
print('all damage taken by mechs by source:', {k: round(v) for k, v in dmg_all.items()})
# relative position in the current circle
print('\n## where they stand: distance from current zone centre / current radius (alive frames, every 1 s)')
rows = []
for ty in ['ALL'] + TYPES:
    rr = []; mg = []
    for mid in R.ids:
        if ty != 'ALL' and R.names[mid] != ty: continue
        for k in range(0, R.nf, 10):
            r = R.m[mid][k]
            if not r: continue
            z = R.frames[k]['z']
            d = math.hypot(r[MX] - z[0], r[MY] - z[1])
            rr.append(d / z[2]); mg.append(z[2] - d)
    rows.append([ty, len(rr), pct(rr, .1), pct(rr, .5), pct(rr, .9), 100.0 * sum(1 for x in rr if x > 0.8) / len(rr), pct(mg, .1), pct(mg, .5)])
print(table(['type', 'samples', 'r/R p10', 'p50', 'p90', '% of time in the outer 20% ring', 'margin to edge p10 (m)', 'p50'], rows))
# by time window
rows = []
for (t0, t1) in ((0, 60), (60, 110), (110, 155), (155, 195), (195, 210)):
    rr = []; mg = []
    for mid in R.ids:
        for k in range(R.fi(t0 * 20), min(R.nf, R.fi(t1 * 20) + 1), 10):
            r = R.m[mid][k]
            if not r: continue
            z = R.frames[k]['z']
            d = math.hypot(r[MX] - z[0], r[MY] - z[1]); rr.append(d / z[2]); mg.append(z[2] - d)
    rows.append(['%d-%d s' % (t0, t1), len(rr), pct(rr, .5), pct(rr, .9), pct(mg, .1), pct(mg, .5), 100.0 * sum(1 for x in mg if x < 0) / len(rr)])
print(table(['window', 'samples', 'r/R p50', 'p90', 'margin p10', 'margin p50', '% outside'], rows))
# rotation timing per shrink phase
print('\n## rotation timing: for each mech alive at shrink_start, relation to the NEXT circle')
for pi, (cur, nxt) in enumerate(phases[:3]):
    ts, te = nxt['shrink_start'] * 20, nxt['shrink_end'] * 20
    if ts > R.end_tick: break
    hold_start = (Z[pi]['shrink_end']) * 20
    print(' phase %d: next circle centre (%.0f,%.0f) r=%d, announced at %ds, shrink %d-%ds' % (pi + 1, nxt['center'][0], nxt['center'][1], nxt['radius'], hold_start / 20, ts / 20, te / 20))
    rows = []
    for mid in R.ids:
        if not R.alive(mid, ts): continue
        def dn(t):
            p = R.pos(mid, t); return math.hypot(p[0] - nxt['center'][0], p[1] - nxt['center'][1]) if p else None
        d_ann = dn(hold_start); d_s = dn(ts)
        t_in = None
        for k in range(R.fi(hold_start), R.nf):
            r = R.m[mid][k]
            if not r: break
            if math.hypot(r[MX] - nxt['center'][0], r[MY] - nxt['center'][1]) <= nxt['radius']: t_in = R.ticks[k]; break
        # first time it starts sustained movement toward next centre (closing > 5 m/s averaged over 3 s) if outside at announce
        t_move = None
        if d_ann is not None and d_ann > nxt['radius']:
            for t in range(hold_start, min(R.end_tick - 60, te + 400), 10):
                a = dn(t); b = dn(t + 60)
                if a is None or b is None: break
                if (a - b) / 3.0 > 5: t_move = t; break
        end = min(R.death_tick.get(mid, R.end_tick), te)
        zd = sum(h['amt'] for h in R.events if h['e'] == 'hit' and h['w'] == 'zone' and h['dst'] == mid and ts <= h['t'] <= te + 600)
        rows.append([mid, R.names[mid], d_ann - nxt['radius'] if d_ann is not None else float('nan'), d_s - nxt['radius'], ('%.1f' % ((t_move - ts) * TICK)) if t_move is not None else ('inside' if d_ann <= nxt['radius'] else 'never'),
                     ('%.1f' % ((t_in - ts) * TICK)) if t_in is not None else 'never', ('%.1f' % ((t_in - te) * TICK)) if t_in is not None else 'never', zd])
    print(table(['mech', 'type', 'dist outside next circle at announce (m; <0 inside)', 'at shrink_start', 'starts moving in (s rel. shrink_start)', 'inside next circle at (s rel. shrink_start)', '(s rel. shrink_end)', 'zone dmg this phase'], rows))
# mech 2 forensic
print('\n## mech 2 (brawler) zone death trace (every 5 s): t, pos, height above terrain, speed, hp, energy, flags, dist to zone centre - radius')
mid = 2
for t in range(2600, R.end_tick, 100):
    r = R.row(mid, t); r2 = R.row(mid, t + 20)
    if not r: break
    z = R.frames[R.fi(t)]['z']
    sp = math.hypot(r2[MX] - r[MX], r2[MY] - r[MY]) / 1.0 if r2 else float('nan')
    print('   t=%.0fs pos (%.1f, %.1f, %.1f) h=%.1f net speed over next 1 s %.1f hp %d en %d fl %d outside by %.0f m ; aim yaw %.2f' % (t * TICK, r[MX], r[MY], r[MZ], r[MZ] - W.ground(r[MX], r[MY]), sp, r[MHP], r[MEN], r[MFL], math.hypot(r[MX] - z[0], r[MY] - z[1]) - z[2], r[MYAW]))
