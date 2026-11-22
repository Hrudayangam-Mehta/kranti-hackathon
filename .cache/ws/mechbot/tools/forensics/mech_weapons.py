"""Section 10c: mortar ballistics / splash / concussion, lightning, NPC drones, turn rates, cooldowns."""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import shots
R = Replay(); W = World()
S = shots.build(R)
upg = collections.defaultdict(list)
for e in R.events:
    if e['e'] == 'upgrade': upg[e['id']].append((e['t'], e['up']))
def nup(mid, tick, name):
    return sum(1 for (t, u) in upg[mid] if u == name and t < tick)
hits = [e for e in R.events if e['e'] == 'hit']
# ---------------- gun: range / lifetime, hit radius
life = []
for rec in S['gun']:
    if rec['impact'] is None and rec['pts']:
        f = rec['fire']; last = rec['pts'][-1][0]
        life.append((last - f['t']) * TICK)
print('gun bullets without impact event: n %d ; last frame age (s) modes %s' % (len(life), collections.Counter(round(x, 2) for x in life).most_common(4)))
# distance travelled at last frame for those
dist_exp = []
for rec in S['gun']:
    if rec['impact'] is None and len(rec['pts']) >= 2:
        f = rec['fire']; sp = R.pos(f['id'], f['t']); b = rec['pts'][-1]
        dist_exp.append(math.dist((sp[0], sp[1], sp[2] + 7), b[1:]))
print('   distance from muzzle axis at last frame: max %.1f p50 %.1f (range limit lies within +14 m of max)' % (max(dist_exp), median(dist_exp)))
imp_d = []
for rec in S['gun']:
    im = rec['impact']
    if im and im['hit'] is None:
        f = rec['fire']; sp = R.pos(f['id'], f['t'])
        imp_d.append(math.dist((sp[0], sp[1], sp[2] + 7), im['at']))
print('   impacts on world geometry: n %d max distance %.1f' % (len(imp_d), max(imp_d)))
# ---------------- mortar ballistics
print('\nMORTAR shells:', len(S['mortar']))
sp0 = []; gs = []; flights = []
for rec in S['mortar']:
    pts = rec['pts']; f = rec['fire']
    if len(pts) >= 4:
        # horizontal speed const; vertical: fit second difference
        hv = [math.hypot(pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]) / 0.1 for i in range(len(pts) - 1)]
        g = [-(pts[i + 2][3] - 2 * pts[i + 1][3] + pts[i][3]) / 0.01 for i in range(len(pts) - 2)]
        vz0 = (pts[1][3] - pts[0][3]) / 0.1
        # launch speed: back-extrapolate vz to the fire tick
        n = (pts[0][0] - f['t']) * TICK
        gm = mean(g)
        vz_launch = vz0 + gm * (n + 0.05)
        sp0.append(math.hypot(mean(hv), vz_launch)); gs.append(gm)
    b = rec['boom']
    if b: flights.append((b['t'] - f['t']) * TICK)
print('  launch speed: median %.2f p10 %.2f p90 %.2f ; gravity median %.2f ; flight time p10 %.2f p50 %.2f p90 %.2f max %.2f' % (median(sp0), pct(sp0, .1), pct(sp0, .9), median(gs), pct(flights, .1), median(flights), pct(flights, .9), max(flights)))
# origin height: back-trace first point to fire tick
oz = []
for rec in S['mortar']:
    pts = rec['pts']; f = rec['fire']
    if len(pts) >= 3:
        n = (pts[0][0] - f['t']) * TICK
        vx = (pts[1][1] - pts[0][1]) / 0.1; vy = (pts[1][2] - pts[0][2]) / 0.1
        vz0 = (pts[1][3] - pts[0][3]) / 0.1 + 22 * 0.05   # velocity at pts[0] time (approx)
        x0 = pts[0][1] - vx * n; y0 = pts[0][2] - vy * n
        z0 = pts[0][3] - (vz0 * n + 0.5 * 22 * n * n)
        sp = R.pos(f['id'], f['t'])
        oz.append((round(math.hypot(x0 - sp[0], y0 - sp[1]), 2), round(z0 - sp[2], 2), n))
print('  back-traced origin at fire tick (horizontal offset from mech centre, height above feet, dt):', oz[:12])
# splash: hit amt vs distance
print('\nmortar hits (boom at, victim, amt, rear, fx, d_feet, d_centre, d_axis_surface, shooter cubes):')
booms = {(e['t'], e['p']): e for e in R.events if e['e'] == 'boom'}
boom_by_t = collections.defaultdict(list)
for e in R.events:
    if e['e'] == 'boom': boom_by_t[e['t']].append(e)
shell_of = {rec['pid']: rec for rec in S['mortar']}
splash_rows = []
for h in hits:
    if h['w'] != 'mortar': continue
    bs = boom_by_t[h['t']]
    # choose boom whose shell shooter == src
    b = None
    for bb in bs:
        if shell_of[bb['p']]['fire']['id'] == h['src']: b = bb
    if b is None: print('  no boom for', h); continue
    vp = R.pos(h['dst'], h['t'] - 1) or R.pos(h['dst'], h['t'])
    r = R.row(h['src'], h['t']) or R.row(h['src'], h['t'] - 2)
    cubes = r[MCU] if r else None
    at = b['at']
    dfeet = math.dist(at, vp); dcen = math.dist(at, (vp[0], vp[1], vp[2] + 4.5))
    dh = math.hypot(at[0] - vp[0], at[1] - vp[1]); dzc = max(0, vp[2] - at[2], at[2] - (vp[2] + 9))
    daxis = math.hypot(dh, dzc); dsurf = math.hypot(max(0, dh - 2.5), dzc)
    im = shell_of[b['p']]['impact']
    direct = (im is not None and im.get('hit') == h['dst'])
    mult = (1 + 0.04 * min(cubes or 0, 10)) * (1.5 if h.get('rear') else 1) * (0.5 if h['src'] == h['dst'] else 1) * (1 - 0.08 * nup(h['dst'], h['t'], 'armor'))
    base = h['amt'] / mult
    splash_rows.append((dfeet, dcen, daxis, dsurf, base, direct, h))
    print('  t=%d src=%d dst=%d amt=%.2f rear=%s fx=%s direct=%s cubes=%s | d_feet %.2f d_centre %.2f d_axis %.2f d_surf %.2f | base(after removing cube/rear/self/armor) %.1f | r=%s' % (h['t'], h['src'], h['dst'], h['amt'], h.get('rear'), h.get('fx'), direct, cubes, dfeet, dcen, daxis, dsurf, base, b['r']))
print('  model check: splash = 160*(1 - 0.7*d/R); try each distance definition (non-direct hits):')
for name, idx in (('feet', 0), ('centre', 1), ('axis', 2), ('surface', 3)):
    errs = []
    for row in splash_rows:
        if row[5]: continue
        Rr = 7.0 * (1.3 ** nup(row[6]['src'], row[6]['t'], 'mortar_splash'))
        pred = 160 * (1 - 0.7 * min(1, row[idx] / Rr))
        errs.append(row[4] - pred)
    print('    %-8s rms err %.1f  mean err %.1f  (n=%d)' % (name, math.sqrt(mean([e * e for e in errs])), mean(errs), len(errs)))
# ---------------- concussion
print('\nconcussion events (victim, by, |v_h|, v_z, drain, d_centre from boom, ratios):')
for e in R.events:
    if e['e'] != 'concuss': continue
    bs = [b for b in boom_by_t[e['t']] if shell_of[b['p']]['fire']['id'] == e['by']]
    if not bs: print('  no boom', e); continue
    b = bs[0]
    vp = R.pos(e['id'], e['t'] - 1) or R.pos(e['id'], e['t'])
    dcen = math.dist(b['at'], (vp[0], vp[1], vp[2] + 4.5)); dfeet = math.dist(b['at'], vp)
    vh = math.hypot(e['v'][0], e['v'][1])
    f = e['drain'] / 45
    print('  t=%d id=%d by=%d vh=%.2f vz=%.2f drain=%.2f f=drain/45=%.3f vh/16=%.3f vz/9=%.3f d_feet=%.2f d_centre=%.2f -> pred f(feet)=%.3f f(centre)=%.3f' % (e['t'], e['id'], e['by'], vh, e['v'][2], e['drain'], f, vh / 16, e['v'][2] / 9, dfeet, dcen, 1 - 0.7 * min(1, dfeet / 7), 1 - 0.7 * min(1, dcen / 7)))
# ---------------- lightning
print('\nLIGHTNING zaps:')
zaps = [e for e in R.events if e['e'] == 'zap']
zt = collections.defaultdict(list)
for z in zaps: zt[z['id']].append(z['t'])
for mid, ts in zt.items():
    print('  mech', mid, 'zaps', len(ts), 'interval ticks', collections.Counter(ts[i + 1] - ts[i] for i in range(len(ts) - 1)).most_common(5))
nh = collections.Counter(len(z['hits']) for z in zaps); print('  hits per zap', dict(nh), ' path points per zap', dict(collections.Counter(len(z['path']) for z in zaps)))
for z in zaps:
    hs = [h for h in hits if h['t'] == z['t'] and h['w'] == 'lightning' and h['src'] == z['id']]
    if len(z['hits']) != 1 or len(hs) != 1 or len(z['path']) != 2:
        segs = [round(math.dist(z['path'][i], z['path'][i + 1]), 1) for i in range(len(z['path']) - 1)]
        print('   multi/odd zap t=%d hits=%s amts=%s seg lengths=%s' % (z['t'], z['hits'], [(h['dst'], h['amt']) for h in hs], segs))
first_seg = [math.dist(z['path'][0], z['path'][1]) for z in zaps if z['hits']]
print('  first-segment length when hitting: max %.1f p50 %.1f' % (max(first_seg), median(first_seg)))
miss = [math.dist(z['path'][0], z['path'][1]) for z in zaps if not z['hits']]
print('  zaps with no hit: n %d, arc lengths %s' % (len(miss), [round(m, 1) for m in miss]))
# energy cost per zap: energy drop across frames containing exactly one zap, mech not boosting
ec = []
for z in zaps:
    k = R.fi(z['t'] - 1)
    a = R.m[z['id']][k]; b = R.m[z['id']][k + 1] if k + 1 < R.nf else None
    if a and b and not (a[MFL] & 2) and not (b[MFL] & 2):
        ec.append((a[MEN] - b[MEN], nup(z['id'], z['t'], 'lightning_efficiency')))
print('  energy change across the zap frame (drop, efficiency ups):', collections.Counter(ec).most_common(8))
# origin height of zap path
zo = []
for z in zaps:
    sp = R.pos(z['id'], z['t'])
    zo.append((round(math.hypot(z['path'][0][0] - sp[0], z['path'][0][1] - sp[1]), 1), round(z['path'][0][2] - sp[2], 1)))
print('  arc origin (horizontal offset, height above feet) modes', collections.Counter(zo).most_common(4))
# ---------------- laser beam origin, cooldown
print('\nLASER:')
la = [e for e in R.events if e['e'] == 'laser']; ch = [e for e in R.events if e['e'] == 'charge']
lo = []; lens = []
for e in la:
    sp = R.pos(e['id'], e['t'])
    lo.append((round(math.hypot(e['from'][0] - sp[0], e['from'][1] - sp[1]), 1), round(e['from'][2] - sp[2], 1)))
    lens.append(math.dist(e['from'], e['to']))
print('  beam origin (horizontal offset, height above feet) modes', collections.Counter(lo).most_common(4))
print('  beam length: max %.1f ; n at >= 276 m: %d of %d' % (max(lens), sum(1 for l in lens if l >= 276), len(lens)))
gaps = collections.defaultdict(list)
for mid in set(e['id'] for e in la):
    ls = sorted(e['t'] for e in la if e['id'] == mid); cs = sorted(e['t'] for e in ch if e['id'] == mid)
    for t in ls:
        nxt = [c for c in cs if c > t]
        if nxt: gaps[mid].append(nxt[0] - t)
print('  ticks from beam to next charge start, per mech:', {m: sorted(g) for m, g in gaps.items()})
print('  -> minimum %d ticks = %.2f s (upper bound on the laser cooldown + reaction)' % (min(min(g) for g in gaps.values()), min(min(g) for g in gaps.values()) * TICK))
# ---------------- NPC
print('\nNPC drones:')
ns = []
for rec in S['npc']:
    pts = rec['pts']
    if len(pts) >= 3:
        a, b = pts[0], pts[-1]
        ns.append(math.dist(a[1:], b[1:]) / ((b[0] - a[0]) * TICK))
print('  npc bullet speed: n %d median %.2f sd %.3f' % (len(ns), median(ns), sd(ns)))
home = {n['id']: n['spawn'] for n in R.hdr['npcs']}
maxd = {}; spd = []
for nid, rows in R.n.items():
    ds = [math.hypot(r[1] - home[nid][0], r[2] - home[nid][1]) for r in rows if r]
    maxd[nid] = round(max(ds), 1)
    for k in range(1, R.nf):
        a, b = rows[k - 1], rows[k]
        if a and b: spd.append(math.hypot(b[1] - a[1], b[2] - a[2]) / ((R.ticks[k] - R.ticks[k - 1]) * TICK))
print('  max distance from home per drone:', maxd)
print('  drone speed modes', collections.Counter(round(s, 1) for s in spd).most_common(5), 'max %.2f' % max(spd))
# npc fire cadence & who they shoot: infer from npc shells first point direction -> nearest mech along direction
nfire = collections.defaultdict(list)
for rec in S['npc']:
    t0 = rec['pts'][0][0] if rec['pts'] else rec['impact']['t']
    p0 = rec['pts'][0][1:] if rec['pts'] else rec['impact']['at']
    # nearest drone to back-traced origin
    best = None
    for nid, rows in R.n.items():
        r = R.row(nid, t0)
        if not r: continue
        d = math.dist((r[1], r[2], r[3]), p0)
        if best is None or d < best[0]: best = (d, nid)
    nfire[best[1]].append((t0, rec))
for nid, lst in sorted(nfire.items()):
    ts = [t for t, _ in lst]
    print('  drone', nid, 'shots', len(ts), 'frame-tick gaps', collections.Counter(ts[i + 1] - ts[i] for i in range(len(ts) - 1)).most_common(4))
# aggro: at each npc shot, distance drone->victim-ish (the mech hit or nearest mech), drone distance from home
agg = []
for nid, lst in nfire.items():
    for t0, rec in lst:
        r = R.row(nid, t0)
        dm = []
        for mid in R.ids:
            p = R.pos(mid, t0)
            if p: dm.append((math.dist(p, (r[1], r[2], r[3])), mid))
        dm.sort()
        agg.append((dm[0][0], math.hypot(r[1] - home[nid][0], r[2] - home[nid][1])))
print('  at drone shots: distance to nearest mech p50 %.1f p90 %.1f max %.1f ; drone distance from home p50 %.1f max %.1f' % (median([a[0] for a in agg]), pct([a[0] for a in agg], .9), max(a[0] for a in agg), median([a[1] for a in agg]), max(a[1] for a in agg)))
nh = sum(1 for rec in S['npc'] if rec['impact'] and rec['impact']['hit'] is not None and rec['impact']['hit'] < 100)
print('  drone shots %d, hit a mech %d (%.0f%%)' % (len(S['npc']), nh, 100 * nh / len(S['npc'])))
# first npc shot vs first hit on that npc: does the drone shoot first (proximity aggro) or only after being attacked?
first_hit_on = {}
for h in hits:
    if 100 <= h['dst'] < 1000 and h['dst'] not in first_hit_on: first_hit_on[h['dst']] = h['t']
for nid, lst in sorted(nfire.items()):
    t0 = lst[0][0]
    r = R.row(nid, t0)
    dm = sorted((math.dist(R.pos(mid, t0), (r[1], r[2], r[3])), mid) for mid in R.ids if R.pos(mid, t0))
    print('  drone %d first shot frame t=%d ; first damaged at t=%s ; nearest mech then %.1f m (id %d)' % (nid, t0, first_hit_on.get(nid), dm[0][0], dm[0][1]))
# ---------------- turn rates
print('\nTURN RATES (rad/s between frames):')
yr = collections.defaultdict(list); pr = collections.defaultdict(list)
for mid in R.ids:
    rows = R.m[mid]
    for k in range(1, R.nf):
        a, b = rows[k - 1], rows[k]
        if not a or not b or R.ticks[k] - R.ticks[k - 1] != 2: continue
        g = nup(mid, R.ticks[k - 1], 'gyros')
        if nup(mid, R.ticks[k] + 1, 'gyros') != g: continue
        yr[g].append(abs(angdiff(b[MYAW], a[MYAW])) / 0.1); pr[g].append(abs(b[MPIT] - a[MPIT]) / 0.1)
for g in sorted(yr):
    print('  gyros=%d yaw rate: max %.2f p99.9 %.2f p99 %.2f ; frames at >= 3.85: %d ; pitch rate max %.2f p99.9 %.2f' % (g, max(yr[g]), pct(yr[g], .999), pct(yr[g], .99), sum(1 for x in yr[g] if x >= 3.85), max(pr[g]), pct(pr[g], .999)))
    print('     yaw-rate modes of top values', collections.Counter(round(x, 1) for x in yr[g] if x > 2.5).most_common(5))
pit = [r[MPIT] for mid in R.ids for r in R.m[mid] if r]
print('  pitch range observed: min %.2f max %.2f' % (min(pit), max(pit)))
