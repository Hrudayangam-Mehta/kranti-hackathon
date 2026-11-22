"""Section 1 analysis: gun aiming model, lead, angular error, hit rates."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
mm = [o for o in G if o['tgt'] is not None and o['tgt'] < 100]
res = {}
def kind(o):
    t = o['tgt']
    return 'none' if t is None else 'mech' if t < 100 else 'npc' if t < 1000 else 'crate'
print('## shots by target kind')
rows = []
for ty in TYPES + ['ALL']:
    g = [o for o in G if ty == 'ALL' or o['type'] == ty]
    kc = collections.Counter(kind(o) for o in g)
    m = [o for o in g if kind(o) == 'mech']
    h = sum(1 for o in m if o['hit'])
    rows.append([ty, len(g), kc['mech'], kc['npc'], kc['crate'], h, 100.0 * h / max(1, len(m)), sum(1 for o in m if o['blocked'])])
print(table(['type', 'gun shots', 'at mech', 'at drone', 'at crate', 'mech hits', 'hit %', 'blocked by geometry'], rows))
res['by_type_hit'] = {r[0]: {'shots_at_mech': r[2], 'hits': r[5], 'hit_pct': r[6]} for r in rows}
# npc / crate hit rates
for k in ('npc', 'crate'):
    g = [o for o in G if kind(o) == k]
    print('%s shots %d hits %d (%.0f%%)' % (k, len(g), sum(1 for o in g if o['hit_ent'] == o['tgt']), 100 * sum(1 for o in g if o['hit_ent'] == o['tgt']) / len(g)))

def wilson(k, n):
    if n == 0: return (float('nan'), float('nan'))
    z = 1.96; p = k / n
    den = 1 + z * z / n
    c = (p + z * z / (2 * n)) / den; h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (100 * (c - h), 100 * (c + h))

print('\n## hit rate vs range (all shots at mechs; blocked shots counted as misses)')
RB = [(0, 40), (40, 80), (80, 130), (130, 230.5)]
rows = []
res['hit_vs_range'] = {}
for ty in ['ALL'] + TYPES:
    row = [ty]
    for lo, hi in RB:
        g = [o for o in mm if (ty == 'ALL' or o['type'] == ty) and lo <= o['rng'] < hi]
        h = sum(1 for o in g if o['hit'])
        row.append('%d/%d = %s' % (h, len(g), ('%.0f%%' % (100 * h / len(g))) if g else 'n/a'))
        res['hit_vs_range'].setdefault(ty, {})['%d-%d' % (lo, hi)] = {'n': len(g), 'hits': h}
    rows.append(row)
print(table(['type'] + ['%d-%d m' % (lo, min(hi, 230)) for lo, hi in RB], rows))
for lo, hi in RB:
    g = [o for o in mm if lo <= o['rng'] < hi]; h = sum(1 for o in g if o['hit'])
    print('   %d-%d m: 95%% CI %.0f-%.0f%%' % ((lo, min(hi, 230)) + wilson(h, len(g))))
print('range of shots at mechs: p5 %.0f p25 %.0f p50 %.0f p75 %.0f p95 %.0f max %.0f' % tuple(pct([o['rng'] for o in mm], q) for q in (.05, .25, .5, .75, .95, 1)))
far = [o for o in mm if o['rng'] > 230]; print('shots fired at targets beyond 230 m: %d' % len(far))

print('\n## hit rate vs target lateral speed (m/s, perpendicular to line of sight; replay walk=9, boost=15)')
LB = [(0, 1), (1, 4), (4, 7.5), (7.5, 10), (10, 99)]
rows = []
res['hit_vs_lat'] = {}
for lo, hi in LB:
    g = [o for o in mm if lo <= abs(o['vlat']) < hi and not o['blocked']]
    h = sum(1 for o in g if o['hit'])
    ci = wilson(h, len(g))
    rows.append(['%g-%g' % (lo, hi), len(g), h, 100.0 * h / max(1, len(g)), '%.0f-%.0f' % ci, median([o['rng'] for o in g]) if g else float('nan')])
    res['hit_vs_lat']['%g-%g' % (lo, hi)] = {'n': len(g), 'hits': h}
print(table(['|v_lat|', 'shots (unblocked)', 'hits', 'hit %', '95% CI', 'median range'], rows))
print('\n## hit rate: range x lateral speed (unblocked)')
rows = []
for lo, hi in RB:
    row = ['%d-%d m' % (lo, min(hi, 230))]
    for l0, l1 in ((0, 4), (4, 7.5), (7.5, 99)):
        g = [o for o in mm if lo <= o['rng'] < hi and l0 <= abs(o['vlat']) < l1 and not o['blocked']]
        h = sum(1 for o in g if o['hit'])
        row.append('%d/%d = %s' % (h, len(g), ('%.0f%%' % (100 * h / len(g))) if g else 'n/a'))
    rows.append(row)
print(table(['range', '|v_lat| 0-4', '4-7.5', '>= 7.5'], rows))
# target state: stationary vs constant velocity vs accelerating during flight
print('\n## hit rate vs target acceleration during bullet flight (|dv| between fire and arrival), unblocked, range >= 40')
rows = []
for lo, hi in ((0, 1), (1, 4), (4, 9), (9, 99)):
    g = [o for o in mm if lo <= o['dv_flight'] < hi and not o['blocked'] and o['rng'] >= 40]
    h = sum(1 for o in g if o['hit'])
    rows.append(['%g-%g' % (lo, hi), len(g), h, 100.0 * h / max(1, len(g)), median([abs(o['vlat']) for o in g]) if g else float('nan')])
print(table(['|dv| m/s', 'shots', 'hits', 'hit %', 'median |v_lat|'], rows))

# ---------- lead model
def regress(xs, ys):
    n = len(xs)
    if n < 5: return (float('nan'), float('nan'), float('nan'), n)
    mx, my = mean(xs), mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0: return (float('nan'), float('nan'), float('nan'), n)
    k = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    b = my - k * mx
    r = [y - (k * x + b) for x, y in zip(xs, ys)]
    return (k, b, sd(r), n)
print('\n## lead model: yaw_used = k * yaw_needed(first-order intercept from the last observation) + b ; angles in deg')
print('   (yaw_used = bullet yaw - direct bearing at obs tick; needed = intercept bearing - direct bearing)')
rows = []
res['lead'] = {}
def ldata(g):
    xs = [math.degrees(angdiff(o['lyaw'], o['dyaw'])) for o in g]
    ys = [math.degrees(angdiff(o['yaw'], o['dyaw'])) for o in g]
    return xs, ys
for ty in ['ALL'] + TYPES:
    g = [o for o in mm if (ty == 'ALL' or o['type'] == ty) and o['q'] == 'track' and o['rng'] >= 30]
    xs, ys = ldata(g)
    k, b, s, n = regress(xs, ys)
    big = [(x, y) for x, y in zip(xs, ys) if abs(x) >= 1.5]
    ratio = median([y / x for x, y in big]) if big else float('nan')
    sd_direct = sd(ys); sd_lead = sd([y - x for x, y in zip(xs, ys)])
    rows.append([ty, n, k, b, s, len(big), ratio, sd_direct, sd_lead])
    res['lead'][ty] = {'n': n, 'slope': k, 'intercept_deg': b, 'resid_sd_deg': s, 'median_ratio_when_needed_ge_1.5deg': ratio, 'sd_vs_direct': sd_direct, 'sd_vs_full_lead': sd_lead}
print(table(['type', 'n', 'slope k', 'offset b', 'resid sd', 'n(|need|>=1.5)', 'median used/need', 'sd(used) i.e. no-lead hyp', 'sd(used-need) i.e. full-lead hyp'], rows))
# lead by range bucket
print('\n   slope by range bucket (ALL):')
rows = []
for lo, hi in RB:
    g = [o for o in mm if o['q'] == 'track' and max(lo, 20) <= o['rng'] < hi]
    xs, ys = ldata(g); k, b, s, n = regress(xs, ys)
    rows.append(['%d-%d' % (lo, min(hi, 230)), n, k, b, s])
print(table(['range', 'n', 'slope', 'offset', 'resid sd'], rows))
# pitch
print('\n## pitch: bullet pitch - pitch to target centre (z+4.5), converted to metres at the target (rng * dpitch)')
rows = []
for ty in ['ALL'] + TYPES:
    g = [o for o in mm if (ty == 'ALL' or o['type'] == ty) and o['q'] == 'track' and o['rng'] >= 30 and o['t_grounded'] and abs(o['tvz']) < 0.5]
    dm = [o['rng'] * (o['pitch'] - o['dpitch_c']) for o in g]
    dd = [math.degrees(o['pitch'] - o['dpitch_c']) for o in g]
    rows.append([ty, len(g), mean(dm), median(dm), sd(dm), mean(dd), sd(dd)])
print(table(['type', 'n', 'mean dz (m)', 'median dz', 'sd dz', 'mean (deg)', 'sd (deg)'], rows))
# ---------- error relative to the true intercept (what was needed to hit centre)
print('\n## angular error relative to the TRUE intercept direction (actual future target position), deg')
rows = []
res['ang_err'] = {}
for ty in ['ALL'] + TYPES:
    g = [o for o in mm if (ty == 'ALL' or o['type'] == ty) and o['q'] == 'track' and o['rng'] >= 20]
    ey = [math.degrees(angdiff(o['yaw'], o['tyaw'])) for o in g]
    ep = [math.degrees(o['pitch'] - o['tpitch']) for o in g]
    tot = [o['a_true'] for o in g]
    # signed along target motion: positive = bullet ahead of target, negative = behind (lag)
    lag = [math.degrees(angdiff(o['yaw'], o['tyaw'])) * (1 if o['vlat'] > 0 else -1) for o in g if abs(o['vlat']) >= 4]
    lagm = [o['rng'] * math.radians(math.degrees(angdiff(o['yaw'], o['tyaw'])) * (1 if o['vlat'] > 0 else -1)) for o in g if abs(o['vlat']) >= 4]
    rows.append([ty, len(g), sd(ey), sd(ep), pct(tot, .5), pct(tot, .9), len(lag), mean(lag), mean(lagm)])
    res['ang_err'][ty] = {'n': len(g), 'yaw_sd_deg': sd(ey), 'pitch_sd_deg': sd(ep), 'total_p50_deg': pct(tot, .5), 'total_p90_deg': pct(tot, .9), 'signed_lead_err_deg_when_vlat_ge4': mean(lag), 'signed_lead_err_m': mean(lagm)}
print(table(['type', 'n', 'yaw err sd', 'pitch err sd', 'total p50', 'total p90', 'n(|v_lat|>=4)', 'mean signed err (deg, - = behind target)', 'same in m at target'], rows))
# distribution of total angular error
tot = [o['a_true'] for o in mm if o['q'] == 'track' and o['rng'] >= 20]
print('total angular error percentiles (deg): p10 %.2f p25 %.2f p50 %.2f p75 %.2f p90 %.2f p95 %.2f p99 %.2f' % tuple(pct(tot, q) for q in (.1, .25, .5, .75, .9, .95, .99)))
hist = collections.Counter(min(8, int(a)) for a in tot)
print('histogram (deg bins 0-1,1-2,...,8+):', [hist[i] for i in range(9)])
# miss distance
ms = [o['miss'] for o in mm if not o['blocked']]
print('miss distance at closest approach to body axis (m), unblocked: p10 %.2f p25 %.2f p50 %.2f p75 %.2f p90 %.2f p95 %.2f  (hit if < 2.8)' % tuple(pct(ms, q) for q in (.1, .25, .5, .75, .9, .95)))
res['miss_m'] = {q: pct(ms, q) for q in (.1, .25, .5, .75, .9)}
# hit rate as function of ideal lateral lead time (range/140 * vlat)
print('\n## lateral displacement the target makes during bullet flight (|v_lat| * range/140) vs hit rate (unblocked)')
rows = []
for lo, hi in ((0, 0.5), (0.5, 2), (2, 4), (4, 7), (7, 12), (12, 99)):
    g = [o for o in mm if lo <= abs(o['vlat']) * o['rng'] / 140 < hi and not o['blocked']]
    h = sum(1 for o in g if o['hit'])
    rows.append(['%g-%g m' % (lo, hi), len(g), h, 100.0 * h / max(1, len(g))])
print(table(['needed lead (m)', 'shots', 'hits', 'hit %'], rows))
dump('aiming.json', res)
