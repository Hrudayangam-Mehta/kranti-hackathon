"""Section 3: movement while fighting (strafe, range keeping, jumps/jets), scanning when not fighting."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
shots_by = collections.defaultdict(list)
for o in G:
    if o['tgt'] is not None and o['tgt'] < 100: shots_by[o['s']].append((o['tf'], o['tgt']))
for s in shots_by: shots_by[s].sort()
# engaged target per frame: last mech shot within 40 ticks before, or next within 10 ticks
import bisect
def engaged(s, tick):
    lst = shots_by.get(s)
    if not lst: return None
    i = bisect.bisect_right(lst, (tick, 999)) - 1
    if i >= 0 and tick - lst[i][0] <= 40 and R.alive(lst[i][1], tick): return lst[i][1]
    if i + 1 < len(lst) and lst[i + 1][0] - tick <= 10 and R.alive(lst[i + 1][1], tick): return lst[i + 1][1]
    return None
slot = {}
def weapons(mid, tick):
    r = R.row(mid, tick)
    return (R.wk[r[MS0]] if r[MS0] >= 0 else None, R.wk[r[MS1]] if r[MS1] >= 0 else None)
F = collections.defaultdict(list)      # per mech list of frame dicts (engaged only)
allf = collections.defaultdict(list)
for mid in R.ids:
    rows = R.m[mid]
    for k in range(1, R.nf):
        a, b = rows[k - 1], rows[k]
        if not a or not b or R.ticks[k] - R.ticks[k - 1] != 2: continue
        t = R.ticks[k]
        v = ((b[MX] - a[MX]) / 0.1, (b[MY] - a[MY]) / 0.1, (b[MZ] - a[MZ]) / 0.1)
        tg = engaged(mid, t)
        rec = {'t': t, 'v': v, 'sp': math.hypot(v[0], v[1]), 'gr': bool(b[MFL] & 1), 'bo': bool(b[MFL] & 2), 'ch': bool(b[MFL] & 4), 'tg': tg, 'hpf': b[MHP] / b[MMAX], 'en': b[MEN]}
        if tg is not None:
            pt = R.pos(tg, t)
            rel = (pt[0] - b[MX], pt[1] - b[MY]); d = math.hypot(*rel)
            rec['d'] = d
            rec['vr'] = (v[0] * rel[0] + v[1] * rel[1]) / d      # + = approaching
            rec['vl'] = (-v[0] * rel[1] + v[1] * rel[0]) / d
            rec['w1'] = weapons(mid, t)[1]
        allf[mid].append(rec)
res = {}
print('## engaged frames (0.1 s each): own velocity relative to the engaged target')
rows = []
for ty in ['ALL'] + TYPES:
    fr = [r for mid in R.ids if (ty == 'ALL' or R.names[mid] == ty) for r in allf[mid] if r['tg'] is not None]
    if not fr: continue
    gfr = [r for r in fr if r['gr']]
    n = len(fr)
    rows.append([ty, n / 10.0, mean([r['sp'] for r in gfr]), 100.0 * sum(1 for r in gfr if r['sp'] < 1) / len(gfr), 100.0 * sum(1 for r in fr if not r['gr']) / n, 100.0 * sum(1 for r in fr if r['bo']) / n,
                 mean([abs(r['vl']) for r in gfr]), mean([r['vr'] for r in gfr]), 100.0 * sum(1 for r in gfr if r['vr'] > 3) / len(gfr), 100.0 * sum(1 for r in gfr if r['vr'] < -3) / len(gfr), 100.0 * sum(1 for r in gfr if abs(r['vl']) > 5) / len(gfr)])
    res[ty] = {'engaged_s': n / 10.0, 'mean_ground_speed': rows[-1][2], 'pct_still': rows[-1][3], 'pct_airborne': rows[-1][4], 'pct_boost_flag': rows[-1][5], 'mean_abs_lateral': rows[-1][6], 'mean_radial_closing': rows[-1][7], 'pct_approach': rows[-1][8], 'pct_retreat': rows[-1][9], 'pct_strafe': rows[-1][10]}
print(table(['type', 'engaged s', 'mean ground speed', '% standing', '% airborne', '% boost flag', 'mean |v_lat|', 'mean v_radial (+ = closing)', '% closing >3', '% opening >3', '% |v_lat|>5'], rows))
# ---- distance distribution while engaged, by secondary weapon
print('\n## engagement distance while engaged (m)')
rows = []
for ty in ['ALL'] + TYPES:
    d = [r['d'] for mid in R.ids if (ty == 'ALL' or R.names[mid] == ty) for r in allf[mid] if r['tg'] is not None]
    if d: rows.append([ty, len(d) / 10.0, pct(d, .1), pct(d, .25), pct(d, .5), pct(d, .75), pct(d, .9)])
    res.setdefault(ty, {})['dist_p10_p50_p90'] = [pct(d, .1), pct(d, .5), pct(d, .9)] if d else None
print(table(['type', 'engaged s', 'p10', 'p25', 'p50', 'p75', 'p90'], rows))
rows = []
for w in ('none', 'laser', 'mortar', 'lightning'):
    d = [r['d'] for mid in R.ids for r in allf[mid] if r['tg'] is not None and (r['w1'] or 'none') == w]
    vr = [r['vr'] for mid in R.ids for r in allf[mid] if r['tg'] is not None and (r['w1'] or 'none') == w and r['gr']]
    if d: rows.append([w, len(d) / 10.0, pct(d, .1), pct(d, .5), pct(d, .9), mean(vr)])
print(table(['slot-1 weapon', 'engaged s', 'dist p10', 'p50', 'p90', 'mean closing speed'], rows))
# ---- closing behaviour as a function of distance
print('\n## mean closing speed (m/s, + = approaching target) by current distance bucket, grounded frames')
rows = []
BK = [(0, 30), (30, 50), (50, 70), (70, 100), (100, 140), (140, 240)]
for ty in ['ALL'] + TYPES:
    row = [ty]
    for lo, hi in BK:
        v = [r['vr'] for mid in R.ids if (ty == 'ALL' or R.names[mid] == ty) for r in allf[mid] if r['tg'] is not None and r['gr'] and lo <= r['d'] < hi]
        row.append('%+.1f (n=%d)' % (mean(v), len(v)) if len(v) >= 15 else 'n<15')
        res.setdefault('closing_num', {}).setdefault(ty, {})['%d-%d' % (lo, hi)] = {'mean': mean(v) if v else None, 'n': len(v)}
    rows.append(row)
print(table(['type'] + ['%d-%d m' % b for b in BK], rows))
res['closing_by_dist'] = {r[0]: r[1:] for r in rows}
# ---- strafe reversals: sign changes of lateral velocity during continuous engagement
print('\n## strafe direction reversals during engagement (lateral velocity sign change with |v_lat|>3 on both sides)')
rows = []
allint = []
for ty in ['ALL'] + TYPES:
    ints = []; eng_time = 0
    for mid in R.ids:
        if ty != 'ALL' and R.names[mid] != ty: continue
        last_sign = 0; last_t = None; prev_t = None
        for r in allf[mid]:
            if r['tg'] is None or (prev_t is not None and r['t'] - prev_t > 2):
                last_sign = 0; last_t = None
            prev_t = r['t']
            if r['tg'] is None: continue
            eng_time += 0.1
            if abs(r['vl']) > 3:
                sg = 1 if r['vl'] > 0 else -1
                if last_sign and sg != last_sign and last_t is not None:
                    ints.append((r['t'] - last_t) * TICK)
                if sg != last_sign: last_t = r['t']
                last_sign = sg
    if ints:
        rows.append([ty, eng_time, len(ints), len(ints) / eng_time * 60, pct(ints, .1), pct(ints, .25), median(ints), pct(ints, .75), pct(ints, .9)])
        res.setdefault(ty, {})['strafe_interval_p10_p50_p90'] = [pct(ints, .1), median(ints), pct(ints, .9)]
    if ty == 'ALL': allint = ints
print(table(['type', 'engaged s', 'reversals', 'per minute', 'interval p10 (s)', 'p25', 'p50', 'p75', 'p90'], rows))
print('  interval histogram (0.2 s bins up to 4 s):', [sum(1 for x in allint if lo <= x < lo + 0.2) for lo in [i * 0.2 for i in range(20)]], '>=4s:', sum(1 for x in allint if x >= 4))
# ---- airborne hops: starts per minute engaged vs not engaged; apex heights
segs = json.load(open(os.path.join(OUT, 'mech_move.json')))['segs']
eng_time = collections.Counter(); tot_time = collections.Counter()
for mid in R.ids:
    for r in allf[mid]:
        tot_time[R.names[mid]] += 0.1
        if r['tg'] is not None: eng_time[R.names[mid]] += 0.1
hop = collections.defaultdict(lambda: [0, 0]); apex_e = []; apex_n = []
for sgm in segs:
    mid = sgm['mid']; e = engaged(mid, sgm['t0'] + 2) is not None
    hop[R.names[mid]][0 if e else 1] += 1
    (apex_e if e else apex_n).append(sgm['apex'])
print('\n## airborne segments (jump / jet hops)')
rows = []
for ty in TYPES:
    e, n = hop[ty]
    rows.append([ty, e, eng_time[ty], e / max(1e-9, eng_time[ty]) * 60, n, tot_time[ty] - eng_time[ty], n / max(1e-9, tot_time[ty] - eng_time[ty]) * 60])
    res.setdefault(ty, {})['hops_per_min_engaged'] = rows[-1][3]; res[ty]['hops_per_min_idle'] = rows[-1][6]
print(table(['type', 'hops while engaged', 'engaged s', 'hops/min engaged', 'hops not engaged', 'other s', 'hops/min otherwise'], rows))
print('  apex above take-off: engaged p25 %.1f p50 %.1f p75 %.1f max %.1f (n=%d) ; not engaged p25 %.1f p50 %.1f p75 %.1f max %.1f (n=%d)' % (pct(apex_e, .25), pct(apex_e, .5), pct(apex_e, .75), max(apex_e), len(apex_e), pct(apex_n, .25), pct(apex_n, .5), pct(apex_n, .75), max(apex_n), len(apex_n)))
ah = collections.Counter(round(a) for a in apex_e + apex_n); print('  apex histogram (m: count):', sorted(ah.items()))
durs = collections.Counter(round(s['dur'], 1) for s in segs); print('  airborne duration modes (s):', durs.most_common(6))
# energy at hop start & interval between hops while engaged
iv = []
for mid in R.ids:
    ss = sorted([s for s in segs if s['mid'] == mid], key=lambda s: s['t0'])
    for a, b in zip(ss, ss[1:]):
        if engaged(mid, a['t0'] + 2) is not None and engaged(mid, b['t0'] + 2) is not None:
            iv.append((b['t0'] - a['t1']) * TICK)
print('  ground time between consecutive hops while engaged: p10 %.1f p50 %.1f p90 %.1f s (n=%d)' % (pct(iv, .1), median(iv), pct(iv, .9), len(iv)))
e0 = [s['e0'] for s in segs if s['jet']]; print('  energy at jet-hop start: p10 %.0f p50 %.0f p90 %.0f ; min energy during hop p50 %.0f' % (pct(e0, .1), median(e0), pct(e0, .9), median([s['emin'] for s in segs if s['jet']])))
dump('movement.json', res)
