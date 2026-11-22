"""Section 10a: movement / energy / regen mechanics measured from the replay frames."""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
res = {}
# ---------- speeds
walk = []; boost = []; chg = []
upg = collections.defaultdict(list)
for e in R.events:
    if e['e'] == 'upgrade': upg[e['id']].append((e['t'], e['up']))
def has(mid, tick, name):
    return sum(1 for (t, u) in upg[mid] if u == name and t <= tick)
for mid in R.ids:
    rows = R.m[mid]
    for k in range(1, R.nf - 1):
        a, b = rows[k], rows[k + 1]
        if a is None or b is None: continue
        if not (a[MFL] & 1 and b[MFL] & 1): continue
        dt = (R.ticks[k + 1] - R.ticks[k]) * TICK
        if dt < 0.09: continue
        s = math.hypot(b[MX] - a[MX], b[MY] - a[MY]) / dt
        if has(mid, R.ticks[k], 'servos'): continue
        if a[MFL] & 4 or b[MFL] & 4: chg.append(s)
        elif a[MFL] & 2 and b[MFL] & 2: boost.append(s)
        elif not (a[MFL] & 2) and not (b[MFL] & 2): walk.append(s)
def hist(xs, w=0.5, top=6):
    c = collections.Counter(round(x / w) * w for x in xs)
    return sorted(c.items(), key=lambda kv: -kv[1])[:top]
print('walk frames', len(walk), 'modes', hist(walk), 'p50 %.2f p90 %.2f p99 %.2f max %.2f' % (pct(walk, .5), pct(walk, .9), pct(walk, .99), max(walk)))
print('boost frames', len(boost), 'modes', hist(boost), 'p50 %.2f p90 %.2f p99 %.2f max %.2f' % (pct(boost, .5), pct(boost, .9), pct(boost, .99), max(boost)))
print('charging frames', len(chg), 'modes', hist(chg), 'p90 %.2f max %.2f' % (pct(chg, .9), max(chg)))
wfine = collections.Counter(round(x, 1) for x in walk); print('walk fine modes', wfine.most_common(6))
bfine = collections.Counter(round(x, 1) for x in boost); print('boost fine modes', bfine.most_common(6))
cfine = collections.Counter(round(x, 1) for x in chg); print('charge fine modes', cfine.most_common(6))
res['walk_speed'] = wfine.most_common(1)[0][0]; res['boost_speed'] = bfine.most_common(1)[0][0]
# ---------- acceleration from rest at t=0
d0 = []
for mid in R.ids:
    a, b, c = R.m[mid][0], R.m[mid][1], R.m[mid][2]
    d1 = math.hypot(b[MX] - a[MX], b[MY] - a[MY]); d2 = math.hypot(c[MX] - b[MX], c[MY] - b[MY])
    d0.append((mid, round(d1, 3), round(d2, 3), b[MFL]))
print('first two frame displacements (m):', d0)
acc = [d / 0.0075 for (_, d, _, _) in d0 if d > 0.3]
print('implied ground accel (d1 = 3*a*dt^2, dt=0.05): median %.1f' % median(acc), sorted(round(a, 1) for a in acc))
res['ground_accel'] = median(acc)
# generic: max change of frame-mean velocity between consecutive frames while grounded
dvs = []
for mid in R.ids:
    rows = R.m[mid]
    for k in range(1, R.nf - 2):
        a, b, c = rows[k], rows[k + 1], rows[k + 2]
        if not (a and b and c): continue
        if not (a[MFL] & 1 and b[MFL] & 1 and c[MFL] & 1): continue
        v1 = ((b[MX] - a[MX]) / 0.1, (b[MY] - a[MY]) / 0.1); v2 = ((c[MX] - b[MX]) / 0.1, (c[MY] - b[MY]) / 0.1)
        dvs.append(math.hypot(v2[0] - v1[0], v2[1] - v1[1]) / 0.1)
print('grounded |dv|/dt between successive frame-mean velocities: p50 %.1f p90 %.1f p99 %.1f max %.1f' % (pct(dvs, .5), pct(dvs, .9), pct(dvs, .99), max(dvs)))
# ---------- airborne segments
segs = []
for mid in R.ids:
    rows = R.m[mid]
    k = 1
    while k < R.nf:
        r = rows[k]
        if r is not None and not (r[MFL] & 1) and rows[k - 1] is not None and (rows[k - 1][MFL] & 1):
            j = k
            while j < R.nf and rows[j] is not None and not (rows[j][MFL] & 1): j += 1
            if j < R.nf and rows[j] is not None:
                segs.append((mid, k - 1, j))
            k = j
        else:
            k += 1
print('airborne segments', len(segs))
jump_apex = []; jet_rates = []; jet_drain = []; air_h = []
seginfo = []
for (mid, k0, k1) in segs:
    rows = R.m[mid]
    zs = [rows[k][MZ] for k in range(k0, k1 + 1)]
    fl = [rows[k][MFL] for k in range(k0, k1 + 1)]
    en = [rows[k][MEN] for k in range(k0, k1 + 1)]
    anyb = any(f & 2 for f in fl[1:-1])
    apex = max(zs) - zs[0]
    dur = (R.ticks[k1] - R.ticks[k0]) * TICK
    seginfo.append({'mid': mid, 't0': R.ticks[k0], 't1': R.ticks[k1], 'apex': apex, 'dz': zs[-1] - zs[0], 'jet': anyb, 'dur': dur, 'e0': en[0], 'emin': min(en)})
    if not anyb:
        jump_apex.append(apex)
    else:
        # frames where boosting in air on both ends
        for i in range(1, len(zs) - 2):
            if fl[i] & 2 and fl[i + 1] & 2:
                jet_rates.append((zs[i + 1] - zs[i]) / 0.1)
        bi = [i for i in range(1, len(zs) - 1) if fl[i] & 2]
        if len(bi) >= 8 and bi[-1] - bi[0] == len(bi) - 1:
            jet_drain.append((en[bi[0]] - en[bi[-1]]) / ((bi[-1] - bi[0]) * 0.1))
ja = collections.Counter(round(a, 1) for a in jump_apex)
print('no-jet airborne segments', len(jump_apex), 'apex modes', ja.most_common(8), 'max', max(jump_apex) if jump_apex else None)
jr = collections.Counter(round(a, 1) for a in jet_rates)
print('jet climb rate (m/s per frame) modes', jr.most_common(6), 'n', len(jet_rates), 'max %.2f' % max(jet_rates))
print('jet energy drain per s (segments >=0.8 s contiguous): n %d median %.2f p10 %.2f p90 %.2f' % (len(jet_drain), median(jet_drain), pct(jet_drain, .1), pct(jet_drain, .9)))
res['jet_climb'] = jr.most_common(1)[0][0]; res['jet_drain'] = median(jet_drain); res['jump_apex_mode'] = ja.most_common(1)[0][0] if ja else None
jets = [s for s in seginfo if s['jet']]
print('jet segments', len(jets), 'apex p50 %.1f p90 %.1f max %.1f; net dz p50 %.1f p90 %.1f max %.1f' % (pct([s['apex'] for s in jets], .5), pct([s['apex'] for s in jets], .9), max(s['apex'] for s in jets), pct([s['dz'] for s in jets], .5), pct([s['dz'] for s in jets], .9), max(s['dz'] for s in jets)))
# z profile of a clean jump (no jet) to fit v0 and g
best = None
for (mid, k0, k1) in segs:
    rows = R.m[mid]
    fl = [rows[k][MFL] for k in range(k0, k1 + 1)]
    if any(f & 2 for f in fl[1:-1]): continue
    zs = [round(rows[k][MZ] - rows[k0][MZ], 2) for k in range(k0, k1 + 1)]
    if 2.0 < max(zs) < 4.0 and abs(zs[-1]) < 0.3:
        best = zs; print('clean jump z profile (0.1 s):', zs); break
# falling: gravity from second differences in no-jet air frames
g2 = []
for (mid, k0, k1) in segs:
    rows = R.m[mid]
    for k in range(k0 + 1, k1 - 2):
        a, b, c = rows[k], rows[k + 1], rows[k + 2]
        if a[MFL] & 3 or b[MFL] & 3 or c[MFL] & 3: continue
        g2.append(-(c[MZ] - 2 * b[MZ] + a[MZ]) / 0.01)
gc = collections.Counter(round(x) for x in g2)
print('gravity from second differences in free flight: modes', gc.most_common(4), 'n', len(g2))
res['gravity'] = gc.most_common(1)[0][0] if gc else None
# ---------- energy: ground boost drain and regen
runs = []
for mid in R.ids:
    rows = R.m[mid]
    k = 0
    while k < R.nf - 1:
        if rows[k] is None: k += 1; continue
        # contiguous run where grounded & boosting
        if rows[k][MFL] & 2 and rows[k][MFL] & 1:
            j = k
            while j + 1 < R.nf and rows[j + 1] is not None and (rows[j + 1][MFL] & 3) == 3: j += 1
            if j - k >= 10:
                runs.append((rows[k][MEN] - rows[j][MEN]) / ((j - k) * 0.1))
            k = j + 1
        else: k += 1
print('ground boost drain per s (runs >= 1 s): n %d median %.2f p10 %.2f p90 %.2f' % (len(runs), median(runs), pct(runs, .1), pct(runs, .9)))
res['boost_drain'] = median(runs)
# regen: contiguous runs where energy increases and no boost flag; use runs >=1.5 s, ignore zap users
zappers = set(e['id'] for e in R.events if e['e'] == 'zap')
reg = collections.defaultdict(list)
for mid in R.ids:
    rows = R.m[mid]
    k = 0
    while k < R.nf - 1:
        if rows[k] is None or rows[k + 1] is None: k += 1; continue
        if rows[k + 1][MEN] > rows[k][MEN] and rows[k][MEN] < 100:
            j = k
            while j + 1 < R.nf and rows[j + 1] is not None and rows[j + 1][MEN] > rows[j][MEN] and rows[j + 1][MEN] < 100: j += 1
            if j - k >= 15:
                nre = has(mid, R.ticks[k], 'reactor')
                reg[nre].append((rows[j][MEN] - rows[k][MEN]) / ((j - k) * 0.1))
            k = j + 1
        else: k += 1
for nre, v in sorted(reg.items()):
    print('energy regen per s with %d reactor upgrade(s): n %d median %.2f p10 %.2f p90 %.2f' % (nre, len(v), median(v), pct(v, .1), pct(v, .9)))
res['energy_regen'] = median(reg[0])
# regen delay: time between last frame with boost flag and first energy increase
delays = []
for mid in R.ids:
    if mid in zappers: continue
    rows = R.m[mid]
    for k in range(1, R.nf - 30):
        a, b = rows[k], rows[k + 1]
        if a is None or b is None: continue
        if (a[MFL] & 2) and not (b[MFL] & 2) and a[MEN] < 90:
            # boost ended between frame k and k+1; find first frame j>k+? where energy > energy at k+1.. and no boost meanwhile
            e_end = b[MEN]; j = k + 1; ok = True
            while j + 1 < R.nf and rows[j + 1] is not None:
                if rows[j + 1][MFL] & 2: ok = False; break
                if rows[j + 1][MEN] > rows[j][MEN]: break
                j += 1
            if ok and j + 1 < R.nf and rows[j + 1] is not None:
                delays.append((R.ticks[j + 1] - R.ticks[k + 1]) * TICK)
dc = collections.Counter(round(d, 1) for d in delays)
print('frames from first non-boost frame to first energy increase (s): modes', dc.most_common(6), 'n', len(delays))
res['energy_regen_delay_frames'] = dc.most_common(3)
# max energy
print('max energy seen', max(r[MEN] for mid in R.ids for r in R.m[mid] if r))
dump('mech_move.json', {'res': res, 'segs': seginfo})
