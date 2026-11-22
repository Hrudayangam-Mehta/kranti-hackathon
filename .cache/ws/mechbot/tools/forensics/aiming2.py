"""Section 1 follow-ups: spread vs aim noise, obs staleness test, airborne targets, vertical lead."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
mm = [o for o in G if o['tgt'] is not None and o['tgt'] < 100 and o['q'] == 'track' and o['rng'] >= 30]
MUZ = 7.0
def lead_dir(S, C, V, sp=140.0):
    rel = [C[0] - S[0], C[1] - S[1], C[2] + 4.5 - (S[2] + MUZ)]
    rng = math.sqrt(sum(x * x for x in rel))
    a = sum(v * v for v in V) - sp * sp; b = 2 * sum(r * v for r, v in zip(rel, V)); c = rng * rng
    tau = (-b - math.sqrt(max(0.0, b * b - 4 * a * c))) / (2 * a)
    lp = [rel[i] + V[i] * tau for i in range(3)]
    return math.atan2(lp[1], lp[0]), math.atan2(lp[2], math.hypot(lp[0], lp[1])), math.atan2(rel[1], rel[0]), math.atan2(rel[2], math.hypot(rel[0], rel[1]))
print('## residual of bullet direction vs first-order-intercept model for different reference ticks / velocity estimates (deg)')
rows = []
for name, dE, vmode in (('obs tick E=tf-1, backward vel', 0, 'back'), ('E, central vel', 0, 'cen'), ('E, forward vel', 0, 'fwd'), ('stale obs E-2, backward vel', -2, 'back'), ('fire tick tf (E+1), backward vel', 1, 'back'), ('E, no lead (direct)', 0, 'none')):
    ry = []; rp = []
    for o in mm:
        E = o['tf'] - 1 + dE
        S = R.pos(o['s'], E); C = R.pos(o['tgt'], E)
        if S is None or C is None: continue
        vb = R.vel(o['tgt'], E, back=True); vf = R.vel(o['tgt'], E, back=False)
        if vb is None or vf is None: continue
        V = vb if vmode == 'back' else vf if vmode == 'fwd' else [(a + b) / 2 for a, b in zip(vb, vf)] if vmode == 'cen' else (0, 0, 0)
        ly, lp, dy, dp = lead_dir(S, C, V)
        ry.append(math.degrees(angdiff(o['yaw'], ly))); rp.append(math.degrees(o['pitch'] - lp))
    rows.append([name, len(ry), mean(ry), sd(ry), mean(rp), sd(rp)])
print(table(['hypothesis', 'n', 'yaw mean', 'yaw sd', 'pitch mean', 'pitch sd'], rows))
# low acceleration subset: target velocity change between backward and forward diff small
print('\n## same (E, backward vel) restricted to targets with nearly constant velocity around the shot (|v_fwd - v_back| < 1 m/s), per type')
rows = []
allr = []
for ty in ['ALL'] + TYPES:
    ry = []; rp = []
    for o in mm:
        if ty != 'ALL' and o['type'] != ty: continue
        E = o['tf'] - 1
        vb = R.vel(o['tgt'], E, back=True); vf = R.vel(o['tgt'], E, back=False)
        vbb = R.vel(o['tgt'], E - 2, back=True)
        if vb is None or vf is None or vbb is None: continue
        if math.dist(vb, vf) > 1.0 or math.dist(vb, vbb) > 1.0: continue
        S = R.pos(o['s'], E); C = R.pos(o['tgt'], E)
        ly, lp, dy, dp = lead_dir(S, C, vb)
        ry.append(math.degrees(angdiff(o['yaw'], ly))); rp.append(math.degrees(o['pitch'] - lp))
    rows.append([ty, len(ry), mean(ry), sd(ry), mean(rp), sd(rp)])
    if ty == 'ALL': allr = (ry, rp)
print(table(['type', 'n', 'yaw mean', 'yaw sd', 'pitch mean', 'pitch sd'], rows))
ry, rp = allr
print('  |yaw resid| percentiles: p50 %.2f p90 %.2f p99 %.2f ; for a Gaussian with sd 0.6: p50 0.40 p90 0.99 p99 1.55' % (pct([abs(x) for x in ry], .5), pct([abs(x) for x in ry], .9), pct([abs(x) for x in ry], .99)))
# airborne targets
print('\n## airborne vs grounded targets (unblocked)')
A = [o for o in G if o['tgt'] is not None and o['tgt'] < 100 and not o['blocked']]
rows = []
for lo, hi in ((0, 40), (40, 80), (80, 130), (130, 231)):
    row = ['%d-%d' % (lo, hi)]
    for gr in (True, False):
        g = [o for o in A if lo <= o['rng'] < hi and o['t_grounded'] == gr]
        h = sum(1 for o in g if o['hit'])
        row.append('%d/%d = %s' % (h, len(g), ('%.0f%%' % (100 * h / len(g))) if g else 'n/a'))
    rows.append(row)
print(table(['range', 'target grounded at fire', 'target airborne at fire'], rows))
# vertical lead for airborne targets
air = [o for o in mm if not o['t_grounded'] and abs(o['tvz']) > 3]
xs = [math.degrees(o['lpitch'] - o['dpitch_c']) for o in air]; ys = [math.degrees(o['pitch'] - o['dpitch_c']) for o in air]
if len(xs) > 5:
    mx, my = mean(xs), mean(ys); k = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    print('vertical lead for airborne targets with |vz|>3: n %d slope pitch_used vs pitch_needed(first order, no gravity) = %.2f ; sd(used-needed) %.2f deg ; sd(used) %.2f deg' % (len(xs), k, sd([y - x for x, y in zip(xs, ys)]), sd(ys)))
    # miss relative to truth in metres vertical
    mz = [o['miss_z'] for o in air if o['miss_z'] is not None]
    print('   bullet height above target feet at closest approach: p10 %.1f p50 %.1f p90 %.1f (body spans 0..9)' % (pct(mz, .1), pct(mz, .5), pct(mz, .9)))
# does the shooter fire while target not in LOS? blocked shots share by type
print('\n## where do missed bullets go? (signed lateral error wrt true intercept, m at target; + = ahead of the motion)')
rows = []
for lo, hi in ((40, 80), (80, 130), (130, 231)):
    g = [o for o in mm if lo <= o['rng'] < hi and abs(o['vlat']) >= 2]
    lm = [o['rng'] * angdiff(o['yaw'], o['tyaw']) * (1 if o['vlat'] > 0 else -1) for o in g]
    rows.append(['%d-%d' % (lo, hi), len(g), mean(lm), pct(lm, .1), pct(lm, .5), pct(lm, .9), 100.0 * sum(1 for x in lm if x > 2.8) / len(lm), 100.0 * sum(1 for x in lm if x < -2.8) / len(lm)])
print(table(['range', 'n', 'mean', 'p10', 'p50', 'p90', '% ahead by >2.8 m', '% behind by >2.8 m'], rows))
# shooter states at fire
print('\n## shooter state when firing at mechs')
A2 = [o for o in G if o['tgt'] is not None and o['tgt'] < 100]
rows = []
for ty in ['ALL'] + TYPES:
    g = [o for o in A2 if ty == 'ALL' or o['type'] == ty]
    rows.append([ty, len(g), 100.0 * sum(1 for o in g if not o['s_grounded']) / len(g), median([o['sspeed'] for o in g]), 100.0 * sum(1 for o in g if o['sspeed'] < 1) / len(g), 100.0 * sum(1 for o in g if o['sspeed'] > 10) / len(g)])
print(table(['type', 'shots', '% fired while airborne', 'median own speed', '% standing still (<1 m/s)', '% boosting (>10 m/s)'], rows))
