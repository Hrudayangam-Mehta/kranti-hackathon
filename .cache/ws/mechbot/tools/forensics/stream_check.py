"""Cross-check of the house-bot aim model on the CURRENT build using the kit conformance stream
(kit/check/stream.jsonl.gz: hello + 300 real observations of one mech fighting mech 10)."""
import gzip, json, sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
with gzip.open(os.path.join(P, 'kit/check/stream.jsonl.gz'), 'rt') as f:
    lines = [json.loads(l) for l in f]
hello = lines[0]; obs = [l for l in lines if l.get('type') == 'obs']
cfg = hello['config']
print('stream build: gun speed %s cooldown %s ; walk %s boost %s ; laser dmg %s charge %s' % (cfg['weapons']['gun']['speed'], cfg['weapons']['gun']['cooldown'], cfg['mech']['walk_speed'], cfg['mech']['boost_speed'], cfg['weapons']['laser']['damage'], cfg['weapons']['laser']['charge']))
by_t = {o['tick']: o for o in obs}
ps = [math.sqrt(sum(c * c for c in p['vel'])) for o in obs for p in o['projectiles'] if p['kind'] == 'gun']
print('enemy gun projectile speed seen in obs: n %d mean %.2f sd %.3f' % (len(ps), mean(ps), sd(ps)))
def lead(S, C, V, sp, muz=7.0, ch=4.5):
    rel = [C[0] - S[0], C[1] - S[1], C[2] + ch - (S[2] + muz)]
    rng = math.sqrt(sum(x * x for x in rel))
    a = sum(v * v for v in V) - sp * sp; b = 2 * sum(r * v for r, v in zip(rel, V)); c = rng * rng
    tau = (-b - math.sqrt(max(0.0, b * b - 4 * a * c))) / (2 * a)
    lp = [rel[i] + V[i] * tau for i in range(3)]
    return math.atan2(lp[1], lp[0]), math.atan2(lp[2], math.hypot(lp[0], lp[1])), math.atan2(rel[1], rel[0]), math.atan2(rel[2], math.hypot(rel[0], rel[1])), rng
# (a) enemy 10 aiming at me: aim seen at obs t was commanded from obs t-2
res = collections.defaultdict(list); rows = []
for o in obs:
    t = o['tick']; p = by_t.get(t - 2)
    if not p: continue
    e1 = [m for m in o['mechs'] if m['kind'] == 'mech']; e0 = [m for m in p['mechs'] if m['kind'] == 'mech']
    if not e1 or not e0 or e1[0]['id'] != e0[0]['id']: continue
    en1, en0 = e1[0], e0[0]
    if en0.get('charging') or en1.get('charging'): continue
    me0 = p['self']
    ly, lp, dy, dp, rng = lead(en0['pos'], me0['pos'], me0['vel'], cfg['weapons']['gun']['speed'])
    ly2, lp2, _, _, _ = lead(en0['pos'], me0['pos'], me0['vel'], 140.0)
    if abs(angdiff(en1['aim'][0], dy)) > math.radians(8): continue      # not aiming at me
    res['direct'].append(math.degrees(angdiff(en1['aim'][0], dy)))
    res['lead252'].append(math.degrees(angdiff(en1['aim'][0], ly)))
    res['lead140'].append(math.degrees(angdiff(en1['aim'][0], ly2)))
    res['need'].append(math.degrees(angdiff(ly, dy)))
    res['pitch_lead'].append(math.degrees(en1['aim'][1] - lp)); res['pitch_direct'].append(math.degrees(en1['aim'][1] - dp))
    res['rng'].append(rng)
n = len(res['direct'])
print('\n(a) enemy mech 10 aiming at the stream mech (frames where it is not charging its laser and aims within 8 deg): n = %d, range %.0f-%.0f m' % (n, min(res['rng']), max(res['rng'])))
for k in ('direct', 'lead252', 'lead140'):
    print('    yaw residual vs %-8s: mean %+.2f sd %.2f median|.| %.2f deg' % (k, mean(res[k]), sd(res[k]), median([abs(x) for x in res[k]])))
xs = res['need']; ys = res['direct']
mx, my = mean(xs), mean(ys)
print('    regression aim_offset = k * needed_lead(252 m/s): k = %.2f (n=%d, needed lead sd %.2f deg)' % (sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs), n, sd(xs)))
print('    pitch residual vs lead point centre (z+4.5): mean %+.2f sd %.2f deg' % (mean(res['pitch_lead']), sd(res['pitch_lead'])))
# (b) the stream mech itself: self.aim at t vs lead from obs t-2 on enemy
res2 = collections.defaultdict(list)
for o in obs:
    t = o['tick']; p = by_t.get(t - 2)
    if not p: continue
    e0 = [m for m in p['mechs'] if m['kind'] == 'mech']
    if not e0: continue
    en0 = e0[0]; me0 = p['self']; me1 = o['self']
    ly, lp, dy, dp, rng = lead(me0['pos'], en0['pos'], en0['vel'], cfg['weapons']['gun']['speed'])
    if abs(angdiff(me1['aim'][0], dy)) > math.radians(8): continue
    res2['direct'].append(math.degrees(angdiff(me1['aim'][0], dy))); res2['lead'].append(math.degrees(angdiff(me1['aim'][0], ly))); res2['need'].append(math.degrees(angdiff(ly, dy)))
    res2['pl'].append(math.degrees(me1['aim'][1] - lp))
n2 = len(res2['direct'])
if n2:
    xs = res2['need']; ys = res2['direct']; mx, my = mean(xs), mean(ys)
    print('\n(b) the stream mech aiming at mech 10: n = %d ; yaw residual vs direct sd %.2f ; vs 252 m/s lead sd %.2f (mean %+.2f) ; slope %.2f ; pitch residual mean %+.2f sd %.2f' % (n2, sd(res2['direct']), sd(res2['lead']), mean(res2['lead']), sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs), mean(res2['pl']), sd(res2['pl'])))
# (c) movement of the stream mech while fighting: lateral velocity sign reversals wrt enemy
lat = []
for o in obs:
    e = [m for m in o['mechs'] if m['kind'] == 'mech']
    if not e: continue
    me = o['self']; rel = (e[0]['pos'][0] - me['pos'][0], e[0]['pos'][1] - me['pos'][1]); rng = math.hypot(*rel)
    if not me['grounded']: continue
    lat.append((o['tick'], (-me['vel'][0] * rel[1] + me['vel'][1] * rel[0]) / rng, (me['vel'][0] * rel[0] + me['vel'][1] * rel[1]) / rng, rng))
ints = []; last = 0; lt = None
for (t, vl, vr, rng) in lat:
    if abs(vl) < 3: continue
    sg = 1 if vl > 0 else -1
    if last and sg != last and lt is not None and t - lt < 100: ints.append((t - lt) * TICK)
    if sg != last: lt = t
    last = sg
print('\n(c) stream mech strafe reversal intervals while an enemy is visible (s):', sorted(round(x, 2) for x in ints), ' median %.2f' % (median(ints) if ints else float('nan')))
print('    mean |v_lat| %.1f m/s, mean closing speed %+.1f m/s, range p10 %.0f p50 %.0f p90 %.0f' % (mean([abs(x[1]) for x in lat]), mean([x[2] for x in lat]), pct([x[3] for x in lat], .1), pct([x[3] for x in lat], .5), pct([x[3] for x in lat], .9)))
# (d) own gun cadence & jet hop
shots = [o['tick'] for a, o in zip(obs, obs[1:]) if a['self']['weapons'][0] and o['self']['weapons'][0] and o['self']['weapons'][0]['ammo'] == a['self']['weapons'][0]['ammo'] - 1 and o['tick'] - a['tick'] == 2]
print('\n(d) stream mech gun shot intervals (ticks):', collections.Counter(b - a for a, b in zip(shots, shots[1:])).most_common(6))
air = [o for o in obs if not o['self']['grounded']]
zs = [o['self']['pos'][2] for o in obs]
# hop apex
k = 0; hops = []
while k < len(obs):
    if not obs[k]['self']['grounded']:
        j = k
        while j < len(obs) and not obs[j]['self']['grounded']: j += 1
        if k > 0 and j < len(obs):
            hops.append((obs[k - 1]['tick'], (obs[j]['tick'] - obs[k - 1]['tick']) * TICK, max(o['self']['pos'][2] for o in obs[k:j]) - obs[k - 1]['self']['pos'][2], obs[k - 1]['self']['energy'] - min(o['self']['energy'] for o in obs[k:j])))
        k = j
    else: k += 1
print('    hops (start tick, duration s, apex m, energy used):', [(a, round(b, 2), round(c, 1), round(d, 1)) for a, b, c, d in hops])
dm = [(o['tick'], e['amount'], e['weapon'], e.get('rear')) for o in obs for e in o['events'] if e['type'] == 'damaged']
print('    damage taken events:', dm)
gs = sum(1 for o in obs for s in o['sounds'] if s['kind'] == 'gun'); gh = sum(1 for d in dm if d[2] == 'gun')
print('    gun sounds heard %d (all sources) ; gun hits taken %d ; laser beams %d hits %d' % (gs, gh, sum(1 for o in obs for b in o['beams'] if b['kind'] == 'laser'), sum(1 for d in dm if d[2] == 'laser')))
# enemy bullets seen: count distinct ids and how many hit
ids = set(p['id'] for o in obs for p in o['projectiles'] if p['kind'] == 'gun')
print('    distinct enemy gun bullets seen: %d ; gun hits taken in contiguous obs (ticks<=590): %d' % (len(ids), sum(1 for d in dm if d[2] == 'gun' and d[0] <= 590)))
