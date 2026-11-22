"""Panel 3: laser 'charging' tell forensics (python3 -I)."""
import gzip, json, sys, math, collections
lines = [json.loads(l) for l in gzip.open(sys.argv[1], 'rt')]
hdr, res, frames = lines[0], lines[-1], lines[1:-1]
names = {m['id']: m['name'] for m in hdr['mechs']}
M = {i: {} for i in names}
for f in frames:
    for r in f['m']: M[r[0]][f['t']] = r
ev = [e for f in frames for e in f.get('ev', [])]
def get(i, t):
    return M[i].get(t) or M[i].get(t - 1) or M[i].get(t + 1)
def pct(xs, p):
    xs = sorted(xs); k = (len(xs) - 1) * p; lo = int(k); hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)
def summ(xs): return 'n=%d p10=%.2f p50=%.2f p90=%.2f' % (len(xs), pct(xs, .1), pct(xs, .5), pct(xs, .9)) if xs else 'n=0'
def wrap(a): return (a + math.pi) % (2 * math.pi) - math.pi
ch = [e for e in ev if e['e'] == 'charge']; la = [e for e in ev if e['e'] == 'laser']
rows = []
slew_frames = []; spd_charge = []
for c in ch:
    s = c['id']; tc = c['t']
    nxt = [l for l in la if l['id'] == s and l['t'] > tc]
    if not nxt: continue
    l = min(nxt, key=lambda x: x['t']); tfire = l['t']
    # aim yaw trace of the shooter during charge frames
    ys = [M[s][t][4] for t in range(tc, tfire + 1) if t in M[s]]
    fl = [M[s][t][8] & 4 for t in range(tc, tfire + 1) if t in M[s]]
    if len(ys) >= 2: slew_frames.append(math.degrees(max(abs(wrap(y - ys[0])) for y in ys)))
    a = get(s, tc); b = get(s, tfire)
    if a and b: spd_charge.append(math.dist(a[1:3], b[1:3]) / ((tfire - tc) * 0.05))
    # intended target: mech with the smallest angular offset from the charge yaw at charge start
    best = None
    for j in names:
        if j == s: continue
        rj = get(j, tc)
        if not rj or not a: continue
        d = math.dist(a[1:3], rj[1:3])
        if d > 280: continue
        off = abs(wrap(math.atan2(rj[2] - a[2], rj[1] - a[1]) - c['yaw']))
        # linear prediction of target at fire time using velocity at charge start
        rp = get(j, tc - 2)
        vx, vy = ((rj[1] - rp[1]) / 0.1, (rj[2] - rp[2]) / 0.1) if rp else (0, 0)
        T = (tfire - tc) * 0.05
        px, py = rj[1] + vx * T, rj[2] + vy * T
        offp = abs(wrap(math.atan2(py - a[2], px - a[1]) - c['yaw']))
        if best is None or min(off, offp) < best[0]:
            best = (min(off, offp), j, d, off, offp, vx, vy)
    if not best or best[0] > math.radians(12): continue
    _, j, d, off, offp, vx, vy = best
    rf = get(j, tfire)
    if not rf: continue
    # perpendicular miss distance of the beam line (from shooter pos at fire, charge yaw) to target at fire time
    sx, sy = b[1], b[2]
    ux, uy = math.cos(c['yaw']), math.sin(c['yaw'])
    miss = abs(-(rf[1] - sx) * uy + (rf[2] - sy) * ux)
    vlat = abs(-vx * (rf[2] - sy) + vy * (rf[1] - sx)) / max(1e-6, math.hypot(rf[1] - sx, rf[2] - sy))
    rj2 = get(j, tfire - 2)
    vfx, vfy = ((rf[1] - rj2[1]) / 0.1, (rf[2] - rj2[2]) / 0.1) if rj2 else (vx, vy)
    dv = math.hypot(vfx - vx, vfy - vy)
    hit = j in [h if isinstance(h, int) else h.get('id') for h in l['hits']] if l['hits'] else False
    rows.append(dict(s=names[s], tgt=names[j], d=d, off_now=math.degrees(off), off_pred=math.degrees(offp), miss=miss, vlat=vlat, dv=dv, hit=bool(l['hits'])))
print('max aim-yaw deviation from the charge-start yaw across charge frames (deg):', summ(slew_frames))
print('shooter mean speed while charging m/s:', summ(spd_charge))
print('laser hits sample:', json.dumps(la[5]), [l['hits'] for l in la if l['hits']][:3])
print('attributed charges:', len(rows))
print('aim offset from target CURRENT bearing at charge start (deg):', summ([r['off_now'] for r in rows]))
print('aim offset from target LINEAR-PREDICTED bearing at fire time (deg):', summ([r['off_pred'] for r in rows]))
print('fraction where predicted-offset < current-offset: %.2f' % (sum(1 for r in rows if r['off_pred'] < r['off_now']) / len(rows)))
print('distance m:', summ([r['d'] for r in rows]))
H = [r for r in rows if r['hit']]; Mi = [r for r in rows if not r['hit']]
print('hits %d misses %d' % (len(H), len(Mi)))
print('HIT : target |vlat| at charge start', summ([r['vlat'] for r in H]), '| target dv during charge', summ([r['dv'] for r in H]), '| miss m', summ([r['miss'] for r in H]))
print('MISS: target |vlat| at charge start', summ([r['vlat'] for r in Mi]), '| target dv during charge', summ([r['dv'] for r in Mi]), '| miss m', summ([r['miss'] for r in Mi]))
for thr in (2, 4, 6):
    a = [r for r in rows if r['dv'] >= thr]; b = [r for r in rows if r['dv'] < thr]
    print('dv>=%d m/s: hit %d/%d ; dv<%d: hit %d/%d' % (thr, sum(r['hit'] for r in a), len(a), thr, sum(r['hit'] for r in b), len(b)))
print('by shooter type:', collections.Counter((r['s'], r['hit']) for r in rows))
