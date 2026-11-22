"""Extra tables: hit rate vs bullet flight time; sustained out-of-FOV attacks; fire discipline; gun DPS."""
import sys, os, math, collections, json, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
mm = [o for o in G if o['tgt'] is not None and o['tgt'] < 100]
print('## hit rate vs bullet flight time (range / 140 m/s); all shots at mechs, and unblocked + grounded-target subset')
rows = []; model = []
for lo, hi in ((0, .2), (.2, .3), (.3, .4), (.4, .5), (.5, .6), (.6, .7), (.7, .8), (.8, .9), (.9, 1.0), (1.0, 1.2), (1.2, 1.7)):
    g = [o for o in mm if lo <= o['rng'] / 140 < hi]
    g2 = [o for o in g if not o['blocked'] and o['t_grounded']]
    g3 = [o for o in g if not o['blocked'] and not o['t_grounded']]
    h = sum(1 for o in g if o['hit']); h2 = sum(1 for o in g2 if o['hit']); h3 = sum(1 for o in g3 if o['hit'])
    rows.append(['%.1f-%.1f' % (lo, hi), '%d-%d' % (lo * 140, hi * 140), '%d-%d' % (lo * 252, hi * 252), len(g), 100.0 * h / max(1, len(g)), len(g2), 100.0 * h2 / max(1, len(g2)), len(g3), 100.0 * h3 / max(1, len(g3))])
    model.append({'tau_lo': lo, 'tau_hi': hi, 'n': len(g), 'hit': h, 'n_grounded_unblocked': len(g2), 'hit_grounded_unblocked': h2})
print(table(['flight time s', 'range in replay (140 m/s)', 'same flight time at 252 m/s', 'shots', 'hit %', 'grounded tgt shots', 'hit %', 'airborne tgt shots', 'hit %'], rows))
dump('hit_vs_tau.json', model)
# hit rate vs what the target did during the flight
print('\n## grounded targets, unblocked, flight time 0.3-1.0 s: hit rate by target manoeuvre during flight')
def manoeuvre(o):
    ve = o['ve']; c = o['tgt']; T = o['T_arr']
    v2 = R.vel(c, min(int(T), R.end_tick - 1), back=True) or ve
    s1 = math.hypot(ve[0], ve[1]); s2 = math.hypot(v2[0], v2[1])
    if s1 < 2 and s2 < 2: return 'stationary throughout'
    if s1 < 2: return 'started moving'
    if s2 < 2: return 'stopped'
    cosang = (ve[0] * v2[0] + ve[1] * v2[1]) / (s1 * s2)
    if cosang > 0.9 and abs(s2 - s1) < 2: return 'kept velocity (<25 deg turn)'
    if cosang < -0.5: return 'reversed (>120 deg turn)'
    if cosang < 0.5: return 'turned 60-120 deg'
    return 'turned 25-60 deg / changed speed'
cnt = collections.defaultdict(lambda: [0, 0])
for o in mm:
    if o['blocked'] or not o['t_grounded'] or not (0.3 <= o['rng'] / 140 < 1.0): continue
    k = manoeuvre(o); cnt[k][0] += 1; cnt[k][1] += 1 if o['hit'] else 0
print(table(['target manoeuvre between fire and arrival', 'shots', 'hits', 'hit %'], [[k, v[0], v[1], 100.0 * v[1] / v[0]] for k, v in sorted(cnt.items(), key=lambda kv: -kv[1][0])]))
# ---- sustained attacks from outside FOV
recs = json.load(open(os.path.join(OUT, 'reactions.json')))
print('\n## attacker outside the victim FOV at first hit, by how sustained the attack was')
rows = []
for label, cond in (('1-2 hits', lambda r: r['n_hits'] <= 2), ('3-5 hits', lambda r: 3 <= r['n_hits'] <= 5), ('>= 6 hits', lambda r: r['n_hits'] >= 6)):
    g = [r for r in recs if not r['in_fov'] and cond(r)]
    tr = [r['turn'] for r in g if r['turn'] is not None]; rt = [r['ret'] for r in g if r['ret'] is not None]
    rows.append([label, len(g), len(tr), median(tr) if tr else float('nan'), max(tr) if tr else float('nan'), len(rt), median(rt) if rt else float('nan'), sum(1 for r in g if r['died'])])
print(table(['attack size (hits by that attacker within 10 s)', 'n', 'victim turned to attacker', 'median s', 'max s', 'returned fire', 'median s', 'victim died within 10 s'], rows))
g = [r for r in recs if not r['in_fov'] and r['n_hits'] >= 3]
print('  free hits before the victim faced the attacker (sustained cases):', [(r['V'], r['X'], r['n_hits'], r['turn'], r['ret']) for r in g])
# hits landed before the victim's first return shot, all onsets
hits = [e for e in R.events if e['e'] == 'hit' and e['dst'] < 100 and e['src'] is not None and e['src'] < 100]
free = []
for r in recs:
    tend = r['t0'] + (r['ret'] / TICK if r['ret'] is not None else 200)
    n = sum(1 for h in hits if h['dst'] == r['V'] and h['src'] == r['X'] and r['t0'] <= h['t'] <= tend)
    d = sum(h['amt'] for h in hits if h['dst'] == r['V'] and h['src'] == r['X'] and r['t0'] <= h['t'] <= tend)
    free.append((r['in_fov'], n, d))
for f in (True, False):
    g = [x for x in free if x[0] == f]
    print('  attacker %s victim FOV at first hit: n=%d ; damage dealt before the victim first shoots back (or 10 s): median %.0f mean %.0f' % ('inside' if f else 'OUTSIDE', len(g), median([x[2] for x in g]), mean([x[2] for x in g])))
# ---- fire discipline: LOS at fire, range at fire
los_n = 0; n = 0; nolos = []
for o in mm:
    s, c, E = o['s'], o['tgt'], o['tf'] - 1
    ps = R.pos(s, E); pc = R.pos(c, E)
    v = W.los(ps[0], ps[1], ps[2] + 7, pc[0], pc[1], pc[2] + 4.5) >= 1.0 or W.los(ps[0], ps[1], ps[2] + 7, pc[0], pc[1], pc[2] + 9) >= 1.0 or W.los(ps[0], ps[1], ps[2] + 7, pc[0], pc[1], pc[2] + 0.5) >= 1.0
    n += 1; los_n += 1 if v else 0
    if not v: nolos.append(o)
print('\n## fire discipline: shots at mechs fired with a clear muzzle line to some part of the target (feet/centre/top): %d of %d (%.1f%%)' % (los_n, n, 100.0 * los_n / n))
print('  shots without a clear line by type:', dict(collections.Counter(o['type'] for o in nolos)), '; of those that hit anyway:', sum(1 for o in nolos if o['hit']))
# run of no-LOS shots: do they keep firing at last-seen/predicted position?
# ---- effective gun DPS per engaged second
print('\n## realised gun damage rate: damage dealt to mechs with the gun per second of engagement (shot within 2 s)')
shots_by = collections.defaultdict(list)
for o in mm: shots_by[o['s']].append(o['tf'])
dmg = collections.Counter(); eng = collections.Counter(); nshots = collections.Counter()
for h in hits:
    if h['w'] == 'gun': dmg[R.names[h['src']]] += h['amt']
for s, ts in shots_by.items():
    ts.sort(); t_eng = 0; last = None
    for t in ts:
        if last is None or t - last > 40: t_eng += 40
        else: t_eng += t - last
        last = t
    eng[R.names[s]] += t_eng * TICK; nshots[R.names[s]] += len(ts)
rows = [[ty, nshots[ty], eng[ty], nshots[ty] / eng[ty], dmg[ty], dmg[ty] / eng[ty]] for ty in ('expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer')]
rows.append(['ALL', sum(nshots.values()), sum(eng.values()), sum(nshots.values()) / sum(eng.values()), sum(dmg.values()), sum(dmg.values()) / sum(eng.values())])
print(table(['type', 'shots at mechs', 'engaged s', 'shots/s', 'gun damage to mechs', 'damage per engaged s'], rows))
print('  (replay build: one shot per 0.40 s, 12-round magazine, 2.5 s reload -> at most 1.74 shots/s sustained)')
