"""Panel 3: reload model, laser cadence, reaction to rear hits (python3 -I)."""
import gzip, json, sys, math, collections
lines = [json.loads(l) for l in gzip.open(sys.argv[1], 'rt')]
hdr, res, frames = lines[0], lines[-1], lines[1:-1]
names = {m['id']: m['name'] for m in hdr['mechs']}
M = {i: {} for i in names}
for f in frames:
    for r in f['m']: M[r[0]][f['t']] = r
ev = [e for f in frames for e in f.get('ev', [])]
def get(i, t): return M[i].get(t) or M[i].get(t - 1) or M[i].get(t + 1)
def pct(xs, p):
    xs = sorted(xs); k = (len(xs) - 1) * p; lo = int(k); hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)
def summ(xs): return 'n=%d p10=%.2f p50=%.2f p90=%.2f' % (len(xs), pct(xs, .1), pct(xs, .5), pct(xs, .9)) if xs else 'n=0'
def wrap(a): return (a + math.pi) % (2 * math.pi) - math.pi

print('== reload model: "reload only when empty" vs "reload early in lulls" ==')
magup = {}   # mech -> tick of gun_mag upgrade
for e in ev:
    if e['e'] == 'upgrade' and e['up'] == 'gun_mag': magup.setdefault(e['id'], e['t'])
    if e['e'] == 'upgrade' and e['up'] == 'gun_rate': print('gun_rate upgrade', e)
fires = collections.defaultdict(list)
for e in ev:
    if e['e'] == 'fire' and e.get('w') == 'gun': fires[e['id']].append(e['t'])
for lull in (None, 3.0, 5.0, 8.0):
    ok = bad = amb = 0; pos = collections.Counter()
    for i, ts in fires.items():
        if i in magup: continue
        ammo = 12
        for a, b in zip(ts, ts[1:]):
            ammo -= 1
            g = (b - a) * 0.05
            if ammo == 0:
                if g >= 2.35: ok += 1
                else: bad += 1
                ammo = 12
            elif lull is not None and g >= lull:
                ammo = 12
            elif g >= 2.35:
                amb += 1
    print('lull-reload threshold', lull, ': empty-mag followed by >=2.35 s gap: %d, violated: %d (ambiguous long gaps with ammo left: %d)' % (ok, bad, amb))
# empirical: number of shots between consecutive gaps >= 2.35 s
runs = collections.Counter()
for i, ts in fires.items():
    if i in magup: continue
    n = 1
    for a, b in zip(ts, ts[1:]):
        if (b - a) * 0.05 >= 2.35: runs[n] += 1; n = 1
        else: n += 1
print('shots between >=2.35 s gaps:', sorted(runs.items()))
# min interval between gun shots
iv = [ (b - a) * 0.05 for ts in fires.values() for a, b in zip(ts, ts[1:]) ]
print('inter-shot interval histogram:', sorted(collections.Counter(round(x, 2) for x in iv if x < 0.6).items()))

print('== laser cadence ==')
la = collections.defaultdict(list); chg = collections.defaultdict(list)
for e in ev:
    if e['e'] == 'laser': la[e['id']].append(e['t'])
    if e['e'] == 'charge': chg[e['id']].append(e['t'])
gaps = []
for i, ts in la.items():
    cs = chg[i]
    for t in ts:
        nx = [c for c in cs if c > t]
        if nx: gaps.append((min(nx) - t) * 0.05)
print('beam -> next charge start (s):', summ(gaps), sorted(collections.Counter(round(g * 2) / 2 for g in gaps).items())[:10])

print('== reaction to rear hits ==')
hm = [e for e in ev if e['e'] == 'hit' and isinstance(e.get('dst'), int) and isinstance(e.get('src'), int) and e['dst'] < 100 and e['src'] < 100]
last = {}
eps = []
for e in hm:
    key = (e['src'], e['dst'])
    new = key not in last or e['t'] - last[key] > 60
    last[key] = e['t']
    if not (new and e.get('rear')): continue
    s, d, t0 = e['src'], e['dst'], e['t']
    turn = None
    for t in range(t0, t0 + 100):
        a = M[s].get(t); v = M[d].get(t)
        if not a or not v: continue
        off = abs(wrap(math.atan2(a[2] - v[2], a[1] - v[1]) - v[4]))
        if off < math.radians(30): turn = (t - t0) * 0.05; break
    dead = d in [x['id'] for x in ev if x['e'] == 'death' and t0 <= x['t'] <= t0 + 100]
    dmg = sum(x['amt'] for x in hm if x['src'] == s and x['dst'] == d and t0 <= x['t'] <= t0 + 40)
    rdmg = sum(x['amt'] for x in hm if x['src'] == s and x['dst'] == d and t0 <= x['t'] <= t0 + 40 and x.get('rear'))
    eps.append((names[d], turn, dead, dmg, rdmg))
print('rear-opening episodes:', len(eps))
tt = [x[1] for x in eps if x[1] is not None]
print('time until victim faces attacker within 30 deg (s):', summ(tt), '| never within 5 s: %d (of which died: %d)' % (sum(1 for x in eps if x[1] is None), sum(1 for x in eps if x[1] is None and x[2])))
print('damage dealt in first 2 s of rear-opening episodes:', summ([x[3] for x in eps]), '| rear-flagged part:', summ([x[4] for x in eps]))
print('by victim type (turn times):', {k: [round(x[1], 2) if x[1] is not None else None for x in eps if x[0] == k] for k in sorted(set(x[0] for x in eps))})
# what was the victim aiming at when hit from the rear: nearest other mech within 15 deg of aim?
