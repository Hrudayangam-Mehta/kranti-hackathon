"""Tactics forensics on the official 16 house-bot FFA replay: how house bots react to being hit,
how healthy duel winners are, how drops get captured.  Stdlib only; run with python3 -I."""
import gzip, json, math, sys, collections
P = sys.argv[1]
lines = [json.loads(l) for l in gzip.open(P + '/replay/mech16.jsonl.gz', 'rt')]
hdr, res, frames = lines[0], lines[-1], lines[1:-1]
name = {m['id']: m['name'] for m in hdr['mechs']}
ticks = [f['t'] for f in frames]
rows = {i: {} for i in name}
for f in frames:
    for r in f['m']:
        rows[r[0]][f['t']] = r
def row(i, t):
    t -= t % 2
    return rows[i].get(t) or rows[i].get(t + 1) or rows[i].get(t - 1)
def angd(a, b):
    d = (a - b + math.pi) % (2 * math.pi) - math.pi
    return abs(d)
ev = [e for f in frames for e in f.get('ev', [])]
hits = [e for e in ev if e['e'] == 'hit']
print('hit weapons', collections.Counter(e['w'] for e in hits))
print('zone dmg by mech', {k: round(v) for k, v in collections.Counter().items()})
zd = collections.Counter(); nd = collections.Counter()
for e in hits:
    if e['w'] == 'zone': zd[e['dst']] += e['amt']
    if e['w'] == 'npc' and e['dst'] < 100: nd[e['dst']] += e['amt']
print('zone dmg', dict(zd)); print('npc dmg to mechs', {name[k] + str(k): round(v) for k, v in nd.items()})
fires = collections.defaultdict(list)
for e in ev:
    if e['e'] in ('fire', 'laser', 'zap'): fires[e['id']].append(e['t'])
mm = [e for e in hits if e.get('src') is not None and e['src'] < 100 and e['dst'] < 100 and e['src'] != e['dst']]
# first-contact hits: dst not hit by src in the previous 6 s
last = {}
stats = collections.defaultdict(lambda: collections.Counter())
lat = collections.defaultdict(list)
for e in mm:
    key = (e['src'], e['dst']); t = e['t']
    prev = last.get(key, -10**9); last[key] = t
    if t - prev < 120: continue
    a, d = row(e['src'], t), row(e['dst'], t)
    if not a or not d: continue
    dist = math.hypot(a[1] - d[1], a[2] - d[2])
    brg = math.atan2(a[2] - d[2], a[1] - d[1])
    facing = angd(d[4], brg) < math.radians(20)
    band = '0-60' if dist < 60 else '60-120' if dist < 120 else '120+'
    for kk in (name[e['dst']], 'ALL'):
        s = stats[(kk, band)]
        s['n'] += 1
        s['already_facing'] += facing
        # time until dst faces src within 20 deg
        tf = None
        for dt in range(0, 81, 2):
            a2, d2 = row(e['src'], t + dt), row(e['dst'], t + dt)
            if not a2 or not d2: break
            b2 = math.atan2(a2[2] - d2[2], a2[1] - d2[1])
            if angd(d2[4], b2) < math.radians(20):
                tf = dt / 20; break
        if tf is not None:
            s['faces_within_4s'] += 1
            if not facing: lat[(kk, band)].append(tf)
        # retaliation: dst fires within 4 s while aimed within 12 deg of src
        ret = False
        for ft in fires[e['dst']]:
            if t < ft <= t + 80:
                a2, d2 = row(e['src'], ft), row(e['dst'], ft)
                if a2 and d2 and angd(d2[4], math.atan2(a2[2] - d2[2], a2[1] - d2[1])) < math.radians(12):
                    ret = True; break
        s['retaliates_4s'] += ret
        # approach or flee over next 5 s
        a2, d2 = row(e['src'], t + 100), row(e['dst'], t + 100)
        if a2 and d2:
            dist2 = math.hypot(a2[1] - d2[1], a2[2] - d2[2])
            s['m5'] += 1
            s['closer_10m'] += dist2 < dist - 10
            s['farther_10m'] += dist2 > dist + 10
print('\nREACTION TO A FIRST-CONTACT HIT (no hit from that attacker in previous 6 s)')
for k in sorted(stats):
    s = stats[k]; l = sorted(lat[k])
    med = l[len(l) // 2] if l else None
    print(k, dict(s), 'median turn latency when not facing', med)
# duel winner health: at each mech death by a mech, killer hp fraction, and third-party damage within 10 s
print('\nKILLER STATE AT KILL')
for e in ev:
    if e['e'] == 'death' and e['id'] < 100:
        t = e['t']; k = e.get('by')
        if k is None or k >= 100:
            print('death', name[e['id']], e['id'], 't', t / 20, 'by', k); continue
        r = row(k, t)
        tp = collections.Counter()
        for h in mm:
            if h['dst'] == k and t < h['t'] <= t + 200 and h['src'] != e['id']: tp[h['src']] += h['amt']
        pre = collections.Counter()
        for h in mm:
            if h['dst'] == e['id'] and t - 200 <= h['t'] <= t: pre[h['src']] += h['amt']
        v = row(e['id'], t - 2)
        print('death', name[e['id']], e['id'], 't', t / 20, 'killer', name[k], k, 'killer hp frac', round(r[6] / r[10], 2) if r else None,
              'dmg on victim last 10s by', {a: round(b) for a, b in pre.items()}, 'killer hit within 10s after by', {a: round(b) for a, b in tp.items()})
# drops
print('\nDROPS')
for e in ev:
    if e['e'] == 'drop': print(e)
st = {}
for f in frames:
    for d in f.get('d', []):
        key = d[0]
        cur = (d[1], d[2])
        if st.get(key) != cur:
            st[key] = cur
            print('drop state', f['t'] / 20, d)
