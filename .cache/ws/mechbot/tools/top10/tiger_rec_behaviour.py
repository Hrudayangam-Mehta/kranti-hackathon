# Behaviour statistics of named mechs in recorded showdowns (our own analysis of public recordings; read-only).
import gzip, json, sys, math, collections, statistics as st
path = sys.argv[1]
targets = sys.argv[2].split(',')
data = json.load(gzip.open(path, 'rt'))
WK = ["gun", "mortar", "laser", "lightning"]
def med(v):
    return round(st.median(v), 1) if v else None
def mean(v):
    return round(sum(v) / len(v), 2) if v else None
agg = {t: collections.defaultdict(list) for t in targets}
for mi, m in enumerate(data):
    hdr = m['hdr']
    names = {x['id']: x['name'] for x in hdr['mechs']}
    res = {r['id']: r for r in m['result']['mechs']}
    frames = m['frames']
    # index positions per frame
    pos = []  # list of dict id -> row
    for fr in frames:
        pos.append({r[0]: r for r in fr['m']})
    tick = [fr['t'] for fr in frames]
    for tname in targets:
        ids = [i for i, n in names.items() if n == tname]
        if not ids:
            continue
        me = ids[0]
        r = res[me]
        A = agg[tname]
        img = hdr['bots'][me][-6:]
        life = r['death_t'] if r['death_t'] is not None else tick[-1] / 20.0
        # movement
        n_alive = n_boost = n_air = n_still = n_charge = 0
        speeds = []
        near = []
        prev = None
        yaw_rates = []
        jumps = 0
        prev_ground = True
        slots_tl = []
        last_slots = None
        cubes60 = None
        hp_tl = []
        for k, P in enumerate(pos):
            row = P.get(me)
            if row is None or row[6] <= 0:
                continue
            t = tick[k] / 20.0
            n_alive += 1
            fl = row[8]
            grounded = bool(fl & 1)
            if fl & 2: n_boost += 1
            if not grounded: n_air += 1
            if fl & 4: n_charge += 1
            if prev_ground and not grounded: jumps += 1
            prev_ground = grounded
            if prev is not None:
                dt = t - prev[0]
                if 0 < dt < 0.3:
                    sp = math.hypot(row[1] - prev[1][1], row[2] - prev[1][2]) / dt
                    speeds.append(sp)
                    if sp < 1.0: n_still += 1
                    dy = (row[4] - prev[1][4] + math.pi) % (2 * math.pi) - math.pi
                    yaw_rates.append(abs(dy) / dt)
            prev = (t, row)
            dmin = 1e9
            for oid, orow in P.items():
                if oid != me and orow[6] > 0:
                    d = math.hypot(orow[1] - row[1], orow[2] - row[2])
                    dmin = min(dmin, d)
            if dmin < 1e8: near.append(dmin)
            sl = (row[11], row[12])
            if sl != last_slots:
                slots_tl.append((round(t, 1), tuple(WK[s] if s >= 0 else '-' for s in sl)))
                last_slots = sl
            if cubes60 is None and t >= 60: cubes60 = row[9]
            hp_tl.append((t, row[6] / max(1, row[10])))
        # events
        pvp_out = []; pvp_in = []
        first_out = first_in = None
        crate_k = npc_k = 0
        las_shots = las_hits_mech = 0
        las_ranges = []
        charges = 0
        gun_fires = 0
        zap = 0
        dmg_in_by = collections.Counter()
        dmg_out_w = collections.Counter()
        hit_events_in = []
        for k, fr in enumerate(frames):
            for e in fr.get('ev', []):
                et = e['t'] / 20.0
                ty = e['e']
                if ty == 'hit':
                    if e['src'] == me and e['dst'] < 16:
                        a = pos[k].get(me); b = pos[k].get(e['dst'])
                        if a and b:
                            d = math.hypot(a[1] - b[1], a[2] - b[2])
                            pvp_out.append((et, d, e['w'], e['amt'], e['dst']))
                            dmg_out_w[e['w']] += e['amt']
                            if first_out is None: first_out = (et, d, e['w'], names[e['dst']], b[6] / max(1, b[10]))
                    elif e['dst'] == me and e['src'] < 16:
                        a = pos[k].get(me); b = pos[k].get(e['src'])
                        if a and b:
                            d = math.hypot(a[1] - b[1], a[2] - b[2])
                            pvp_in.append((et, d, e['w'], e['amt'], e['src']))
                            dmg_in_by[e['src']] += e['amt']
                            hit_events_in.append((et, e['src']))
                            if first_in is None: first_in = (et, d, e['w'], names[e['src']])
                elif ty == 'crate' and e.get('by') == me: crate_k += 1
                elif ty == 'death' and e.get('by') == me and e['id'] >= 100: npc_k += 1
                elif ty == 'laser' and e['id'] == me:
                    las_shots += 1
                    hm = [h for h in e.get('hits', []) if h < 16]
                    if hm:
                        las_hits_mech += 1
                    a = pos[k].get(me)
                    if a:
                        las_ranges.append(math.hypot(e['to'][0] - e['from'][0], e['to'][1] - e['from'][1]))
                elif ty == 'charge' and e['id'] == me: charges += 1
                elif ty == 'fire' and e['id'] == me and e['w'] == 'gun': gun_fires += 1
                elif ty == 'zap' and e['id'] == me: zap += 1
        # who struck first in first exchange
        opener = None
        if first_out and first_in:
            opener = 'we' if first_out[0] < first_in[0] else 'they'
        elif first_out: opener = 'we(only)'
        elif first_in: opener = 'they(only)'
        # reaction after the first incoming pvp hit: change of distance to that attacker in 3 s
        react = None
        if first_in:
            t0 = first_in[0]
            src = pvp_in[0][4]
            k0 = min(range(len(tick)), key=lambda k: abs(tick[k] / 20.0 - t0))
            k1 = min(len(tick) - 1, k0 + 30)
            a0, b0 = pos[k0].get(me), pos[k0].get(src)
            a1, b1 = pos[k1].get(me), pos[k1].get(src)
            if a0 and b0 and a1 and b1 and a1[6] > 0:
                # own displacement component away from attacker
                ux, uy = a0[1] - b0[1], a0[2] - b0[2]
                l = math.hypot(ux, uy) or 1
                away = ((a1[1] - a0[1]) * ux + (a1[2] - a0[2]) * uy) / l
                react = round(away, 1)
        # attackers in last 5 s
        n_att5 = None; hp10 = None; kd = None
        if r['death_t'] is not None:
            td = r['death_t']
            n_att5 = len({s for (t, s) in hit_events_in if td - t <= 5})
            for (t, h) in hp_tl:
                if t >= td - 10:
                    hp10 = round(h, 2); break
            kb = r.get('killed_by')
            if kb is not None and kb < 16:
                kk = min(range(len(tick)), key=lambda k: abs(tick[k] / 20.0 - td)) - 1
                a, b = pos[kk].get(me), pos[kk].get(kb)
                if a and b: kd = round(math.hypot(a[1] - b[1], a[2] - b[2]))
        out_ranges = [d for (_, d, _, _, _) in pvp_out]
        gun_out = [d for (_, d, w, _, _) in pvp_out if w == 'gun']
        las_out = [d for (_, d, w, _, _) in pvp_out if w == 'laser']
        in_ranges = [d for (_, d, _, _, _) in pvp_in]
        kname = names.get(r.get('killed_by'), r.get('killed_by')) if r.get('killed_by') is not None else None
        print(f"== {tname} match {mi} seed {m['seed']} img ..{img} place {r['place']} life {life:.0f}s kills {r['kills']} cubes_max {r['cubes_max']} cubes@60 {cubes60} loadout {r['loadout']} upg {r['upgrades']}")
        print(f"   killed_by {kname} with {r.get('killed_with')} at {kd} m; attackers last 5 s {n_att5}; hp 10 s before {hp10}; dealt {r['damage_dealt']:.0f} taken {r['damage_taken']:.0f} by_w {r.get('damage_by_weapon')}")
        print(f"   move: boost {100*n_boost/max(1,n_alive):.0f}% air {100*n_air/max(1,n_alive):.0f}% still {100*n_still/max(1,len(speeds)):.0f}% charging {100*n_charge/max(1,n_alive):.0f}% med speed {med(speeds)} jumps/min {60*jumps/max(1,life):.1f} med yaw rate {med(yaw_rates)} rad/s; nearest mech med {med(near)} m p10 {round(sorted(near)[len(near)//10]) if near else None}")
        print(f"   slots {slots_tl[:8]}")
        print(f"   first pvp hit dealt {first_out and (round(first_out[0],1), round(first_out[1]), first_out[2], first_out[3], round(first_out[4],2))}; first taken {first_in and (round(first_in[0],1), round(first_in[1]), first_in[2], first_in[3])}; opener {opener}; move away from first attacker in 3 s: {react} m")
        print(f"   pvp hits out {len(pvp_out)} med range {med(out_ranges)} (gun {med(gun_out)}, laser {med(las_out)}); in {len(pvp_in)} med range {med(in_ranges)}; gun rounds {gun_fires}; laser shots {las_shots} hit mech {las_hits_mech} charges {charges}; zaps {zap}; crates {crate_k} drones {npc_k}")
        A['place'].append(r['place']); A['life'].append(life); A['boost'].append(100*n_boost/max(1,n_alive)); A['air'].append(100*n_air/max(1,n_alive)); A['still'].append(100*n_still/max(1,len(speeds)))
        A['near'].append(st.median(near) if near else 0); A['cubes60'].append(cubes60 if cubes60 is not None else -1)
        A['gun_out'] += gun_out; A['las_out'] += las_out; A['in'] += in_ranges; A['opener'].append(opener); A['att5'].append(n_att5); A['kd'].append(kd)
        A['las_shots'].append(las_shots); A['las_hit'].append(las_hits_mech); A['crates'].append(crate_k); A['drones'].append(npc_k); A['jumps'].append(60*jumps/max(1,life))
        if react is not None: A['react'].append(react)
        A['killw'].append(r.get('killed_with')); A['hp10'].append(hp10)
for t in targets:
    A = agg[t]
    if not A['place']: continue
    print(f"#### {t}: n={len(A['place'])} places {A['place']} mean points {mean([16-p for p in A['place']])} life med {med(A['life'])} boost% {mean(A['boost'])} air% {mean(A['air'])} still% {mean(A['still'])} nearest med {med(A['near'])} cubes@60 {A['cubes60']}")
    print(f"     gun hit range med {med(A['gun_out'])} n={len(A['gun_out'])}; laser hit range med {med(A['las_out'])} n={len(A['las_out'])}; incoming med {med(A['in'])}; openers {collections.Counter(A['opener'])}; attackers last 5 s {A['att5']}; killer dist {A['kd']}; killed with {collections.Counter(A['killw'])}; hp10 {A['hp10']}")
    print(f"     laser shots {sum(A['las_shots'])} hitting a mech {sum(A['las_hit'])}; crates {A['crates']} drones {A['drones']}; jumps/min {mean(A['jumps'])}; move-away after first hit {A['react']}")
