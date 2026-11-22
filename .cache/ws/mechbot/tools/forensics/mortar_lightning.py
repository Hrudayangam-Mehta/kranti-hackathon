"""Section 8b: mortar and lightning use."""
import sys, os, math, collections, json, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import shots as shots_mod
R = Replay(); W = World()
S = shots_mod.build(R)
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
hits = [e for e in R.events if e['e'] == 'hit']
gun_tg = collections.defaultdict(list)
for o in G:
    if o['tgt'] is not None and o['tgt'] < 100: gun_tg[o['s']].append((o['tf'], o['tgt']))
print('## MORTAR: per shell')
recs = []
for rec in S['mortar']:
    f = rec['fire']; s = f['id']; tf = f['t']; b = rec['boom']
    if not b: continue
    tb = b['t']; at = b['at']
    ps = R.pos(s, tf)
    # target = mech (alive at fire) minimising distance from boom point to its position at boom time, tie-broken by gun target near that time
    best = None
    for m in R.ids:
        if m == s: continue
        pm = R.pos(m, tb) or R.pos(m, tb - 1)
        pf = R.pos(m, tf - 1)
        if not pm or not pf: continue
        d = math.hypot(pm[0] - at[0], pm[1] - at[1])
        if best is None or d < best[0]: best = (d, m, pm, pf)
    gt = [tg for (t, tg) in gun_tg.get(s, []) if abs(t - tf) <= 40]
    gun_target = collections.Counter(gt).most_common(1)[0][0] if gt else None
    tgt = best[1] if best and best[0] < 40 else gun_target
    hs = [h for h in hits if h['w'] == 'mortar' and h['src'] == s and h['t'] == tb]
    r = {'s': s, 'type': R.names[s], 'tf': tf, 'flight': (tb - tf) * TICK, 'tgt': tgt, 'gun_target': gun_target, 'hits': [(h['dst'], h['amt']) for h in hs], 'self': any(h['dst'] == s for h in hs)}
    if tgt is not None:
        pm = R.pos(tgt, tb) or R.pos(tgt, tb - 1); pf = R.pos(tgt, tf - 1); vf = R.vel(tgt, tf - 1, back=True) or (0, 0, 0)
        if pm and pf:
            r['range'] = math.hypot(pf[0] - ps[0], pf[1] - ps[1])
            r['miss'] = math.hypot(pm[0] - at[0], pm[1] - at[1])
            r['miss_dz'] = at[2] - pm[2]
            # where was it aimed relative to target at fire: boom - pf, decomposed along target velocity
            lead_pt = (pf[0] + vf[0] * r['flight'], pf[1] + vf[1] * r['flight'])
            r['d_boom_to_nolead'] = math.hypot(at[0] - pf[0], at[1] - pf[1])
            r['d_boom_to_linlead'] = math.hypot(at[0] - lead_pt[0], at[1] - lead_pt[1])
            r['tspeed'] = math.hypot(vf[0], vf[1])
            r['los'] = W.los(ps[0], ps[1], ps[2] + 8, pf[0], pf[1], pf[2] + 4.5) >= 1.0
            r['t_air'] = not (R.row(tgt, tf - 1)[MFL] & 1)
            r['dz_tgt'] = pf[2] - ps[2]
    recs.append(r)
for r in recs:
    print('  %2d %-10s t=%5.1fs flight %.2fs tgt=%s range=%s miss=%s (dz %s) | boom vs target-at-fire %s m, vs linear-lead point %s m | target speed %s %s LOS=%s | hits %s' % (
        r['s'], r['type'], r['tf'] * TICK, r['flight'], r['tgt'], '%.0f' % r['range'] if 'range' in r else '?', '%.1f' % r['miss'] if 'miss' in r else '?', '%.1f' % r['miss_dz'] if 'miss_dz' in r else '?',
        '%.1f' % r['d_boom_to_nolead'] if 'd_boom_to_nolead' in r else '?', '%.1f' % r['d_boom_to_linlead'] if 'd_boom_to_linlead' in r else '?', '%.1f' % r['tspeed'] if 'tspeed' in r else '?', 'air' if r.get('t_air') else 'gnd', r.get('los'), r['hits']))
ok = [r for r in recs if 'miss' in r]
print('\nshells %d ; with a damaging hit %d (%.0f%%) ; direct hits (base 200) 4 ; self-damage incidents %d' % (len(recs), sum(1 for r in recs if r['hits']), 100 * sum(1 for r in recs if r['hits']) / len(recs), sum(1 for r in recs if r['self'])))
print('range at fire: p10 %.0f p50 %.0f p90 %.0f min %.0f max %.0f ; flight time p50 %.2f' % (pct([r['range'] for r in ok], .1), median([r['range'] for r in ok]), pct([r['range'] for r in ok], .9), min(r['range'] for r in ok), max(r['range'] for r in ok), median([r['flight'] for r in ok])))
print('miss (horizontal boom -> target centre at boom time): p25 %.1f p50 %.1f p75 %.1f ; within 9.5 m (splash reach from axis): %d of %d' % (pct([r['miss'] for r in ok], .25), median([r['miss'] for r in ok]), pct([r['miss'] for r in ok], .75), sum(1 for r in ok if r['miss'] <= 9.5), len(ok)))
mv = [r for r in ok if r['tspeed'] > 4 and r['flight'] > 0.5]
print('lead test (moving targets, flight > 0.5 s, n=%d): median distance boom->target-at-fire %.1f m ; boom->linear-lead point %.1f m' % (len(mv), median([r['d_boom_to_nolead'] for r in mv]), median([r['d_boom_to_linlead'] for r in mv])))
print('fired with geometric LOS to target: %d of %d ; target airborne at fire: %d' % (sum(1 for r in ok if r['los']), len(ok), sum(1 for r in ok if r['t_air'])))
rows = []
for lo, hi in ((0, 40), (40, 80), (80, 130), (130, 240)):
    g = [r for r in ok if lo <= r['range'] < hi]
    rows.append(['%d-%d' % (lo, hi), len(g), sum(1 for r in g if r['hits']), median([r['miss'] for r in g]) if g else float('nan'), median([r['flight'] for r in g]) if g else float('nan')])
print(table(['range', 'shells', 'damaging', 'median miss m', 'median flight s'], rows))
by = collections.Counter(r['type'] for r in recs); print('shells by type', dict(by), ' hits by type', dict(collections.Counter(r['type'] for r in recs if r['hits'])))
# mortar holders: how often do they fire it when engaged?  mortar shots per engaged second
# ---- LIGHTNING
print('\n## LIGHTNING')
zaps = [e for e in R.events if e['e'] == 'zap']
for mid in sorted(set(z['id'] for z in zaps)):
    zs = [z for z in zaps if z['id'] == mid]
    # holding period
    hold = [(k, r) for k, r in enumerate(R.m[mid]) if r and r[MS1] == 3]
    hold_s = len(hold) / 10.0
    # time with a mech/npc/crate within 45 m and inside 30 deg cone? compute "opportunity" frames: any enemy mech within 45 m with LOS
    opp = 0; opp_cone = 0
    for k, r in hold:
        t = R.ticks[k]
        for m in R.ids:
            if m == mid: continue
            p = R.pos(m, t)
            if p and math.dist(p, (r[MX], r[MY], r[MZ])) <= 45:
                opp += 1
                b = math.atan2(p[1] - r[MY], p[0] - r[MX])
                if abs(angdiff(r[MYAW], b)) <= math.radians(15): opp_cone += 1
                break
    kinds = collections.Counter('mech' if z['hits'][0] < 100 else 'npc' if z['hits'][0] < 1000 else 'crate' for z in zs)
    dmg = sum(h['amt'] for h in hits if h['w'] == 'lightning' and h['src'] == mid)
    dist = [math.dist(z['path'][0], z['path'][1]) for z in zs]
    print(' mech %d (%s): held lightning %.0f s ; zaps %d (%s) ; damage %.0f ; frames with an enemy mech within 45 m: %.1f s (in 30 deg cone: %.1f s) ; zap range p50 %.0f max %.0f' % (mid, R.names[mid], hold_s, len(zs), dict(kinds), dmg, opp / 10.0, opp_cone / 10.0, median(dist), max(dist)))
    # bursts of zaps
    ts = [z['t'] for z in zs]; bursts = []; cur = [ts[0]]
    for a, b in zip(ts, ts[1:]):
        if b - a <= 12: cur.append(b)
        else: bursts.append(cur); cur = [b]
    bursts.append(cur)
    for bst in bursts:
        tg = collections.Counter(z['hits'][0] for z in zs if bst[0] <= z['t'] <= bst[-1])
        e0 = R.row(mid, bst[0] - 1)[MEN]; e1 = R.row(mid, bst[-1] + 1)[MEN] if R.row(mid, bst[-1] + 1) else None
        print('    burst t=%.1f-%.1fs zaps %d targets %s energy %s -> %s' % (bst[0] * TICK, bst[-1] * TICK, len(bst), dict(tg), e0, e1))
# energy of lightning holder during engaged close range: fraction of time at <6 energy
