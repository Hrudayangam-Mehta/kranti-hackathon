"""Section 2: target selection, stickiness, switching.  Uses out/gunshots.json."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay(); W = World()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
hits = [e for e in R.events if e['e'] == 'hit']
hits_on = collections.defaultdict(list)
for h in hits:
    if h['dst'] < 100 and h['src'] is not None: hits_on[h['dst']].append(h)
los_cache = {}
def visible(a, b, tick):
    """a sees b (geometry only: terrain + prisms), 200 m range; ignores FOV wedge and canopy."""
    key = (a, b, tick)
    if key in los_cache: return los_cache[key]
    pa = R.pos(a, tick); pb = R.pos(b, tick)
    v = False
    if pa and pb:
        d = math.dist(pa, pb)
        if d <= 200:
            hb = 4.5 if b < 100 else 1.75
            tb = 9.0 if b < 100 else 3.5
            v = W.los(pa[0], pa[1], pa[2] + 8, pb[0], pb[1], pb[2] + hb) >= 1.0 or W.los(pa[0], pa[1], pa[2] + 8, pb[0], pb[1], pb[2] + tb) >= 1.0
    los_cache[key] = v
    return v
# sequences of shots per shooter
by_s = collections.defaultdict(list)
for o in G: by_s[o['s']].append(o)
segs = []      # consecutive same-target runs
for s, lst in by_s.items():
    lst.sort(key=lambda o: o['tf'])
    cur = None
    for o in lst:
        if cur and cur['tgt'] == o['tgt'] and o['tf'] - cur['t1'] <= 100:
            cur['t1'] = o['tf']; cur['n'] += 1; cur['hits'] += 1 if o['hit_ent'] == o['tgt'] else 0
        else:
            cur = {'s': s, 'type': R.names[s], 'tgt': o['tgt'], 't0': o['tf'], 't1': o['tf'], 'n': 1, 'hits': 1 if o['hit_ent'] == o['tgt'] else 0}
            segs.append(cur)
print('same-target runs:', len(segs), 'of which mech targets:', sum(1 for g in segs if g['tgt'] < 100))
# ---- choice analysis at the start of each run on a mech
rows_choice = []
for g in segs:
    if g['tgt'] >= 100: continue
    s = g['s']; t = g['t0'] - 1; c = g['tgt']
    ps = R.pos(s, t)
    cand = []
    for m in R.ids:
        if m == s or not R.alive(m, t): continue
        if visible(s, m, t):
            pm = R.pos(m, t); r = R.row(m, t)
            last_hit = max([h['t'] for h in hits_on[s] if h['src'] == m and h['t'] <= t and t - h['t'] <= 100] or [-1])
            cand.append({'id': m, 'd': math.dist(ps, pm), 'hp': r[MHP], 'hpf': r[MHP] / r[MMAX], 'last_hit': last_hit})
    ids = [x['id'] for x in cand]
    info = {'s': s, 'type': g['type'], 't': t, 'tgt': c, 'ncand': len(cand), 'tgt_visible': c in ids}
    if c in ids and len(cand) >= 2:
        byd = sorted(cand, key=lambda x: x['d']); byh = sorted(cand, key=lambda x: x['hp']); byf = sorted(cand, key=lambda x: x['hpf'])
        att = [x for x in cand if x['last_hit'] >= 0]
        info.update({'rank_d': [x['id'] for x in byd].index(c) + 1, 'rank_hp': [x['id'] for x in byh].index(c) + 1, 'rank_hpf': [x['id'] for x in byf].index(c) + 1,
                     'n_attackers': len(att), 'is_attacker': any(x['id'] == c for x in att),
                     'is_last_attacker': bool(att) and max(att, key=lambda x: x['last_hit'])['id'] == c,
                     'd': [x['d'] for x in cand if x['id'] == c][0], 'd_nearest': byd[0]['d']})
    rows_choice.append(info)
multi = [i for i in rows_choice if i.get('rank_d')]
print('runs on mech targets: %d ; target visible by geometry at run start: %d ; with >= 2 visible candidates: %d' % (len(rows_choice), sum(1 for i in rows_choice if i['tgt_visible']), len(multi)))
print('candidate count distribution at run start:', sorted(collections.Counter(i['ncand'] for i in rows_choice).items()))
def frac(lst, f):
    return 100.0 * sum(1 for i in lst if f(i)) / len(lst) if lst else float('nan')
rows = []
res = {}
for ty in ['ALL'] + TYPES:
    g = [i for i in multi if ty == 'ALL' or i['type'] == ty]
    exp_rand = mean([100.0 / i['ncand'] for i in g]) if g else float('nan')
    ga = [i for i in g if i['n_attackers'] >= 1]
    rows.append([ty, len(g), frac(g, lambda i: i['rank_d'] == 1), frac(g, lambda i: i['rank_hp'] == 1), frac(g, lambda i: i['rank_hpf'] == 1), exp_rand, len(ga), frac(ga, lambda i: i['is_attacker']), frac(ga, lambda i: i['is_last_attacker'])])
    res[ty] = {'n_multi': len(g), 'pct_nearest': rows[-1][2], 'pct_lowest_hp': rows[-1][3], 'pct_random_baseline': exp_rand, 'n_with_attacker': len(ga), 'pct_target_is_recent_attacker': rows[-1][7]}
print(table(['type', 'runs (>=2 visible)', '% nearest', '% lowest HP', '% lowest HP frac', '% expected if random', 'runs with a recent attacker visible', '% target is one of them', '% target = last attacker'], rows))
# when the nearest is not chosen: is the chosen one the attacker / lowest hp?
nn = [i for i in multi if i['rank_d'] != 1]
print('not-nearest choices: %d ; of those chosen target is a recent attacker: %d ; lowest HP: %d ; distance ratio chosen/nearest median %.2f' % (len(nn), sum(1 for i in nn if i['is_attacker']), sum(1 for i in nn if i['rank_hp'] == 1), median([i['d'] / i['d_nearest'] for i in nn]) if nn else float('nan')))
# conflict cases: nearest != last attacker (both visible)
conf = [i for i in multi if i['n_attackers'] >= 1 and not (i['rank_d'] == 1 and i['is_last_attacker'])]
print('conflict cases (nearest is not the last attacker): %d -> chose nearest %d, chose last attacker %d, other %d' % (len(conf), sum(1 for i in conf if i['rank_d'] == 1), sum(1 for i in conf if i['is_last_attacker']), sum(1 for i in conf if i['rank_d'] != 1 and not i['is_last_attacker'])))
conf2 = [i for i in multi if i['rank_d'] == 1 and i['rank_hp'] != 1 or i['rank_d'] != 1 and i['rank_hp'] == 1]
print('conflict cases (nearest is not the lowest HP): chose nearest %d, chose lowest HP %d' % (sum(1 for i in conf2 if i['rank_d'] == 1), sum(1 for i in conf2 if i['rank_hp'] == 1)))
# ---- mech vs npc/crate preference: when shooting a crate/npc, was a mech visible?
oth = [g for g in segs if g['tgt'] >= 100]
cnt = collections.Counter()
for g in oth:
    s = g['s']; t = g['t0'] - 1
    vis = [m for m in R.ids if m != s and R.alive(m, t) and visible(s, m, t)]
    dmin = min([math.dist(R.pos(s, t), R.pos(m, t)) for m in vis] or [999])
    cnt[('npc' if g['tgt'] < 1000 else 'crate', g['type'], 'mech visible <=130m' if dmin <= 130 else 'mech visible >130m' if vis else 'no mech visible')] += 1
print('runs on drones/crates and whether an enemy mech was visible (geometry) at run start:')
for k, v in sorted(cnt.items()): print('   ', k, v)
# ---- stickiness
print('\n## stickiness: consecutive shots at the same mech target')
rows = []
for ty in ['ALL'] + TYPES:
    g = [x for x in segs if x['tgt'] < 100 and (ty == 'ALL' or x['type'] == ty)]
    dur = [(x['t1'] - x['t0']) * TICK for x in g]; n = [x['n'] for x in g]
    rows.append([ty, len(g), median(n), mean(n), median(dur), pct(dur, .9), max(dur) if dur else float('nan')])
print(table(['type', 'runs', 'median shots', 'mean shots', 'median duration s', 'p90 duration', 'max'], rows))
# ---- switch reasons
reasons = collections.Counter(); ex = []
for s, lst in by_s.items():
    runs = [g for g in segs if g['s'] == s]
    for a, b in zip(runs, runs[1:]):
        if a['tgt'] >= 100 or b['tgt'] == a['tgt']: continue
        t_end = a['t1']; t_new = b['t0']
        old = a['tgt']
        dt = R.death_tick.get(old)
        if dt is not None and dt <= t_new:
            r = 'old target died'
        elif not visible(s, old, t_new - 1):
            r = 'old target out of sight (geometry) or >200 m'
        else:
            # old still visible: compare
            ps = R.pos(s, t_new - 1); po = R.pos(old, t_new - 1)
            d_old = math.dist(ps, po)
            if b['tgt'] < 100:
                pn = R.pos(b['tgt'], t_new - 1); d_new = math.dist(ps, pn)
                recent = any(h['src'] == b['tgt'] and 0 <= t_new - h['t'] <= 60 for h in hits_on[s])
                r = 'old visible: new is closer' if d_new < d_old else 'old visible: new is farther' + (' but hit me <3 s ago' if recent else '')
            else:
                r = 'old visible: switched to drone/crate'
            ex.append((s, R.names[s], t_new, old, b['tgt'], round(d_old, 1)))
        reasons[r] += 1
print('\n## why did the shooter switch away from a mech target?')
for k, v in reasons.most_common(): print('   %-55s %d' % (k, v))
# gap between runs
# ---- time to first shot after target becomes visible (reaction): skip (FOV unknown)
# ---- do they shoot at targets beyond gun range?
far = [o for o in G if o['tgt'] is not None and o['tgt'] < 100 and o['rng'] > 200]
print('\nshots at mechs beyond 200 m: %d ; beyond 230 m: %d ; max range %.0f' % (len(far), sum(1 for o in far if o['rng'] > 230), max(o['rng'] for o in G if o['tgt'] is not None and o['tgt'] < 100)))
# first-shot range per type (range at run start)
rows = []
for ty in TYPES:
    g = [x for x in segs if x['tgt'] < 100 and x['type'] == ty]
    r0 = []
    for x in g:
        o = [o for o in by_s[x['s']] if o['tf'] == x['t0']][0]
        r0.append(o['rng'])
    rows.append([ty, len(r0), pct(r0, .1), median(r0), pct(r0, .9), max(r0)])
print(table(['type', 'runs', 'range at first shot p10', 'p50', 'p90', 'max'], rows))
dump('targeting.json', {'choice': res, 'switch_reasons': dict(reasons)})
