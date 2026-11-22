"""Reconstruct every projectile (gun, mortar, npc): id -> fire event, kinematics, impact.
Importable: build(R) -> dict with 'gun', 'mortar', 'npc' lists.
"""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *


def build(R):
    tracks = {}
    for fr in R.frames:
        for p in fr['p']:
            tracks.setdefault(p[0], {'kind': p[1], 'pts': []})['pts'].append((fr['t'], p[2], p[3], p[4]))
    imp = {e['p']: e for e in R.events if e['e'] == 'impact'}
    boom = {e['p']: e for e in R.events if e['e'] == 'boom'}
    hits_by_tick = collections.defaultdict(list)
    for e in R.events:
        if e['e'] == 'hit':
            hits_by_tick[e['t']].append(e)
    gq = collections.deque(e for e in R.events if e['e'] == 'fire' and e['w'] == 'gun')
    mq = collections.deque(e for e in R.events if e['e'] == 'fire' and e['w'] == 'mortar')
    maxid = max(set(tracks) | set(imp) | set(boom))
    out = {'gun': [], 'mortar': [], 'npc': []}
    for pid in range(1, maxid + 1):
        tr = tracks.get(pid)
        im = imp.get(pid)
        bm = boom.get(pid)
        if tr:
            k = tr['kind']
        else:
            k = None
            if im and im.get('hit') is not None:
                hs = [h for h in hits_by_tick[im['t']] if h['dst'] == im['hit']]
                ws = set(h['w'] for h in hs)
                if ws == {'npc'}:
                    k = 2
                elif ws == {'gun'}:
                    k = 0
                elif ws == {'mortar'}:
                    k = 1
                elif 'npc' in ws and 'gun' in ws:
                    k = 0 if (gq and gq[0]['t'] <= im['t'] and any(h['src'] == gq[0]['id'] for h in hs if h['w'] == 'gun')) else 2
            if k is None:
                k = 0 if (gq and im and gq[0]['t'] <= im['t'] <= gq[0]['t'] + 4) else 2
        rec = {'pid': pid, 'pts': tr['pts'] if tr else [], 'impact': im, 'boom': bm}
        if k == 0:
            rec['fire'] = gq.popleft()
            out['gun'].append(rec)
        elif k == 1:
            rec['fire'] = mq.popleft()
            out['mortar'].append(rec)
        else:
            out['npc'].append(rec)
    assert not gq and not mq
    return out


if __name__ == '__main__':
    R = Replay()
    S = build(R)
    print({k: len(v) for k, v in S.items()})
    # vertical muzzle offset diagnostics
    rows = []
    for rec in S['gun']:
        if len(rec['pts']) < 3:
            continue
        f = rec['fire']
        a, b = rec['pts'][0], rec['pts'][-1]
        dt = (b[0] - a[0]) * TICK
        v = [(b[i] - a[i]) / dt for i in (1, 2, 3)]
        s = math.sqrt(sum(c * c for c in v))
        d = [c / s for c in v]
        n = a[0] - f['t']
        # position of the bullet at the end of the fire tick minus 10 m along = notional muzzle axis point
        o = [a[i + 1] - v[i] * n * TICK - d[i] * 10.0 for i in range(3)]
        sp = R.pos(f['id'], f['t'])
        r0 = R.row(f['id'], f['t'] - 1)
        r1 = R.row(f['id'], f['t'] + 1)
        rows.append((r0[MCU], bool(r0[MFL] & 1), bool(r1[MFL] & 1) if r1 else None, o[2] - sp[2], math.hypot(o[0] - sp[0], o[1] - sp[1]), math.asin(d[2])))
    for cu in sorted(set(r[0] for r in rows)):
        g = [r[3] for r in rows if r[0] == cu and r[1] and r[2]]
        if g:
            print('cubes', cu, 'n', len(g), 'muzzle dz above feet: median %.3f  p10 %.3f p90 %.3f  -> /7 = %.3f (expect %.3f)' % (median(g), pct(g, .1), pct(g, .9), median(g) / 7, 1 + 0.05 * cu))
    g = [r[3] for r in rows if not (r[1] and r[2])]
    print('airborne-ish n', len(g), 'median dz', median(g) if g else None)
    g = [r[4] for r in rows if r[1] and r[2]]
    print('horizontal residual of muzzle axis from mech centre: median %.3f p95 %.3f' % (median(g), pct(g, .95)))
