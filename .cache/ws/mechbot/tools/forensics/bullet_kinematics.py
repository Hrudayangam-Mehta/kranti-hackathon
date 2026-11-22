"""Diagnostics: map projectile ids to fire events; bullet speed, origin offset, velocity inheritance."""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
tracks = {}
for fr in R.frames:
    for p in fr['p']:
        tracks.setdefault(p[0], {'kind': p[1], 'pts': []})['pts'].append((fr['t'], p[2], p[3], p[4]))
imp = {e['p']: e for e in R.events if e['e'] == 'impact'}
boom = {e['p']: e for e in R.events if e['e'] == 'boom'}
hits_by_tick = collections.defaultdict(list)
for e in R.events:
    if e['e'] == 'hit': hits_by_tick[e['t']].append(e)
gq = collections.deque(e for e in R.events if e['e'] == 'fire' and e['w'] == 'gun')
mq = collections.deque(e for e in R.events if e['e'] == 'fire' and e['w'] == 'mortar')
maxid = max(set(tracks) | set(imp) | set(boom))
assign = {}
amb = 0
for pid in range(1, maxid + 1):
    tr = tracks.get(pid)
    if tr:
        k = tr['kind']
    else:
        im = imp.get(pid) or boom.get(pid)
        k = None
        if im and im.get('hit') is not None:
            hs = [h for h in hits_by_tick[im['t']] if h['dst'] == im['hit']]
            ws = set(h['w'] for h in hs)
            if ws == {'npc'}: k = 2
            elif ws == {'gun'}: k = 0
            elif 'npc' in ws and 'gun' in ws:
                # ambiguous: use queue timing
                k = 0 if (gq and gq[0]['t'] <= im['t'] and any(h['src'] == gq[0]['id'] for h in hs if h['w'] == 'gun')) else 2
            elif ws == {'mortar'}: k = 1
        if k is None:
            amb += 1
            k = 0 if (gq and im and gq[0]['t'] <= im['t'] <= gq[0]['t'] + 4) else 2
    if k == 0:
        assign[pid] = gq.popleft()
    elif k == 1:
        assign[pid] = mq.popleft()
    else:
        assign[pid] = None
print('left in queues', len(gq), len(mq), 'ambiguous unknown-kind', amb, 'npc shots', sum(1 for v in assign.values() if v is None))
# diagnostics for gun tracks with >=3 pts
spd = []; along = []; lat = []; vert = []; adv = collections.Counter(); spd_vs = []
bad = 0
rows = []
for pid, f in assign.items():
    if f is None or f['w'] != 'gun': continue
    tr = tracks.get(pid)
    if tr and tr['pts'][0][0] < f['t']: bad += 1
    if not tr or len(tr['pts']) < 3: continue
    a, b = tr['pts'][0], tr['pts'][-1]
    dt = (b[0] - a[0]) * TICK
    v = [(b[i] - a[i]) / dt for i in (1, 2, 3)]
    s = math.sqrt(sum(c * c for c in v))
    spd.append(s)
    d = [c / s for c in v]
    sp = R.pos(f['id'], f['t'])
    sc = R.scale(f['id'], f['t'])
    # back-trace to fire tick
    n = a[0] - f['t']
    o = [a[i + 1] - v[i] * n * TICK for i in range(3)]
    rel = [o[0] - sp[0], o[1] - sp[1], o[2] - (sp[2] + 7 * sc)]
    al = sum(rel[i] * d[i] for i in range(3))
    perp = [rel[i] - al * d[i] for i in range(3)]
    along.append(al); lat.append(math.hypot(perp[0], perp[1])); vert.append(perp[2])
    sv = R.vel(f['id'], f['t'], back=False)
    spd_vs.append((s, sum(sv[i] * d[i] for i in range(3)), math.hypot(sv[0], sv[1])))
    rows.append((pid, f['id'], f['t'], a[0], round(al, 2), round(lat[-1], 2), round(perp[2], 2), round(s, 2), sc))
print('first frame before fire tick (bad mapping):', bad)
print('speed: mean %.3f sd %.3f min %.3f max %.3f n %d' % (mean(spd), sd(spd), min(spd), max(spd), len(spd)))
print('along-aim origin offset at fire tick: p5 %.2f p50 %.2f p95 %.2f' % (pct(along, .05), pct(along, .5), pct(along, .95)))
print('lateral offset p50 %.2f p95 %.2f; vertical p5 %.2f p50 %.2f p95 %.2f' % (pct(lat, .5), pct(lat, .95), pct(vert, .05), pct(vert, .5), pct(vert, .95)))
# correlation of speed with shooter velocity along aim
xs = [r[1] for r in spd_vs]; ys = [r[0] for r in spd_vs]
mx, my = mean(xs), mean(ys)
cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys)); var = sum((x - mx) ** 2 for x in xs)
print('slope speed vs shooter-velocity-along-aim: %.4f (1.0 = inherits, 0 = no)  shooter along-aim speed range %.1f..%.1f' % (cov / var, min(xs), max(xs)))
for r in rows[:25]: print(r)
c = collections.Counter(round(r[4]) for r in rows); print(sorted(c.items()))
