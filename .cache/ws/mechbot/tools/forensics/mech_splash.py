"""Fit the splash/concussion falloff distance definition using concussion velocity (f = |v_h|/16)."""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import shots
R = Replay(); S = shots.build(R)
upg = collections.defaultdict(list)
for e in R.events:
    if e['e'] == 'upgrade': upg[e['id']].append((e['t'], e['up']))
shell_of = {rec['pid']: rec for rec in S['mortar']}
boom_by_t = collections.defaultdict(list)
for e in R.events:
    if e['e'] == 'boom': boom_by_t[e['t']].append(e)
rows = []
for e in R.events:
    if e['e'] != 'concuss': continue
    b = [b for b in boom_by_t[e['t']] if shell_of[b['p']]['fire']['id'] == e['by']][0]
    f = math.hypot(e['v'][0], e['v'][1]) / 16
    Rr = b['r']
    rows.append((e, b, f, Rr))
defs = {}
def dist_defs(at, vp, rad=2.5, h=9.0):
    dh = math.hypot(at[0] - vp[0], at[1] - vp[1])
    zc = min(max(at[2], vp[2]), vp[2] + h)           # closest height on the axis
    d_axis = math.hypot(dh, at[2] - zc)
    out = {
        'feet': math.dist(at, vp),
        'centre': math.dist(at, (vp[0], vp[1], vp[2] + h / 2)),
        'axis(3D)': d_axis,
        'axis-radius': max(0.0, d_axis - rad),
        'cyl surface': math.hypot(max(0.0, dh - rad), at[2] - zc),
        'horizontal': dh,
        'horizontal-radius': max(0.0, dh - rad),
        'centre-radius': max(0.0, math.dist(at, (vp[0], vp[1], vp[2] + h / 2)) - rad),
    }
    return out
for off in (-1, 0):
    errs = collections.defaultdict(list)
    for (e, b, f, Rr) in rows:
        vp = R.pos(e['id'], e['t'] + off)
        if vp is None: continue
        for name, d in dist_defs(b['at'], vp).items():
            pred = 0.0 if d > Rr else 1 - 0.7 * d / Rr
            errs[name].append(pred - f)
    print('victim position at tick t%+d:' % off)
    for name, v in sorted(errs.items(), key=lambda kv: math.sqrt(mean([x * x for x in kv[1]]))):
        print('   %-18s rms %.3f  mean %+.3f  max|err| %.3f' % (name, math.sqrt(mean([x * x for x in v])), mean(v), max(abs(x) for x in v)))
# print table for best def
print('rows: f_obs, horizontal dist (t-1), dz boom-feet, R')
for (e, b, f, Rr) in rows:
    vp = R.pos(e['id'], e['t'] - 1)
    dh = math.hypot(b['at'][0] - vp[0], b['at'][1] - vp[1])
    need = (1 - f) / 0.7 * Rr
    print('  t=%d f=%.3f need d=%.2f  dh=%.2f  dz=%.2f R=%.1f' % (e['t'], f, need, dh, b['at'][2] - vp[2], Rr))
