"""Do house bots fire when another mech's body is on the line before their target?  (FFA replay mech16)
For every gun fire / laser beam event, take the shooter's actual aim one frame before the shot and list every other
mech whose axis passes within R of the ray (z within the body).  Report cases with two or more bodies on the line,
and what the shot hit (impact / hit events)."""
import gzip, json, math, sys, collections
path = sys.argv[1]
L = [json.loads(l) for l in gzip.open(path, 'rt')]
hdr, frames = L[0], L[1:-1]
names = {m['id']: m['name'] for m in hdr['mechs']}
ticks = [f['t'] for f in frames]
import bisect
def frame_at(t):
    k = bisect.bisect_right(ticks, t) - 1
    return frames[max(0, k)]
def mechs_at(t):
    return {r[0]: r for r in frame_at(t)['m']}
evs = []
for f in frames:
    for e in f.get('ev', []): evs.append(e)
by_t = collections.defaultdict(list)
for e in evs: by_t[e['t']].append(e)
R = 2.8
out = collections.Counter(); cases = []
for e in evs:
    if e['e'] != 'fire' or e.get('w') not in ('gun', 'laser'): continue
    sid = e['id']; t = e['t']
    ms = mechs_at(t - 1)
    s = ms.get(sid)
    if not s: continue
    yaw, pit = s[4], s[5]
    d = (math.cos(pit) * math.cos(yaw), math.cos(pit) * math.sin(yaw), math.sin(pit))
    o = (s[1] + 3 * d[0], s[2] + 3 * d[1], s[3] + 7 + 3 * d[2])
    on = []
    for mid, r in ms.items():
        if mid == sid or r[6] <= 0: continue
        sc = 1 + 0.05 * r[9]
        # closest approach of ray to vertical axis at (r1,r2): solve in xy
        px, py = r[1] - o[0], r[2] - o[1]
        dxy = math.hypot(d[0], d[1])
        if dxy < 1e-6: continue
        ux, uy = d[0] / dxy, d[1] / dxy
        along = px * ux + py * uy
        if along <= 0 or along > 280: continue
        perp = abs(px * uy - py * ux)
        s3 = along / dxy
        z = o[2] + d[2] * s3
        if perp < R * sc and r[3] - 0.5 <= z <= r[3] + 9 * sc + 0.5:
            on.append((round(along, 1), mid, round(perp, 2)))
    on.sort()
    out[(e['w'], len(on))] += 1
    if len(on) >= 2:
        hits = [x for tt in range(t, t + 30) for x in by_t.get(tt, []) if x['e'] == 'hit' and x.get('src') == sid]
        cases.append((t, sid, names[sid], e['w'], on, [(x['t'], x['dst'], x['amt']) for x in hits[:3]]))
print('shots by (weapon, bodies on the line):', sorted(out.items()))
for c in cases: print(c)
