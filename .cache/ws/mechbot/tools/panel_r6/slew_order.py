"""Panel R6 I/O: does the torso slew before or after the shot leaves inside a sim tick?
Replay mech16: frames every 2 ticks (even), gun fire events on odd ticks. For shots fired while the torso was turning
(|aim(t+1) - aim(t-1)| large), compare the bullet yaw with
  H0 fire-then-slew : bullet = aim(t-1)
  H1 slew-then-fire : bullet = aim(t-1) + clamp(delta, +-turn*dt)  (one tick of slew, delta = aim(t+1)-aim(t-1) when capped)
stdlib only; run with python3 -I."""
import gzip, json, math, os, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(os.path.dirname(HERE))
L = [json.loads(l) for l in gzip.open(os.path.join(P, 'replay', 'mech16.jsonl.gz'), 'rt')]
fr = L[1:-1]
byt = {f['t']: f for f in fr}
def wrap(a):
    return math.atan2(math.sin(a), math.cos(a))
def mrow(t, i):
    f = byt.get(t)
    if not f: return None
    for r in f['m']:
        if r[0] == i: return r
    return None
def prow(t):
    f = byt.get(t)
    return {r[0]: r for r in f.get('p', [])} if f else {}
fires = [e for f in fr for e in f.get('ev', []) if e['e'] == 'fire' and e['w'] == 'gun']
seen = set()
res = []
for e in fires:
    t, i = e['t'], e['id']
    a0, a1 = mrow(t - 1, i), mrow(t + 1, i)
    if not a0 or not a1: continue
    p1, p3 = prow(t + 1), prow(t + 3)
    # new gun projectile nearest the shooter at t+1
    best, bd = None, 30
    for pid, r in p1.items():
        if r[1] != 0 or pid in seen: continue
        d = math.hypot(r[2] - a1[1], r[3] - a1[2])
        if d < bd: bd, best = d, pid
    if best is None: continue
    seen.add(best)
    r1 = p1[best]
    if best in p3:
        r3 = p3[best]; byaw = math.atan2(r3[3] - r1[3], r3[2] - r1[2])
    else:
        mx, my = (a0[1] + a1[1]) / 2, (a0[2] + a1[2]) / 2
        byaw = math.atan2(r1[3] - my, r1[2] - mx)
    d = wrap(a1[4] - a0[4])
    res.append((d, wrap(byaw - a0[4]), best in p3))
turn = 4.0 / 1.3  # replay build: speeds x 1/1.3 (forensics: turn 4 rad/s in replay though)
for cap in (0.2,):
    rows = [(d, b) for d, b, two in res if abs(d) >= 0.25 and two]
    h0 = [b for d, b in rows]
    h1 = [b - math.copysign(min(abs(d), cap), d) for d, b in rows]
    h2 = [b - d for d, b in rows]
    def st(v):
        v = sorted(abs(x) for x in v); n = len(v)
        return f'n={n} |res| p50 {v[n//2]:.3f} p90 {v[int(n*0.9)]:.3f} rad' if n else 'n=0'
    print('large-slew shots (|d|>=0.25):')
    print('  H0 fire-then-slew  (bullet = aim(t-1))      ', st(h0))
    print('  H1 one tick of slew (aim(t-1)+clamp(d,0.2)) ', st(h1))
    print('  H2 two ticks        (bullet = aim(t+1))      ', st(h2))
    mid = [(d, b) for d, b, two in res if 0.06 <= abs(d) < 0.2 and two]
    print('small-slew shots (0.06<=|d|<0.2): fraction of the slew already in the bullet, median',
          sorted(b / d for d, b in mid)[len(mid)//2] if mid else None, 'n', len(mid))
    big = [(d, b) for d, b, two in res if abs(d) >= 0.3 and two]
    print('slew fraction in bullet for |d|>=0.3 (0 = H0, 0.5 = H1 at cap, 1 = H2):', sorted(round(b / d, 2) for d, b in big)[::max(1, len(big)//15)])
print('shots matched', len(res))
print('--- shots by slew size |d| (rad): median of (bullet - aim(t-1))/d  [0 = fired before the turn, 1 = after]')
for lo, hi in ((0.02, 0.04), (0.04, 0.08), (0.08, 0.2), (0.2, 1)):
    v = sorted(b / d for d, b, two in res if lo <= abs(d) < hi)
    print(f'  {lo:.2f}-{hi:.2f}: n={len(v)}', (f'median {v[len(v)//2]:.2f} p25 {v[len(v)//4]:.2f} p75 {v[3*len(v)//4]:.2f}' if v else ''))
