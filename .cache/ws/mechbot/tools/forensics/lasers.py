"""Section 8a: laser use: charge durations, release accuracy, aim model, victim reaction to the charge."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
ch = [e for e in R.events if e['e'] == 'charge']; la = [e for e in R.events if e['e'] == 'laser']
hits = [e for e in R.events if e['e'] == 'hit']
def unit(v):
    n = math.sqrt(sum(c * c for c in v)); return [c / n for c in v]
def line_point(o, d, p):
    """distance from point p to ray o + s d (s>=0) and s"""
    rel = [p[i] - o[i] for i in range(3)]
    s = max(0.0, sum(rel[i] * d[i] for i in range(3)))
    q = [o[i] + d[i] * s for i in range(3)]
    return math.dist(q, p), s
def body_miss(o, d, feet, h=9.0):
    """min distance from the ray to the mech's vertical axis segment (sampled)"""
    best = (1e9, 0, 0)
    for k in range(0, 19):
        z = feet[2] + h * k / 18
        dd, s = line_point(o, d, (feet[0], feet[1], z))
        if dd < best[0]: best = (dd, s, z - feet[2])
    return best
recs = []
for L in la:
    s = L['id']; t = L['t']
    c0 = max([c for c in ch if c['id'] == s and c['t'] < t], key=lambda c: c['t'])
    o = L['from']; d = unit([L['to'][i] - o[i] for i in range(3)])
    blen = math.dist(L['from'], L['to'])
    # victim candidates at release
    best = None
    for m in R.ids:
        if m == s: continue
        for tt in (t, t - 1):
            pm = R.pos(m, tt)
            if pm is None: continue
            miss, sdist, hz = body_miss(o, d, pm)
            angle = math.degrees(math.atan2(miss, max(1.0, sdist)))
            if sdist <= 285 and (best is None or angle < best['ang']):
                best = {'m': m, 'ang': angle, 'miss': miss, 'dist': sdist, 'hz': hz, 'tt': tt}
    hs = [h for h in hits if h['t'] == t and h['w'] == 'laser' and h['src'] == s]
    rec = {'s': s, 'type': R.names[s], 't_charge': c0['t'], 't': t, 'dur': (t - c0['t']) * TICK, 'hit': bool(L['hits']), 'hits': L['hits'], 'amt': [h['amt'] for h in hs],
           'beam_len': blen, 'victim': best['m'] if best and best['ang'] < 12 else None, 'ang': best['ang'] if best else None, 'miss': best['miss'] if best else None, 'range': best['dist'] if best else None}
    if L['hits']: rec['victim'] = L['hits'][0]
    v = rec['victim']
    if v is not None:
        # geometry at release (tick t) and at decision ticks
        ps = R.pos(s, t) or R.pos(s, t - 1); pv = R.pos(v, t) or R.pos(v, t - 1); pv1 = R.pos(v, t - 1); pv2 = R.pos(v, t - 2)
        vv = R.vel(v, t - 2, back=True) or (0, 0, 0)
        rel = [pv[0] - ps[0], pv[1] - ps[1]]
        rng = math.hypot(*rel)
        lx, ly = rel[0] / rng, rel[1] / rng
        vlat = -vv[0] * ly + vv[1] * lx
        byaw = math.atan2(d[1], d[0])
        yaw_now = math.atan2(pv[1] - o[1], pv[0] - o[0])       # to victim at release tick
        yaw_obs = math.atan2(pv2[1] - ps[1], pv2[0] - ps[0]) if pv2 else None
        rec.update({'rng': rng, 'vlat': vlat, 'vspeed': math.hypot(vv[0], vv[1]),
                    'yaw_err_now_deg': math.degrees(angdiff(byaw, yaw_now)),
                    'signed_m': rng * angdiff(byaw, yaw_now) * (1 if vlat > 0 else -1),
                    'blocked': blen < best['dist'] - 3 if best and best['m'] == v else None,
                    'v_grounded': bool((R.row(v, t) or R.row(v, t - 2))[MFL] & 1),
                    'pitch_err_m': (o[2] + d[2] * rng / max(1e-6, math.hypot(d[0], d[1]))) - (pv[2] + 4.5)})
    recs.append(rec)
print('lasers fired %d ; hits %d (%.0f%%) ; charge durations (s): %s' % (len(recs), sum(1 for r in recs if r['hit']), 100 * sum(1 for r in recs if r['hit']) / len(recs), dict(collections.Counter(round(r['dur'], 2) for r in recs))))
rows = []
for ty in TYPES:
    g = [r for r in recs if r['type'] == ty]
    if not g: continue
    rows.append([ty, len(g), sum(1 for r in g if r['hit']), median([r['rng'] for r in g if r.get('rng')]) if any(r.get('rng') for r in g) else float('nan')])
print(table(['type', 'beams', 'hits', 'median range'], rows))
print('\nper beam: shooter type t range hit | victim | lateral speed of victim | beam yaw error vs victim centre at release (deg) | signed lateral miss (m; + = ahead of victim motion) | body miss (m) | pitch err (m) | blocked')
for r in recs:
    if r['victim'] is None:
        print('  %2d %-9s t=%4d  no victim within 12 deg of the beam (beam length %.0f)' % (r['s'], r['type'], r['t'], r['beam_len'])); continue
    print('  %2d %-9s t=%4d rng %5.1f %s | v=%2d | vlat %+5.1f spd %4.1f %s | yaw err %+5.2f | signed %+5.1f | miss %4.1f | dz %+4.1f | %s' % (r['s'], r['type'], r['t'], r['rng'], 'HIT ' if r['hit'] else 'miss', r['victim'], r['vlat'], r['vspeed'], 'gnd' if r['v_grounded'] else 'air', r['yaw_err_now_deg'], r['signed_m'], r['miss'], r['pitch_err_m'], 'BLOCKED' if r.get('blocked') else ''))
mv = [r for r in recs if r['victim'] is not None and not r['hit'] and not r.get('blocked')]
print('\nmisses with an identified victim (unblocked): %d ; signed lateral miss mean %+.1f m ; ahead of motion (>+2.5 m): %d ; behind (<-2.5 m): %d ; within 2.5 m laterally (vertical/other): %d' % (len(mv), mean([r['signed_m'] for r in mv]), sum(1 for r in mv if r['signed_m'] > 2.5), sum(1 for r in mv if r['signed_m'] < -2.5), sum(1 for r in mv if abs(r['signed_m']) <= 2.5)))
hv = [r for r in recs if r['hit']]
print('hits: victim lateral speed |vlat| median %.1f ; misses: %.1f' % (median([abs(r['vlat']) for r in hv]), median([abs(r['vlat']) for r in mv])))
print('range: hits median %.0f m (min %.0f max %.0f) ; misses median %.0f m' % (median([r['rng'] for r in hv]), min(r['rng'] for r in hv), max(r['rng'] for r in hv), median([r['rng'] for r in mv])))
# does lateral miss scale like a gun lead (vlat * rng / 140)?  regress signed_m on vlat*rng
xs = [abs(r['vlat']) * r['rng'] for r in mv + hv]; ys = [r['signed_m'] for r in mv + hv]
mx, my = mean(xs), mean(ys)
k = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
print('regression signed_miss = k * |vlat| * range + b: k = %.5f s/m -> implied projectile speed 1/k = %.0f m/s ; b = %.2f ; n = %d' % (k, 1 / k if k else float('nan'), my - k * mx, len(xs)))
dump('lasers.json', recs)

# ---- victim reaction during the charge window
print('\n## victim behaviour during the 0.65 s charge (victim identified at release)')
def lat_series(s, v, t0, t1):
    out = []
    for t in range(t0, t1 + 1, 2):
        ps = R.pos(s, t); pv = R.pos(v, t); vv = R.vel(v, t, back=True)
        if not ps or not pv or not vv: out.append(None); continue
        rel = (pv[0] - ps[0], pv[1] - ps[1]); rng = math.hypot(*rel)
        out.append((-vv[0] * rel[1] + vv[1] * rel[0]) / rng)
    return out
stats = collections.Counter()
for r in recs:
    v = r['victim']
    if v is None: continue
    s = r['s']; t0 = r['t_charge'] - 1; t1 = r['t']
    # in victim's view? within 200 m and LOS; charge sound range 140 m
    ps = R.pos(s, t0); pv = R.pos(v, t0)
    if not ps or not pv: continue
    d0 = math.dist(ps, pv)
    aimv = R.row(v, t0)[MYAW]
    bearing_to_s = math.atan2(ps[1] - pv[1], ps[0] - pv[0])
    in_fov = abs(angdiff(aimv, bearing_to_s)) <= math.radians(60) or d0 <= 45
    lat = lat_series(s, v, t0, t1)
    lat = [x for x in lat if x is not None]
    flips = sum(1 for a, b in zip(lat, lat[1:]) if a * b < 0 and abs(a - b) > 3)
    g0 = R.row(v, t0)[MFL] & 1; jumped = g0 and any(not (R.row(v, t)[MFL] & 1) for t in range(t0 + 2, t1 + 1, 2) if R.row(v, t))
    boosted = (not (R.row(v, t0)[MFL] & 2)) and any((R.row(v, t)[MFL] & 2) for t in range(t0 + 2, t1 + 1, 2) if R.row(v, t))
    los0 = W.los(ps[0], ps[1], ps[2] + 7, pv[0], pv[1], pv[2] + 4.5) >= 1; p1s = R.pos(s, t1); p1v = R.pos(v, t1)
    los1 = W.los(p1s[0], p1s[1], p1s[2] + 7, p1v[0], p1v[1], p1v[2] + 4.5) >= 1 if p1s and p1v else None
    stats['n'] += 1; stats['in_fov' if in_fov else 'not_in_fov'] += 1
    key = 'fov' if in_fov else 'nofov'
    stats[key + '_flip'] += 1 if flips else 0; stats[key + '_jump'] += 1 if jumped else 0; stats[key + '_boost'] += 1 if boosted else 0
    stats[key + '_los_broken'] += 1 if (los0 and los1 is False) else 0
    stats[key + '_hit'] += 1 if r['hit'] else 0
    stats['within_140m_sound'] += 1 if d0 <= 140 else 0
print(dict(stats))
# baseline: same statistics for random 0.7 s windows of the same victim while it is a gun target (from gunshots)
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
base = collections.Counter()
seen = set()
for o in G:
    if o['tgt'] is None or o['tgt'] >= 100: continue
    v = o['tgt']; s = o['s']; t0 = o['tf'] - 1
    if (v, t0 // 14) in seen: continue
    seen.add((v, t0 // 14))
    t1 = t0 + 14
    if not R.row(v, t1) or not R.row(s, t1): continue
    lat = [x for x in lat_series(s, v, t0, t1) if x is not None]
    flips = sum(1 for a, b in zip(lat, lat[1:]) if a * b < 0 and abs(a - b) > 3)
    g0 = R.row(v, t0)[MFL] & 1; jumped = g0 and any(not (R.row(v, t)[MFL] & 1) for t in range(t0 + 2, t1 + 1, 2) if R.row(v, t))
    boosted = (not (R.row(v, t0)[MFL] & 2)) and any((R.row(v, t)[MFL] & 2) for t in range(t0 + 2, t1 + 1, 2) if R.row(v, t))
    base['n'] += 1; base['flip'] += 1 if flips else 0; base['jump'] += 1 if jumped else 0; base['boost'] += 1 if boosted else 0
print('baseline (0.7 s windows while being shot at with guns):', dict(base), ' -> flip %.0f%% jump %.0f%% boost-start %.0f%%' % (100 * base['flip'] / base['n'], 100 * base['jump'] / base['n'], 100 * base['boost'] / base['n']))
