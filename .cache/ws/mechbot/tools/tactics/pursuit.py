"""What does a house bot do after its target breaks line of sight?  (FFA replay, stdlib only.)
Run: python3 -I pursuit.py <P>   (imports the team's own forensics loader by explicit path)"""
import sys, math, collections, importlib.util
P = sys.argv[1]
spec = importlib.util.spec_from_file_location('common', P + '/tools/forensics/common.py')
C = importlib.util.module_from_spec(spec); spec.loader.exec_module(C)
R = C.Replay(); W = C.World()
name = R.names
def angd(a, b): return abs((a - b + math.pi) % (2 * math.pi) - math.pi)
fires = collections.defaultdict(set)
for e in R.events:
    if e['e'] in ('fire', 'laser', 'zap'): fires[e['id']].add(e['t'] - e['t'] % 2)
def los(a, b):
    return W.los(a[1], a[2], a[3] + 8, b[1], b[2], b[3] + 4.5, step=1.5) >= 1.0
# engaged[(A,B)] = last frame index where A fired while aimed within 10 deg of B with LOS
out = collections.defaultdict(collections.Counter); samples = []
ids = R.ids
eng = {}
k = 0
while k < R.nf:
    t = R.ticks[k]
    for A in ids:
        a = R.m[A][k]
        if a is None or t not in fires[A]: continue
        for B in ids:
            if B == A: continue
            b = R.m[B][k]
            if b is None: continue
            d = math.hypot(a[1] - b[1], a[2] - b[2])
            if d > 230: continue
            if angd(a[4], math.atan2(b[2] - a[2], b[1] - a[1])) < math.radians(10) and los(a, b):
                eng[(A, B)] = k
    k += 1
# for each engaged pair, scan forward for the first LOS break lasting >= 1 s within 3 s of the last shot
done = set()
for (A, B), _ in list(eng.items()):
    pass
events = []
last_break = {}
for k in range(R.nf):
    t = R.ticks[k]
    for A in ids:
        if t not in fires[A]: continue
        a = R.m[A][k]
        if a is None: continue
        for B in ids:
            if B == A: continue
            b = R.m[B][k]
            if b is None: continue
            if math.hypot(a[1] - b[1], a[2] - b[2]) > 230: continue
            if not (angd(a[4], math.atan2(b[2] - a[2], b[1] - a[1])) < math.radians(10)): continue
            if k - last_break.get((A, B), -999) < 100: continue
            # look ahead up to 3 s for a break
            for j in range(k + 1, min(R.nf, k + 30)):
                a2, b2 = R.m[A][j], R.m[B][j]
                if a2 is None or b2 is None: break
                if not los(a2, b2):
                    # require blocked for the next 1 s
                    ok = True
                    for jj in range(j, min(R.nf, j + 10)):
                        a3, b3 = R.m[A][jj], R.m[B][jj]
                        if a3 is None or b3 is None or los(a3, b3): ok = False; break
                    if ok:
                        events.append((A, B, j)); last_break[(A, B)] = j
                    break
print('LOS-break events', len(events))
agg = collections.Counter(); regain = []
bytype = collections.defaultdict(collections.Counter)
for (A, B, j) in events:
    a0, b0 = R.m[A][j], R.m[B][j]
    d0 = math.hypot(a0[1] - b0[1], a0[2] - b0[2])
    res = {}
    for dt in (30, 60):
        jj = j + dt
        if jj >= R.nf or R.m[A][jj] is None or R.m[B][jj] is None: continue
        a1, b1 = R.m[A][jj], R.m[B][jj]
        # movement of A toward B's position at break
        moved = math.hypot(a1[1] - a0[1], a1[2] - a0[2])
        toward = d0 - math.hypot(a1[1] - b0[1], a1[2] - b0[2])
        res[dt] = (moved, toward)
    # time to regain LOS (up to 10 s)
    tr = None
    for jj in range(j, min(R.nf, j + 100)):
        a1, b1 = R.m[A][jj], R.m[B][jj]
        if a1 is None or b1 is None: break
        if los(a1, b1): tr = (jj - j) / 10; break
    # does A keep aiming at B's TRUE position 2 s and 4 s after the break (memory tracking)?
    aim2 = aim4 = None
    for dt, key in ((20, 'aim2'), (40, 'aim4')):
        jj = j + dt
        if jj < R.nf and R.m[A][jj] is not None and R.m[B][jj] is not None:
            a1, b1 = R.m[A][jj], R.m[B][jj]
            v = angd(a1[4], math.atan2(b1[2] - a1[2], b1[1] - a1[1])) < math.radians(15)
            if key == 'aim2': aim2 = v
            else: aim4 = v
    for kk in ('ALL', name[A]):
        s = bytype[kk]; s['n'] += 1
        if 30 in res:
            s['n3'] += 1; s['pursue3'] += res[30][1] > 8; s['retreat3'] += res[30][1] < -8; s['static3'] += res[30][0] < 5
        if 60 in res:
            s['n6'] += 1; s['pursue6'] += res[60][1] > 15
        if tr is not None: s['regain10'] += 1; s['regain_sum'] += tr
        if aim2 is not None: s['a2n'] += 1; s['aim2'] += aim2
        if aim4 is not None: s['a4n'] += 1; s['aim4'] += aim4
for kk, s in sorted(bytype.items()):
    print(kk, dict(s), 'mean regain', round(s['regain_sum'] / s['regain10'], 2) if s['regain10'] else None)
