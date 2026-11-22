"""Panel 3 behavioural forensics on the official 16 house-bot FFA replay (stdlib only; run with python3 -I)."""
import gzip, json, sys, math, collections, statistics as st
rp, gs = sys.argv[1], sys.argv[2]
lines = [json.loads(l) for l in gzip.open(rp, 'rt')]
hdr, res, frames = lines[0], lines[-1], lines[1:-1]
names = {m['id']: m['name'] for m in hdr['mechs']}
ticks = [f['t'] for f in frames]
M = {i: {} for i in names}
for f in frames:
    for r in f['m']:
        M[r[0]][f['t']] = r
ev = [e for f in frames for e in f.get('ev', [])]
def row(i, t):
    d = M[i]
    while t >= 0:
        if t in d: return d[t]
        t -= 1
    return None
def pct(xs, p):
    xs = sorted(xs)
    if not xs: return float('nan')
    k = (len(xs) - 1) * p
    lo = int(k); hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)
def summ(xs):
    return 'n=%d p10=%.2f p50=%.2f p90=%.2f' % (len(xs), pct(xs, .1), pct(xs, .5), pct(xs, .9)) if xs else 'n=0'

print('== A. laser charge tell ==')
ch = [e for e in ev if e['e'] == 'charge']; la = [e for e in ev if e['e'] == 'laser']
durs = []; yawd = []; hits = 0
for c in ch:
    nxt = [l for l in la if l['id'] == c['id'] and l['t'] > c['t']]
    if not nxt: continue
    l = min(nxt, key=lambda x: x['t'])
    durs.append((l['t'] - c['t']) * 0.05)
    dx = l['to'][0] - l['from'][0]; dy = l['to'][1] - l['from'][1]
    y = math.atan2(dy, dx); d = abs((y - c['yaw'] + math.pi) % (2 * math.pi) - math.pi)
    yawd.append(math.degrees(d))
    if l['hits']: hits += 1
print('charge->fire s:', summ(durs), collections.Counter(round(x, 2) for x in durs).most_common(6))
print('aim yaw slew during charge (deg):', summ(yawd))
print('lasers fired %d, with >=1 hit %d' % (len(la), sum(1 for l in la if l['hits'])))
print('charge event "dur" field values:', collections.Counter(c.get('dur') for c in ch))

print('== B. gun burst / reload structure ==')
fires = collections.defaultdict(list)
for e in ev:
    if e['e'] == 'fire' and e.get('w') == 'gun': fires[e['id']].append(e['t'])
bl = collections.defaultdict(list); gaps = collections.defaultdict(list)
for i, ts in fires.items():
    n = 1
    for a, b in zip(ts, ts[1:]):
        g = (b - a) * 0.05
        if g <= 0.45: n += 1
        else:
            bl[names[i]].append(n); gaps[names[i]].append(g); n = 1
    bl[names[i]].append(n)
for k in sorted(bl):
    c = collections.Counter(bl[k])
    print(k, 'shots/burst', sorted(c.items()), '| gap s', summ(gaps[k]))
allg = [g for k in gaps for g in gaps[k]]
print('gap histogram (s):', sorted(collections.Counter(round(g * 2) / 2 for g in allg).items())[:14])

G = json.load(open(gs))
mg = [o for o in G if o.get('tgt') is not None and o['tgt'] < 100 and 'miss' in o]
print('== C. target choice (gun shots at mechs: %d) ==' % len(mg))
rank_d = collections.Counter(); rank_hp = collections.Counter(); ncand = []
for o in mg:
    s, t, c = o['s'], o['tf'] - 1, o['tgt']
    rs = row(s, t)
    if rs is None: continue
    cands = []
    for j in names:
        if j == s: continue
        rj = M[j].get(t) or M[j].get(t - 1)
        if rj is None: continue
        d = math.dist(rs[1:4], rj[1:4])
        if d <= 200: cands.append((d, rj[6] / rj[10], j))
    if len(cands) < 2 or c not in [x[2] for x in cands]: continue
    ncand.append(len(cands))
    rank_d[sorted(cands).index(next(x for x in cands if x[2] == c))] += 1
    byhp = sorted(cands, key=lambda x: x[1])
    rank_hp[byhp.index(next(x for x in cands if x[2] == c))] += 1
tot = sum(rank_d.values())
print('shots with >=2 candidates within 200 m: %d (mean cands %.1f)' % (tot, st.mean(ncand) if ncand else 0))
print('target distance rank:', {k: round(v / tot, 2) for k, v in sorted(rank_d.items())})
print('target HP-fraction rank:', {k: round(v / tot, 2) for k, v in sorted(rank_hp.items())})
# persistence: runs of same target per shooter
runs = []
by = collections.defaultdict(list)
for o in mg: by[o['s']].append(o)
sw_same_alive = 0; sw = 0
for s, lst in by.items():
    lst.sort(key=lambda o: o['tf'])
    t0 = lst[0]['tf']; cur = lst[0]['tgt']
    for a, b in zip(lst, lst[1:]):
        if b['tgt'] != cur:
            runs.append((a['tf'] - t0) * 0.05)
            sw += 1
            if M[cur].get(b['tf']) or M[cur].get(b['tf'] - 1): sw_same_alive += 1
            cur = b['tgt']; t0 = b['tf']
    runs.append((lst[-1]['tf'] - t0) * 0.05)
print('same-target run duration s:', summ(runs), '| switches %d, of which old target still alive %d' % (sw, sw_same_alive))

print('== D. shooter motion while firing; target strafing ==')
ss = collections.defaultdict(list)
for o in mg:
    if 'sspeed' in o: ss[o['type']].append(o['sspeed'])
for k in sorted(ss): print(k, 'shooter speed m/s', summ(ss[k]), 'frac<1 m/s %.2f' % (sum(1 for x in ss[k] if x < 1) / len(ss[k])))
hitby = collections.defaultdict(lambda: [0, 0])
for o in mg:
    v = abs(o.get('vlat', 0)); b = 0 if v < 2 else 1 if v < 6 else 2
    r = 0 if o['rng'] < 50 else 1 if o['rng'] < 100 else 2
    hitby[(r, b)][0] += 1; hitby[(r, b)][1] += 1 if o['hit'] else 0
print('hit rate by (range<50/50-100/>100, |vlat|<2/2-6/>6):')
for k in sorted(hitby): print('  ', k, hitby[k][0], '%.2f' % (hitby[k][1] / hitby[k][0]))
# dv_flight: change of target velocity during flight -> hit rate
hb = collections.defaultdict(lambda: [0, 0])
for o in mg:
    if 'dv_flight' not in o: continue
    b = 0 if o['dv_flight'] < 2 else 1 if o['dv_flight'] < 6 else 2
    hb[b][0] += 1; hb[b][1] += 1 if o['hit'] else 0
print('hit rate by target velocity change during flight (<2 / 2-6 / >6 m/s):', {k: (v[0], round(v[1] / v[0], 2)) for k, v in sorted(hb.items())})
bk = [o for o in mg if o.get('blocked')]
print('shots blocked by geometry: %d / %d' % (len(bk), len(mg)))


print('== E. rear hits ==')
hm = [e for e in ev if e['e'] == 'hit' and isinstance(e.get('dst'), int) and isinstance(e.get('src'), int) and e['dst'] < 100 and e['src'] < 100]
print('mech->mech hits', len(hm), 'keys', sorted(set(k for e in hm for k in e)))
print('rear flagged', sum(1 for e in hm if e.get('rear')), 'by weapon', collections.Counter(e['w'] for e in hm))
print('rear by weapon', collections.Counter(e['w'] for e in hm if e.get('rear')))
# victim facing: angle between victim aim yaw and bearing to attacker at hit time
offs = []
for e in hm:
    a = row(e['src'], e['t']); v = row(e['dst'], e['t'])
    if not a or not v: continue
    b = math.atan2(a[2] - v[2], a[1] - v[1])
    offs.append(abs(math.degrees((b - v[4] + math.pi) % (2 * math.pi) - math.pi)))
print('victim aim offset from attacker bearing at hit (deg):', summ(offs), 'frac>90: %.2f' % (sum(1 for x in offs if x > 90) / len(offs)), 'frac<20: %.2f' % (sum(1 for x in offs if x < 20) / len(offs)))

print('== F. supply drops ==')
for d in hdr['drops']:
    lt = int(d['land_t'] * 20)
    near = []
    for j in names:
        r = M[j].get(lt) or M[j].get(lt - 1)
        if r: near.append((round(math.dist(r[1:3], d['pos'][:2])), names[j]))
    tk = [e for e in ev if e['e'] == 'drop' and e.get('op') == 'take' and e['id'] == d['id']]
    print(d['id'], 'land', d['land_t'], 'alive dists', sorted(near)[:6], 'take', [(e['t'] * 0.05, names[e['by']]) for e in tk])
    # count of mechs within 30 m of the ring for each second after landing
    seq = []
    for dt in range(0, 20, 2):
        t = lt + dt * 20
        c = 0
        for j in names:
            r = M[j].get(t) or M[j].get(t - 1)
            if r and math.dist(r[1:3], d['pos'][:2]) <= 30: c += 1
        seq.append(c)
    print('   mechs within 30 m at +0,2,..18 s:', seq)

print('== G. upgrades picked ==')
print(collections.Counter(e['up'] for e in ev if e['e'] == 'upgrade'))
print('== H. deaths ==')
for m in res['mechs']:
    print(m['id'], m['name'], 'place', m['place'], 'death_t', m.get('death_t'), 'by', m.get('killed_by'), m.get('killed_with'), 'cubes', m.get('cubes_max'), 'up', m.get('upgrades'), 'load', m.get('loadout'), 'drops', m.get('drops_taken'), 'dealt', m.get('damage_dealt'), 'taken', m.get('damage_taken'))

print('== I. pursuit after an engagement run ends (target still alive) ==')
pur = collections.defaultdict(list)
for s_, lst in by.items():
    lst.sort(key=lambda o: o['tf'])
    ends = []
    for a, b in zip(lst, lst[1:] + [None]):
        if b is None or b['tgt'] != a['tgt'] or b['tf'] - a['tf'] > 60:
            ends.append(a)
    for a in ends:
        t0 = a['tf']; c = a['tgt']
        r0s, r0c = M[s_].get(t0) or M[s_].get(t0 - 1), M[c].get(t0) or M[c].get(t0 - 1)
        t1 = t0 + 80
        r1s, r1c = M[s_].get(t1) or M[s_].get(t1 - 1), M[c].get(t1) or M[c].get(t1 - 1)
        if not (r0s and r0c and r1s and r1c): continue
        d0 = math.dist(r0s[1:3], r0c[1:3]); d1 = math.dist(r1s[1:3], r1c[1:3])
        # shooter displacement projected on the direction to the target's position at t0
        ux, uy = (r0c[1] - r0s[1]) / max(d0, 1e-6), (r0c[2] - r0s[2]) / max(d0, 1e-6)
        adv = (r1s[1] - r0s[1]) * ux + (r1s[2] - r0s[2]) * uy
        pur[names[s_]].append((d0, d1, adv, r0s[6] / r0s[10]))
for k in sorted(pur):
    v = pur[k]
    print(k, 'n=%d' % len(v), 'advance toward target in 4 s (m): ' + summ([x[2] for x in v]), '| frac closing>10 m: %.2f' % (sum(1 for x in v if x[2] > 10) / len(v)), '| frac retreat<-10 m: %.2f' % (sum(1 for x in v if x[2] < -10) / len(v)))
allp = [x for k in pur for x in pur[k]]
lo = [x for x in allp if x[3] < 0.4]; hi = [x for x in allp if x[3] >= 0.7]
print('shooter hp<0.4: advance', summ([x[2] for x in lo]), '| hp>=0.7: advance', summ([x[2] for x in hi]))

print('== J. target lateral reversals while being shot at ==')
# per mech: lateral velocity relative to nearest shooter over frames where shot at within 1 s
shot_at = collections.defaultdict(list)
for o in mg: shot_at[o['tgt']].append((o['tf'], o['s']))
iv = collections.defaultdict(list)
for c, lst in shot_at.items():
    lst.sort()
    prev_sign = 0; last_rev = None; last_t = None
    for (tf, s_) in lst:
        pass
    # walk frames
    ts = sorted(M[c])
    k = 0; cur_s = None; cur_until = -1
    for t in ts:
        while k < len(lst) and lst[k][0] <= t:
            cur_s = lst[k][1]; cur_until = lst[k][0] + 30; k += 1
        if t > cur_until or cur_s is None:
            prev_sign = 0; last_rev = None; continue
        a = M[c].get(t); b = M[c].get(t - 2); sr = M[cur_s].get(t)
        if not (a and b and sr): continue
        vx, vy = (a[1] - b[1]) / 0.1, (a[2] - b[2]) / 0.1
        dx, dy = a[1] - sr[1], a[2] - sr[2]; d = math.hypot(dx, dy)
        if d < 1: continue
        vl = (-vx * dy + vy * dx) / d
        sg = 1 if vl > 1.5 else -1 if vl < -1.5 else 0
        if sg and prev_sign and sg != prev_sign:
            if last_rev is not None: iv[names[c]].append((t - last_rev) * 0.05)
            last_rev = t
        if sg: prev_sign = sg
for k in sorted(iv): print(k, 'lateral reversal interval s:', summ(iv[k]))
alli = [x for k in iv for x in iv[k]]
print('all:', summ(alli), 'hist 0.25 s bins:', sorted(collections.Counter(round(x * 4) / 4 for x in alli).items())[:14])

print('== K. low-HP behaviour: radial speed relative to last attacker ==')
last_att = {}
rad = collections.defaultdict(list)
hits_by_t = collections.defaultdict(list)
for e in hm: hits_by_t[e['t']].append(e)
for t in ticks:
    for tt in (t - 1, t):
        for e in hits_by_t.get(tt, []): last_att[e['dst']] = (e['src'], e['t'])
    for c in names:
        a = M[c].get(t); b = M[c].get(t - 2)
        if not (a and b) or c not in last_att: continue
        s_, th = last_att[c]
        if t - th > 60: continue
        sr = M[s_].get(t)
        if not sr: continue
        dx, dy = a[1] - sr[1], a[2] - sr[2]; d = math.hypot(dx, dy)
        if d < 1: continue
        vr = ((a[1] - b[1]) * dx + (a[2] - b[2]) * dy) / d / 0.1
        f = a[6] / a[10]
        rad[(names[c], 0 if f < 0.3 else 1 if f < 0.6 else 2)].append(vr)
for k in sorted(rad): print(k, 'radial speed away from attacker m/s (+ = fleeing):', summ(rad[k]), 'mean %.1f' % st.mean(rad[k]))
