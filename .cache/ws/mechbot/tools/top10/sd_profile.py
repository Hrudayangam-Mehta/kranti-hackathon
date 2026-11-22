#!/usr/bin/env python3
"""Behaviour profile of one team from the recorded showdowns (16-mech free-for-alls, 10 frames/s).
Own analysis code; input is replay DATA only (see sd_load.py). No line-of-sight model: distances only.
usage: sd_profile.py TEAM [--hours 9,10,11]"""
import sys, os, math, collections, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sd_load
team = sys.argv[1]
d = sd_load.load()
d.sort(key=lambda r: (r['hdr']['showdown']['id'], r['hdr']['showdown']['match']))
WK = ['gun', 'mortar', 'laser', 'lightning']
DT = 0.1
def q(xs, p):
    xs = sorted(xs)
    if not xs: return float('nan')
    k = (len(xs) - 1) * p
    lo, hi = int(math.floor(k)), int(math.ceil(k))
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)
def qs(xs): return 'n=%d q10 %.0f q25 %.0f med %.0f q75 %.0f q90 %.0f' % (len(xs), q(xs, .1), q(xs, .25), q(xs, .5), q(xs, .75), q(xs, .9)) if xs else 'n=0'
def wrap(a): return (a + math.pi) % (2 * math.pi) - math.pi
class M:   # one match, indexed tracks
    def __init__(s, r):
        s.r = r; s.names = [m['name'] for m in r['hdr']['mechs']]
        s.n = len(r['frames'])
        s.tr = {i: [None] * s.n for i in range(16)}
        s.dr = collections.defaultdict(dict)
        s.ev = []
        for k, f in enumerate(r['frames']):
            for row in f['m']: s.tr[row[0]][k] = row
            for n in f.get('n', []): s.dr[n[0]][k] = n
            for e in f.get('ev', []): s.ev.append((e['t'] / 20.0, e))
        s.crates = {c['id']: c['pos'] for c in r['hdr']['crates']}
        s.t0 = r['frames'][0]['t'] / 20.0
    def k(s, t): return max(0, min(s.n - 1, int(round((t - s.t0) / DT))))
    def row(s, i, t):
        if i < 16: return s.tr[i][s.k(t)]
        kk = s.k(t)
        dd = s.dr.get(i, {})
        for j in (kk, kk - 1, kk + 1, kk - 2, kk + 2):
            if j in dd: return dd[j]
        return None
    def pos(s, i, t):
        if i >= 1000: return s.crates.get(i)
        rw = s.row(i, t)
        return rw[1:4] if rw else None
    def alive(s, i, t):
        rw = s.tr[i][s.k(t)]
        return rw is not None and rw[6] > 0
def dist(a, b): return math.hypot(a[0] - b[0], a[1] - b[1])
A = collections.defaultdict(list)     # aggregated samples
C = collections.Counter()
per = []
for r in d:
    me = sd_load.idx(r, team)
    if me < 0: continue
    m = M(r)
    res = r['result']['mechs'][me]
    life = res['death_t'] if res.get('death_t') is not None else r['frames'][-1]['t'] / 20.0
    hour = r['hdr']['showdown']['title'].split(', ')[-1]
    tr = m.tr[me]
    kend = m.k(life)
    # ---- events indexed
    dealt = [(t, e) for t, e in m.ev if e['e'] == 'hit' and e['src'] == me]
    taken = [(t, e) for t, e in m.ev if e['e'] == 'hit' and e['dst'] == me]
    pvp_d = [(t, e) for t, e in dealt if e['dst'] < 16]
    pvp_t = [(t, e) for t, e in taken if e['src'] < 16]
    fires = [(t, e) for t, e in m.ev if e['e'] == 'fire' and e['id'] == me]
    charges = [(t, e) for t, e in m.ev if e['e'] == 'charge' and e['id'] == me]
    beams = [(t, e) for t, e in m.ev if e['e'] == 'laser' and e['id'] == me]
    zaps = [(t, e) for t, e in m.ev if e['e'] == 'zap' and e['id'] == me]
    takes = [(t, e) for t, e in m.ev if e['e'] == 'weapon' and e.get('by') == me and e['op'] == 'take']
    # ---- movement classes
    sp = [0.0] * m.n
    for k in range(1, kend + 1):
        a, b = tr[k - 1], tr[k]
        if a and b: sp[k] = math.hypot(b[1] - a[1], b[2] - a[2]) / DT
    engaged = [False] * m.n   # hit dealt to / taken from a mech within +-2 s
    for t, e in pvp_d + pvp_t:
        for k in range(m.k(t - 2), m.k(t + 2) + 1): engaged[k] = True
    shooting_any = [False] * m.n
    for t, e in fires + charges + zaps + beams:
        for k in range(m.k(t - 1.0), m.k(t + 1.0) + 1): shooting_any[k] = True
    for k in range(1, kend + 1):
        rw = tr[k]
        if not rw or rw[6] <= 0: continue
        C['frames'] += 1
        grounded, boost, chg = rw[8] & 1, rw[8] & 2, rw[8] & 4
        has_laser = 2 in (rw[11], rw[12]); has_zap = 3 in (rw[11], rw[12])
        C['still'] += sp[k] < 1.0; C['quiet'] += 1.0 <= sp[k] < 5.0; C['walk'] += 5.0 <= sp[k] and not boost
        C['boost'] += bool(boost); C['air'] += not grounded
        C['has_laser'] += has_laser; C['chg_flag'] += bool(chg); C['chg_flag_idle'] += bool(chg) and not engaged[k]
        C['idle'] += not engaged[k]; C['eng'] += engaged[k]
        C['idle_shooting'] += (not engaged[k]) and shooting_any[k]
        if engaged[k]:
            C['eng_still'] += sp[k] < 1.0; C['eng_boost'] += bool(boost); C['eng_air'] += not grounded; C['eng_slow'] += sp[k] < 5.0
        else:
            C['idle_still'] += sp[k] < 1.0; C['idle_quiet'] += sp[k] < 5.0; C['idle_boost'] += bool(boost)
            a = tr[k - 1]
            if a: A['idle_yawrate'].append(abs(wrap(rw[4] - a[4])) / DT)
        if k >= 1 and tr[k - 1]:
            A['yawrate_all'].append(abs(wrap(rw[4] - tr[k - 1][4])) / DT)
    # ---- opening
    first_fire = min([t for t, e in fires] + [t for t, e in charges] + [t for t, e in zaps] + [1e9])
    first_tgt = None
    if dealt:
        e0 = dealt[0][1]; first_tgt = 'mech' if e0['dst'] < 16 else ('drone' if e0['dst'] < 1000 else 'crate')
    lasers = [p for p in r['hdr']['pickups'] if p['kind'] == 'laser']
    spawn = r['hdr']['mechs'][me]['spawn']
    nl = min((dist(spawn, p['pos']), p['pos'][2] - spawn[2]) for p in lasers) if lasers else (float('nan'), 0)
    nany = min((dist(spawn, p['pos']), p['kind'], round(p['pos'][2] - spawn[2], 1)) for p in r['hdr']['pickups'])
    near_mech = min(dist(spawn, mm['spawn']) for j, mm in enumerate(r['hdr']['mechs']) if j != me)
    k5 = min(kend, m.k(5.0)); k10 = min(kend, m.k(10.0))
    d5 = dist(tr[k5][1:3], spawn[:2]) if tr[k5] else float('nan')
    boost10 = sum(1 for k in range(1, k10 + 1) if tr[k] and tr[k][8] & 2) / max(1, k10)
    first_take = takes[0] if takes else None
    per.append(dict(hour=hour, seed=r['seed'], place=res['place'], life=life, first_fire=first_fire, first_tgt=first_tgt, nearest_laser=nl,
                    nearest_any=nany, near_mech=near_mech, d5=d5, boost10=boost10,
                    first_take=(round(first_take[0], 1), first_take[1]['kind']) if first_take else None,
                    first_pvp_d=round(pvp_d[0][0], 1) if pvp_d else None, first_pvp_t=round(pvp_t[0][0], 1) if pvp_t else None,
                    cubes=[(tr[m.k(tt)][9] if tt < life and tr[m.k(tt)] else None) for tt in (30, 60, 90, 120)],
                    crates=[round(t, 1) for t, e in m.ev if e['e'] == 'crate' and e.get('by') == me],
                    drones=[round(t, 1) for t, e in m.ev if e['e'] == 'death' and e.get('by') == me and 100 <= e['id'] < 1000]))
    # ---- engagement ranges
    for t, e in pvp_d:
        p1, p2 = m.pos(me, t), m.pos(e['dst'], t)
        if p1 and p2: A['r_dealt_' + str(e.get('w'))].append(dist(p1, p2))
        v = m.row(e['dst'], t - 0.1)
        if v: A['victim_hpfrac'].append(v[6] / max(1, v[10]))
    for t, e in pvp_t:
        p1, p2 = m.pos(me, t), m.pos(e['src'], t)
        if p1 and p2: A['r_taken_' + str(e.get('w'))].append(dist(p1, p2))
    # ---- laser handling
    for (tc, ec) in charges:
        nb = [(tb, eb) for tb, eb in beams if tb >= tc - 0.01]
        if not nb: continue
        tb, eb = nb[0]
        A['chg_to_fire'].append(tb - tc)
        hits = eb.get('hits') or []
        cls = 'mech' if any(h < 16 for h in hits) else ('drone' if any(100 <= h < 1000 for h in hits) else ('crate' if hits else 'none'))
        C['beam_' + cls] += 1
        ks = range(m.k(tc), m.k(tb) + 1)
        A['speed_while_charging'].append(statistics.mean(sp[k] for k in ks))
        if cls == 'mech':
            A['beam_len_mech'].append(math.dist(eb['from'], eb['to']))
        if cls == 'none':
            # was a mech near the beam line? (missed shot at a mech)
            fx, fy = eb['from'][0], eb['from'][1]; yaw = math.atan2(eb['to'][1] - fy, eb['to'][0] - fx)
            near = False
            for j in range(16):
                if j == me or not m.alive(j, tb): continue
                pj = m.pos(j, tb)
                dj = dist((fx, fy), pj)
                if dj < 285 and abs(wrap(math.atan2(pj[1] - fy, pj[0] - fx) - yaw)) < 0.12: near = True
            C['beam_none_near_mech'] += near
    # enemy lasers aimed at us: hit or not
    for t, e in m.ev:
        if e['e'] == 'laser' and e['id'] != me and e['id'] < 16 and m.alive(me, t - 0.05):
            fx, fy = e['from'][0], e['from'][1]; yaw = math.atan2(e['to'][1] - fy, e['to'][0] - fx)
            pj = m.pos(me, t)
            if not pj: continue
            dj = dist((fx, fy), pj)
            if me in (e.get('hits') or []):
                C['enemy_beam_hit_us'] += 1; A['enemy_beam_hit_range'].append(dj)
                A['our_speed_when_lasered'].append(sp[m.k(t)])
            elif dj < 285 and abs(wrap(math.atan2(pj[1] - fy, pj[0] - fx) - yaw)) < 0.10 and not (e.get('hits') or []):
                C['enemy_beam_missed_us'] += 1
    # ---- radial behaviour vs current opponent
    last_opp, last_t = None, -1e9
    evs = sorted([(t, e['dst']) for t, e in pvp_d] + [(t, e['src']) for t, e in pvp_t])
    ei = 0
    lat_sign, lat_t = 0, None
    for k in range(2, kend + 1):
        t = m.t0 + k * DT
        while ei < len(evs) and evs[ei][0] <= t:
            last_opp, last_t = evs[ei][1], evs[ei][0]; ei += 1
        rw = tr[k]
        if last_opp is None or t - last_t > 2.5 or not rw or rw[6] <= 0: 
            lat_sign, lat_t = 0, None
            continue
        o1, o0 = m.tr[last_opp][k], m.tr[last_opp][k - 2]
        a0 = tr[k - 2]
        if not o1 or not o0 or not a0 or o1[6] <= 0: continue
        d1, d0 = dist(rw[1:3], o1[1:3]), dist(a0[1:3], o0[1:3])
        # own radial velocity only (project own displacement on the line to the opponent)
        ux, uy = (o1[1] - rw[1]) / max(d1, 1e-6), (o1[2] - rw[2]) / max(d1, 1e-6)
        vx, vy = (rw[1] - a0[1]) / (2 * DT), (rw[2] - a0[2]) / (2 * DT)
        closing = vx * ux + vy * uy            # + = moving toward the opponent
        lateral = -vx * uy + vy * ux
        s0, s1 = rw[11], rw[12]
        load = 'L+Z' if (2 in (s0, s1) and 3 in (s0, s1)) else ('laser' if 2 in (s0, s1) else ('zap' if 3 in (s0, s1) else 'gun'))
        hpf = rw[6] / max(1, rw[10])
        ohpf = o1[6] / max(1, o1[10])
        db = '0-30' if d1 < 30 else '30-45' if d1 < 45 else '45-70' if d1 < 70 else '70-100' if d1 < 100 else '100-140' if d1 < 140 else '140-200' if d1 < 200 else '200+'
        A['close|%s|%s' % (load, db)].append(closing)
        hb = 'hp<25' if hpf < .25 else 'hp25-40' if hpf < .4 else 'hp40-60' if hpf < .6 else 'hp60-80' if hpf < .8 else 'hp80+'
        A['closehp|%s' % hb].append(closing)
        A['closeadv|%s' % ('ahead' if hpf > ohpf + 0.1 else 'behind' if hpf < ohpf - 0.1 else 'even')].append(closing)
        A['eng_speed'].append(math.hypot(vx, vy)); A['eng_lat'].append(abs(lateral))
        sg = 1 if lateral > 2 else -1 if lateral < -2 else 0
        if sg != 0:
            if lat_sign != 0 and sg != lat_sign and lat_t is not None:
                A['strafe_interval'].append(t - lat_t); lat_t = t
            if lat_sign == 0 or lat_t is None: lat_t = t
            lat_sign = sg
    # ---- response to being attacked first, and who starts
    opps = set(e['dst'] for t, e in pvp_d) | set(e['src'] for t, e in pvp_t)
    for o in opps:
        td = [t for t, e in pvp_d if e['dst'] == o]; tt = [t for t, e in pvp_t if e['src'] == o]
        if td and (not tt or td[0] < tt[0]): C['we_started'] += 1
        else:
            C['they_started'] += 1
            back = [t for t in td if t > tt[0]]
            if back and back[0] - tt[0] <= 10: A['return_fire_delay'].append(back[0] - tt[0])
            else: C['no_return_fire'] += 1
    # ---- target choice at engagement start
    prev = None
    for t, e in pvp_d:
        o = e['dst']
        if o != prev:
            prev = o
            pm = m.pos(me, t)
            ds = sorted((dist(pm, m.pos(j, t)), j) for j in range(16) if j != me and m.alive(j, t - 0.2))
            if ds: C['tgt_is_nearest'] += ds[0][1] == o; C['tgt_starts'] += 1
            C['tgt_third_party'] += any(1 for t2, e2 in m.ev if e2['e'] == 'hit' and e2['dst'] == o and e2['src'] not in (me, o) and e2['src'] < 16 and t - 5 <= t2 < t)
            C['tgt_retaliation'] += any(1 for t2, e2 in pvp_t if e2['src'] == o and t - 5 <= t2 < t)
            v = m.row(o, t - 0.1)
            if v: A['tgt_start_hpfrac'].append(v[6] / max(1, v[10])); A['tgt_start_range'].append(ds and dist(pm, m.pos(o, t)) or 0)
    # ---- death circumstances
    if res.get('death_t') is not None:
        td = res['death_t']
        att = collections.Counter()
        for t, e in taken:
            if td - 10 <= t <= td and e['src'] < 16: att[m.names[e['src']]] += e['amt']
        hp10 = tr[m.k(td - 10)][6] if td > 10 and tr[m.k(td - 10)] else 1400
        kb = res.get('killed_by')
        kr = dist(m.pos(me, td - 0.1), m.pos(kb, td - 0.1)) if isinstance(kb, int) and kb < 16 and m.pos(kb, td - 0.1) else float('nan')
        lastd = [t for t, e in dealt if t <= td]
        lastt = max(((t, e) for t, e in dealt if t <= td), key=lambda x: x[0], default=None)
        what = None
        if lastt:
            e = lastt[1]; what = ('mech:' + m.names[e['dst']]) if e['dst'] < 16 else ('drone' if e['dst'] < 1000 else 'crate')
        rw = tr[m.k(td - 0.2)]
        A['deaths'].append('%s seed %s t=%.1f place %d killer %s (%s) at %.0f m; attackers last 10 s: %s; hp 10 s earlier %d; our last hit: %s at t=%s; state: speed %.1f m/s%s%s' % (
            hour, r['seed'], td, res['place'], m.names[kb] if isinstance(kb, int) and kb < 16 else kb, res.get('killed_with'), kr, dict(att), hp10, what,
            round(lastt[0], 1) if lastt else None, sp[m.k(td - 0.2)], ' boosting' if rw and rw[8] & 2 else '', ' charging' if rw and rw[8] & 4 else ''))
    # ---- zone
    zs = r['hdr']['zone']
    for k in range(1, kend + 1, 10):
        f = r['frames'][k]; rw = tr[k]
        if rw and f.get('z'):
            cx, cy, rr = f['z']
            if rr > 1: A['zone_ratio'].append(dist(rw[1:3], (cx, cy)) / rr); C['zone_samples'] += 1; C['zone_outside'] += dist(rw[1:3], (cx, cy)) > rr
    for ph in zs[1:]:
        if ph['shrink_start'] < life:
            rw = tr[m.k(ph['shrink_start'])]
            if rw: C['in_next_at_shrink_start'] += dist(rw[1:3], ph['center']) < ph['radius']; C['shrink_starts'] += 1
    # ---- low hp behaviour: seconds with hp<35% under fire, and whether still dealing damage
    for k in range(1, kend + 1):
        rw = tr[k]
        if rw and 0 < rw[6] < 0.35 * rw[10]:
            t = m.t0 + k * DT
            under = any(1 for tt, e in pvp_t if t - 3 <= tt <= t)
            if under:
                C['lowhp_frames'] += 1
                C['lowhp_attacking'] += any(1 for tt, e in pvp_d if t - 1.5 <= tt <= t + 1.5)
                C['lowhp_boost'] += bool(rw[8] & 2)
print('=====', team, 'matches', len(per))
for p in per: print(p)
F = C['frames']
pc = lambda a, b=F: '%.0f%%' % (100.0 * C[a] / max(1, C[b] if isinstance(b, str) else b))
print('\n-- movement (share of alive time, %d frames = %.0f s)' % (F, F * DT))
print('still<1m/s', pc('still'), '| quiet 1-5 m/s', pc('quiet'), '| walking', pc('walk'), '| boosting', pc('boost'), '| airborne', pc('air'))
print('engaged share', pc('eng'), '| engaged: still', pc('eng_still', 'eng'), 'slow<5', pc('eng_slow', 'eng'), 'boost', pc('eng_boost', 'eng'), 'air', pc('eng_air', 'eng'))
print('idle: still', pc('idle_still', 'idle'), 'quiet<5', pc('idle_quiet', 'idle'), 'boost', pc('idle_boost', 'idle'), '| idle but shooting (crates/drones/far)', pc('idle_shooting', 'idle'))
print('torso yaw rate while idle rad/s:', qs([x * 100 for x in A['idle_yawrate']]), '(x100) | share of idle frames turning > 2 rad/s: %.0f%%' % (100.0 * sum(1 for x in A['idle_yawrate'] if x > 2) / max(1, len(A['idle_yawrate']))))
print('laser held', pc('has_laser'), '| charging flag set', pc('chg_flag', 'has_laser'), 'of laser-held time; charging while idle', pc('chg_flag_idle', 'idle'), 'of idle time')
print('\n-- laser: charge->release s', qs([x * 100 for x in A['chg_to_fire']]), '(x100)')
print('beams: mech %d drone %d crate %d none %d (of the none, a mech was within 0.12 rad of the beam: %d)' % (C['beam_mech'], C['beam_drone'], C['beam_crate'], C['beam_none'], C['beam_none_near_mech']))
print('own speed while charging m/s', qs(A['speed_while_charging']), '| beam length on mech hits', qs(A['beam_len_mech']))
print('enemy beams: hit us %d, passed within 0.10 rad without hitting %d | range of hits on us %s | our speed when hit %s' % (C['enemy_beam_hit_us'], C['enemy_beam_missed_us'], qs(A['enemy_beam_hit_range']), qs(A['our_speed_when_lasered'])))
print('\n-- ranges of hits dealt to mechs')
for k in sorted(A):
    if k.startswith('r_dealt_'): print('  ', k[8:], qs(A[k]))
print('-- ranges of hits taken from mechs')
for k in sorted(A):
    if k.startswith('r_taken_'): print('  ', k[8:], qs(A[k]))
print('victim hp fraction at our hits: %s (x100) ; share below 50%%: %.0f%%' % (qs([x * 100 for x in A['victim_hpfrac']]), 100.0 * sum(1 for x in A['victim_hpfrac'] if x < .5) / max(1, len(A['victim_hpfrac']))))
print('\n-- own closing speed toward current opponent (m/s, + = approaching), by loadout and distance')
for k in sorted(A):
    if k.startswith('close|'): print('   %-22s n=%4d mean %+5.1f  share approaching>2: %2.0f%% retreating<-2: %2.0f%%' % (k[6:], len(A[k]), statistics.mean(A[k]), 100.0 * sum(1 for x in A[k] if x > 2) / len(A[k]), 100.0 * sum(1 for x in A[k] if x < -2) / len(A[k])))
for k in sorted(A):
    if k.startswith('closehp|') or k.startswith('closeadv|'): print('   %-22s n=%4d mean %+5.1f  approaching %2.0f%% retreating %2.0f%%' % (k, len(A[k]), statistics.mean(A[k]), 100.0 * sum(1 for x in A[k] if x > 2) / len(A[k]), 100.0 * sum(1 for x in A[k] if x < -2) / len(A[k])))
print('engaged speed', qs(A['eng_speed']), '| lateral speed', qs(A['eng_lat']), '| strafe reversal interval s (x10)', qs([x * 10 for x in A['strafe_interval']]))
print('\n-- who starts: we %d, they %d; when they start: return fire within 10 s in %d (delay s x10 %s), none in %d' % (C['we_started'], C['they_started'], len(A['return_fire_delay']), qs([x * 10 for x in A['return_fire_delay']]), C['no_return_fire']))
print('target at engagement start: n=%d nearest mech %d, already fought by a third mech (5 s) %d, had hit us first (5 s) %d; hp frac x100 %s; range %s' % (
    C['tgt_starts'], C['tgt_is_nearest'], C['tgt_third_party'], C['tgt_retaliation'], qs([x * 100 for x in A['tgt_start_hpfrac']]), qs(A['tgt_start_range'])))
print('low hp (<35%%) under fire: %.1f s; still hitting a mech within 1.5 s: %s; boosting: %s' % (C['lowhp_frames'] * DT, pc('lowhp_attacking', 'lowhp_frames'), pc('lowhp_boost', 'lowhp_frames')))
print('zone: centre distance / radius', qs([x * 100 for x in A['zone_ratio']]), '(x100) outside %s ; inside next circle when shrink starts: %d of %d' % (pc('zone_outside', 'zone_samples'), C['in_next_at_shrink_start'], C['shrink_starts']))
print('\n-- deaths')
for s in A['deaths']: print('  ', s)
