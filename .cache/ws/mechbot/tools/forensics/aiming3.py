"""Vertical aim model vs airborne targets; and bullet-vs-frame-aim (spread) check."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
mm = [o for o in G if o['tgt'] is not None and o['tgt'] < 100 and o['q'] == 'track' and o['rng'] >= 30]
MUZ = 7.0
def solve(rel, V, sp=140.0):
    rng = math.sqrt(sum(x * x for x in rel))
    a = sum(v * v for v in V) - sp * sp; b = 2 * sum(r * v for r, v in zip(rel, V)); c = rng * rng
    return (-b - math.sqrt(max(0.0, b * b - 4 * a * c))) / (2 * a)
air = [o for o in mm if not o['t_grounded']]
print('airborne-target shots:', len(air))
hyp = collections.defaultdict(list)
for o in air:
    E = o['tf'] - 1
    S = R.pos(o['s'], E); C = R.pos(o['tgt'], E)
    vb = R.vel(o['tgt'], E, back=True)
    # instantaneous vz at E is closer to backward diff - g*dt/2 ; keep simple
    rel = [C[0] - S[0], C[1] - S[1], C[2] + 4.5 - (S[2] + MUZ)]
    for name, V, gflag in (('no vertical lead (vz=0)', (vb[0], vb[1], 0.0), 0), ('linear vz lead', vb, 0), ('linear vz lead + gravity drop', vb, 1), ('half vz', (vb[0], vb[1], vb[2] * 0.5), 0)):
        tau = solve(rel, V)
        lp = [rel[i] + V[i] * tau for i in range(3)]
        if gflag: lp[2] -= 0.5 * 22 * tau * tau
        hyp[name].append(math.degrees(o['pitch'] - math.atan2(lp[2], math.hypot(lp[0], lp[1]))))
rows = [[k, len(v), mean(v), sd(v), pct([abs(x) for x in v], .5)] for k, v in hyp.items()]
print(table(['pitch hypothesis (airborne targets)', 'n', 'mean resid deg', 'sd', 'median |resid|'], rows))
# split by rising under jet (vz ~ +8.9 const) vs falling
for label, cond in (('rising (vz>5)', lambda o: o['tvz'] > 5), ('falling (vz<-3)', lambda o: o['tvz'] < -3), ('near apex', lambda o: -3 <= o['tvz'] <= 5)):
    g = [o for o in air if cond(o)]
    hy = collections.defaultdict(list)
    for o in g:
        E = o['tf'] - 1
        S = R.pos(o['s'], E); C = R.pos(o['tgt'], E); vb = R.vel(o['tgt'], E, back=True)
        rel = [C[0] - S[0], C[1] - S[1], C[2] + 4.5 - (S[2] + MUZ)]
        for name, V in (('vz=0', (vb[0], vb[1], 0.0)), ('linear', vb)):
            tau = solve(rel, V); lp = [rel[i] + V[i] * tau for i in range(3)]
            hy[name].append(math.degrees(o['pitch'] - math.atan2(lp[2], math.hypot(lp[0], lp[1]))))
    h = sum(1 for o in g if o['hit'])
    print('  %-16s n=%d hit %d (%.0f%%) | resid sd: vz=0 %.2f (mean %+.2f), linear vz %.2f (mean %+.2f)' % (label, len(g), h, 100 * h / max(1, len(g)), sd(hy['vz=0']), mean(hy['vz=0']), sd(hy['linear']), mean(hy['linear'])))
# spread check: bullet direction vs shooter aim interpolated at fire tick, only when aim is steady
dy = []; dp = []
for o in G:
    if o['q'] != 'track': continue
    a0 = R.row(o['s'], o['tf'] - 1); a1 = R.row(o['s'], o['tf'] + 1)
    if not a0 or not a1: continue
    if abs(angdiff(a1[MYAW], a0[MYAW])) > 0.011 or abs(a1[MPIT] - a0[MPIT]) > 0.011: continue
    dy.append(math.degrees(angdiff(o['yaw'], (a0[MYAW] + angdiff(a1[MYAW], a0[MYAW]) / 2))))
    dp.append(math.degrees(o['pitch'] - (a0[MPIT] + a1[MPIT]) / 2))
print('\nspread: bullet direction minus torso aim (steady-aim shots only): n %d yaw sd %.3f deg pitch sd %.3f deg (aim is rounded to 0.01 rad = 0.57 deg, adding ~0.17 deg rms)' % (len(dy), sd(dy), sd(dp)))
print('   |yaw| p50 %.2f p90 %.2f p99 %.2f max %.2f ; Gaussian sd 0.6 -> p50 0.40 p90 0.99 p99 1.55' % (pct([abs(x) for x in dy], .5), pct([abs(x) for x in dy], .9), pct([abs(x) for x in dy], .99), max(abs(x) for x in dy)))
# ballistic prediction clamped at the ground
W = World()
def pred_pitch(o, mode):
    E = o['tf'] - 1
    S = R.pos(o['s'], E); C = R.pos(o['tgt'], E); vb = R.vel(o['tgt'], E, back=True)
    mz = (S[0], S[1], S[2] + MUZ)
    tau = math.dist(mz, (C[0], C[1], C[2] + 4.5)) / 140.0
    for _ in range(5):
        x = C[0] + vb[0] * tau; y = C[1] + vb[1] * tau
        if mode == 'ballistic_clamped':
            vz_inst = vb[2] - 22 * 0.05     # backward mean over 0.1 s -> instantaneous at E
            z = C[2] + vz_inst * tau - 0.5 * 22 * tau * tau
            z = max(z, W.surface_z(x, y, C[2] + 1.0))
        elif mode == 'ballistic':
            vz_inst = vb[2] - 22 * 0.05
            z = C[2] + vz_inst * tau - 0.5 * 22 * tau * tau
        elif mode == 'linear_clamped':
            z = max(C[2] + vb[2] * tau, W.surface_z(x, y, C[2] + 1.0))
        elif mode == 'ground':
            z = W.surface_z(x, y, C[2] + 1.0)
        else:
            z = C[2]
        tau = math.dist(mz, (x, y, z + 4.5)) / 140.0
    return math.atan2(z + 4.5 - mz[2], math.hypot(x - mz[0], y - mz[1]))
print('\npitch residuals for airborne targets, more hypotheses:')
rows = []
for mode in ('flat', 'ballistic', 'ballistic_clamped', 'linear_clamped', 'ground'):
    for label, cond in (('all airborne', lambda o: True), ('rising', lambda o: o['tvz'] > 5), ('falling', lambda o: o['tvz'] < -3)):
        v = [math.degrees(o['pitch'] - pred_pitch(o, mode)) for o in air if cond(o)]
        rows.append([mode, label, len(v), mean(v), sd(v), pct([abs(x) for x in v], .5), pct([abs(x) for x in v], .9)])
print(table(['model', 'subset', 'n', 'mean', 'sd', 'median |resid|', 'p90 |resid|'], rows))
