"""Does a house bot that is busy shooting C turn to a new attacker A?  (FFA replay; stdlib only)"""
import gzip, json, math, sys, collections
P = sys.argv[1]
lines = [json.loads(l) for l in gzip.open(P + '/replay/mech16.jsonl.gz', 'rt')]
hdr, frames = lines[0], lines[1:-1]
name = {m['id']: m['name'] for m in hdr['mechs']}
rows = {i: {} for i in name}
for f in frames:
    for r in f['m']: rows[r[0]][f['t']] = r
def row(i, t):
    t -= t % 2
    return rows[i].get(t) or rows[i].get(t + 1) or rows[i].get(t - 1)
def angd(a, b): return abs((a - b + math.pi) % (2 * math.pi) - math.pi)
def brg(a, b): return math.atan2(b[2] - a[2], b[1] - a[1])
ev = [e for f in frames for e in f.get('ev', [])]
fires = collections.defaultdict(list)
for e in ev:
    if e['e'] in ('fire', 'laser', 'zap'): fires[e['id']].append(e['t'])
mm = [e for e in ev if e['e'] == 'hit' and e.get('src') is not None and e['src'] < 100 and e['dst'] < 100 and e['src'] != e['dst']]
last = {}; S = collections.Counter(); lat = []
for e in mm:
    A, X, t = e['src'], e['dst'], e['t']
    prev = last.get((A, X), -10**9); last[(A, X)] = t
    if t - prev < 120: continue
    x = row(X, t)
    if not x: continue
    # who was X shooting in the previous 1.5 s?
    busy = None
    for ft in fires[X]:
        if t - 30 <= ft <= t:
            xr = row(X, ft)
            for C in name:
                if C in (X, A): continue
                c = row(C, ft)
                if c and xr and math.hypot(c[1] - xr[1], c[2] - xr[2]) < 230 and angd(xr[4], brg(xr, c)) < math.radians(10):
                    busy = C
    if busy is None: S['idle_or_on_A'] += 1; continue
    S['busy'] += 1
    # outcome at +2 s and +4 s
    for dt, tag in ((40, '2s'), (80, '4s')):
        x2, a2, c2 = row(X, t + dt), row(A, t + dt), row(busy, t + dt)
        if not x2: S['x_dead_' + tag] += 1; continue
        onA = a2 is not None and angd(x2[4], brg(x2, a2)) < math.radians(15)
        onC = c2 is not None and angd(x2[4], brg(x2, c2)) < math.radians(15)
        S['onA_' + tag] += onA; S['onC_' + tag] += (onC and not onA); S['neither_' + tag] += (not onA and not onC)
    # rear exposure: was A in X's rear arc at hit time, and did the hit event carry rear?
    a = row(A, t)
    if a: S['A_in_rear_at_hit'] += angd(x[4], brg(x, a)) > math.pi / 2
print(dict(S))
# overall share of mech-on-mech hits landing in the rear arc
rear = 0; n = 0
for e in mm:
    x, a = row(e['dst'], e['t']), row(e['src'], e['t'])
    if x and a:
        n += 1; rear += angd(x[4], brg(x, a)) > math.pi / 2
print('hits from rear arc', rear, 'of', n)
# deaths timeline -> rate
d = sorted(e['t'] / 20 for e in ev if e['e'] == 'death' and e['id'] < 100)
print('death times', d)
