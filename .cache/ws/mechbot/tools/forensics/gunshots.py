"""Section 1 data layer: per gun-shot record with inferred target, lead geometry and miss distance.
build(R, W) -> list of dicts (also dumped to out/gunshots.json when run as a script)."""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import shots as shots_mod

BSPEED_TICK = 7.0     # m per tick (140 m/s measured)
MUZZLE = 7.0          # replay build: no cube scaling (measured)
OFF = 3.0


def unit(v):
    n = math.sqrt(sum(c * c for c in v))
    return [c / n for c in v] if n > 0 else [1.0, 0.0, 0.0]


def ang(u, v):
    nu = math.sqrt(sum(a * a for a in u)); nv = math.sqrt(sum(b * b for b in v))
    if nu == 0 or nv == 0:
        return 180.0
    d = sum(a * b for a, b in zip(u, v)) / (nu * nv)
    return math.degrees(math.acos(max(-1.0, min(1.0, d))))


def centre_h(eid):
    return 4.5 if eid < 100 else 1.75 if eid < 1000 else 1.2


def build(R, W=None):
    S = shots_mod.build(R)
    crate_pos = {c['id']: c['pos'] for c in R.hdr['crates']}
    crate_dead = {e['id']: e['t'] for e in R.events if e['e'] == 'crate'}

    def epos(eid, tick):
        if eid >= 1000:
            if eid in crate_dead and crate_dead[eid] < tick:
                return None
            return tuple(crate_pos[eid])
        return R.pos(eid, tick)

    ents = list(R.ids) + sorted(R.n) + sorted(crate_pos)
    out = []
    for rec in S['gun']:
        f = rec['fire']
        s = f['id']
        tf = f['t']
        E = tf - 1
        ps = R.pos(s, tf)
        pe = R.pos(s, E)
        if ps is None or pe is None:
            continue
        ax = (ps[0], ps[1], ps[2] + MUZZLE)
        pts = rec['pts']
        im = rec['impact']
        if len(pts) >= 2:
            a, b = pts[0], pts[-1]
            d = unit([b[i] - a[i] for i in (1, 2, 3)])
            q = 'track'
        elif len(pts) == 1:
            d = unit([pts[0][i + 1] - ax[i] for i in range(3)])
            q = 'one'
        elif im:
            d = unit([im['at'][i] - ax[i] for i in range(3)])
            q = 'impact'
        else:
            continue
        yaw = math.atan2(d[1], d[0])
        pitch = math.asin(d[2])

        def bullet(T):   # T in ticks (float); position at end of tick T
            L = OFF + BSPEED_TICK * (T - E)
            return (ax[0] + d[0] * L, ax[1] + d[1] * L, ax[2] + d[2] * L)

        cands = []
        for c in ents:
            if c == s:
                continue
            pc = epos(c, E)
            if pc is None:
                continue
            ch = centre_h(c)
            cen = (pc[0], pc[1], pc[2] + ch)
            r = math.dist(ax, cen)
            if r > 260:
                continue
            a_dir = ang(d, [cen[i] - ax[i] for i in range(3)])
            # true intercept (actual future path)
            T = E + max(0.0, (r - OFF)) / BSPEED_TICK
            cen_t = cen
            for _ in range(4):
                p2 = epos(c, min(T, R.end_tick)) or pc
                cen_t = (p2[0], p2[1], p2[2] + ch)
                T = E + max(0.0, math.dist(ax, cen_t) - OFF) / BSPEED_TICK
            a_true = ang(d, [cen_t[i] - ax[i] for i in range(3)])
            cands.append((min(a_dir, a_true), c, r, a_dir, a_true, T, cen, cen_t))
        cands.sort()
        tgt = None
        hit_ent = im['hit'] if im else None
        if hit_ent is not None:
            for cd in cands:
                if cd[1] == hit_ent:
                    tgt = cd
                    break
        if tgt is None and cands:
            c0 = cands[0]
            if c0[0] <= 8.0 or c0[2] * math.sin(math.radians(min(c0[0], 89))) <= 6.0:
                tgt = c0
        o = {'pid': rec['pid'], 's': s, 'type': R.names[s], 'tf': tf, 'q': q, 'yaw': yaw, 'pitch': pitch,
             'npts': len(pts), 'hit_ent': hit_ent, 'imp_t': im['t'] if im else None, 'imp_at': im['at'] if im else None,
             'ax': ax, 'd': d, 'tgt': None}
        if tgt:
            _, c, r, a_dir, a_true, T, cen, cen_t = tgt
            o.update({'tgt': c, 'range': r, 'a_dir': a_dir, 'a_true': a_true, 'T_arr': T})
        out.append(o)
    # burst smoothing of unassigned shots
    by_s = collections.defaultdict(list)
    for o in out:
        by_s[o['s']].append(o)
    for s, lst in by_s.items():
        lst.sort(key=lambda o: o['tf'])
        b = 0
        for i, o in enumerate(lst):
            if i > 0 and o['tf'] - lst[i - 1]['tf'] > 12:
                b += 1
            o['burst'] = b
    # detailed geometry for mech targets
    for o in out:
        c = o['tgt']
        if c is None or c >= 100:
            continue
        s = o['s']; tf = o['tf']; E = tf - 1
        d = o['d']; ax = o['ax']
        SE = R.pos(s, E); CE = R.pos(c, E)
        VE = R.vel(c, E, back=True) or (0, 0, 0)
        VF = R.vel(c, E, back=False) or VE
        VS = R.vel(s, E, back=True) or (0, 0, 0)
        mz = (SE[0], SE[1], SE[2] + MUZZLE)
        cen = (CE[0], CE[1], CE[2] + 4.5)
        rel = [cen[i] - mz[i] for i in range(3)]
        rng = math.sqrt(sum(x * x for x in rel))
        rh = math.hypot(rel[0], rel[1])
        dyaw = math.atan2(rel[1], rel[0])
        dpitch_c = math.atan2(rel[2], rh)
        # first order intercept with observed velocity (bullet 140 m/s, ignoring the 3 m offset)
        def intercept(V, sp=140.0):
            a = V[0] ** 2 + V[1] ** 2 + V[2] ** 2 - sp * sp
            b = 2 * (rel[0] * V[0] + rel[1] * V[1] + rel[2] * V[2])
            cc = rng * rng
            disc = b * b - 4 * a * cc
            if disc < 0:
                return None
            tau = (-b - math.sqrt(disc)) / (2 * a)
            return tau
        tau = intercept(VE)
        lp = [rel[i] + VE[i] * tau for i in range(3)]
        lyaw = math.atan2(lp[1], lp[0]); lpitch = math.atan2(lp[2], math.hypot(lp[0], lp[1]))
        # true intercept direction from the actual firing axis point
        Tarr = o['T_arr']
        CT = R.pos(c, min(Tarr, R.end_tick)) or CE
        tp = [CT[0] - ax[0], CT[1] - ax[1], CT[2] + 4.5 - ax[2]]
        tyaw = math.atan2(tp[1], tp[0]); tpitch = math.atan2(tp[2], math.hypot(tp[0], tp[1]))
        # lateral speed of target relative to line of sight (horizontal)
        lx, ly = rel[0] / rh, rel[1] / rh
        vlat = -VE[0] * ly + VE[1] * lx        # +: target moving counter-clockwise as seen from shooter
        vrad = VE[0] * lx + VE[1] * ly
        # closest approach of the (unobstructed) bullet ray to the target's actual body axis
        best = (1e9, None)
        Tmax = E + (230.0 - OFF) / BSPEED_TICK
        T = E
        while T <= min(Tmax, R.end_tick):
            L = OFF + BSPEED_TICK * (T - E)
            bx, by, bz = ax[0] + d[0] * L, ax[1] + d[1] * L, ax[2] + d[2] * L
            pc = R.pos(c, T)
            if pc is None:
                break
            dh = math.hypot(bx - pc[0], by - pc[1])
            dz = max(0.0, pc[2] - bz, bz - (pc[2] + 9.0))
            dd = math.hypot(dh, dz)
            if dd < best[0]:
                best = (dd, T, dh, bz - pc[2])
            T += 0.02
        blocked = False
        if o['imp_at'] is not None and o['hit_ent'] is None:
            dimp = math.dist(ax, o['imp_at'])
            if best[1] is not None and dimp < OFF + BSPEED_TICK * (best[1] - E) - 2.0:
                blocked = True
        ra = R.row(s, E); rb = R.row(s, tf + 1)
        rt = R.row(c, E)
        VT = R.vel(c, min(int(Tarr), R.end_tick - 1), back=True) or VE
        o.update({'rng': rng, 'dyaw': dyaw, 'dpitch_c': dpitch_c, 'lyaw': lyaw, 'lpitch': lpitch, 'tyaw': tyaw, 'tpitch': tpitch,
                  'vlat': vlat, 'vrad': vrad, 'tspeed': math.hypot(VE[0], VE[1]), 'tvz': VE[2], 'tau': tau,
                  'miss': best[0], 'miss_h': best[2] if best[1] else None, 'miss_z': best[3] if best[1] else None,
                  'blocked': blocked, 'hit': o['hit_ent'] == c,
                  'dv_flight': math.hypot(VT[0] - VE[0], VT[1] - VE[1]),
                  'sspeed': math.hypot(VS[0], VS[1]), 's_aim0': (ra[MYAW], ra[MPIT]) if ra else None,
                  's_aim1': (rb[MYAW], rb[MPIT]) if rb else None,
                  't_grounded': bool(rt[MFL] & 1), 't_dz': CE[2] - SE[2], 't_hp': rt[MHP], 't_maxhp': rt[MMAX],
                  's_grounded': bool(ra[MFL] & 1) if ra else None,
                  'vfwd': (VF[0], VF[1], VF[2]), 've': (VE[0], VE[1], VE[2])})
    return out


if __name__ == '__main__':
    R = Replay()
    G = build(R)
    dump('gunshots.json', G)
    print('gun shots', len(G))
    kc = collections.Counter(('mech' if o['tgt'] is not None and o['tgt'] < 100 else 'npc' if o['tgt'] is not None and o['tgt'] < 1000 else 'crate' if o['tgt'] is not None else 'none') for o in G)
    print('targets', kc)
    print('direction quality', collections.Counter(o['q'] for o in G))
    mm = [o for o in G if o['tgt'] is not None and o['tgt'] < 100]
    print('mech-target shots', len(mm), 'hits', sum(1 for o in mm if o['hit']), 'blocked', sum(1 for o in mm if o['blocked']))
    # consistency: computed miss vs actual hit
    hm = [o['miss'] for o in mm if o['hit']]; nm = [o['miss'] for o in mm if not o['hit'] and not o['blocked']]
    print('miss distance for actual hits: p50 %.2f p95 %.2f max %.2f ; for non-hits (unblocked): p5 %.2f p50 %.2f' % (pct(hm, .5), pct(hm, .95), max(hm), pct(nm, .05), pct(nm, .5)))
    none = [o for o in G if o['tgt'] is None]
    print('no-target shots by shooter', collections.Counter(o['s'] for o in none))
    # hits on a mech other than inferred target?
    print('hit entity != target', sum(1 for o in G if o['hit_ent'] is not None and o['hit_ent'] != o['tgt']))
