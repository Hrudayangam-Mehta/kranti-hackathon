#!/usr/bin/env python3
"""Extra behaviour numbers from our simulator traces (sim/run.js --trace output only).

usage: python3 -I kanya_extra.py <trace_dir> <tag> [<tag> ...]
"""
import gzip, json, os, sys


def load(d, tag):
    out = []
    for f in sorted(os.listdir(d)):
        if f.startswith(tag + '_m') and f.endswith('.json.gz'):
            out.append(json.load(gzip.open(os.path.join(d, f))))
    return sorted(out, key=lambda t: t['seed'])


def q(xs, p):
    if not xs:
        return None
    xs = sorted(xs)
    k = (len(xs) - 1) * p
    i = int(k)
    j = min(i + 1, len(xs) - 1)
    return round(xs[i] + (xs[j] - xs[i]) * (k - i), 2)


def one(tr):
    s, F, W = tr['slot'], tr['frames'], tr['world']
    dout = [x for x in tr['dmg'] if x[1] == s and x[2] != s and x[2] is not None and 0 <= x[2] < 100]
    din = [x for x in tr['dmg'] if x[2] == s and x[1] is not None and 0 <= x[1] < 100 and x[1] != s]
    res = {}
    # nearest living mech distance and distance to current victim (last mech we damaged within 1.5 s)
    near, vict, crowd60, crowd150 = [], [], [], []
    di = 0
    last = None
    for w in W:
        t = w[0]
        while di < len(dout) and dout[di][0] <= t:
            last = dout[di]
            di += 1
        me = next((m for m in w[1] if m[0] == s), None)
        if not me:
            continue
        others = [m for m in w[1] if m[0] != s]
        ds = [((m[1] - me[1]) ** 2 + (m[2] - me[2]) ** 2) ** 0.5 for m in others]
        if ds:
            near.append(min(ds))
            crowd60.append(sum(1 for d in ds if d < 60))
            crowd150.append(sum(1 for d in ds if d < 150))
        if last and t - last[0] <= 1.5:
            v = next((m for m in others if m[0] == last[2]), None)
            if v:
                vict.append(((v[1] - me[1]) ** 2 + (v[2] - me[2]) ** 2) ** 0.5)
    res['nearestMed'] = q(near, .5)
    res['victimRange'] = (q(vict, .1), q(vict, .25), q(vict, .5), q(vict, .75), q(vict, .9))
    res['fightShare'] = round(len(vict) / max(1, len(W)), 3)
    res['crowd150'] = q(crowd150, .5)
    n = len(F)
    res['chargeShare'] = round(sum(1 for f in F if f.get('ch')) / max(1, n), 3)
    res['outZoneS'] = round(sum(0.1 for f in F if not f.get('iz')), 1)
    # speed in fight decisions (victim within 1.5 s)
    dt = sorted(x[0] for x in dout)
    import bisect
    sp_fight, sp_quiet = [], []
    for f in F:
        i = bisect.bisect_right(dt, f['t'])
        if i and f['t'] - dt[i - 1] <= 1.0:
            sp_fight.append(f['v'])
        else:
            sp_quiet.append(f['v'])
    res['speedFight'] = (q(sp_fight, .25), q(sp_fight, .5), q(sp_fight, .75))
    res['speedQuiet'] = (q(sp_quiet, .25), q(sp_quiet, .5), q(sp_quiet, .75))
    # laser acquired time
    tl = None
    for f in F:
        if 'l' in f['ld'].replace('li', ''):
            tl = f['t']
            break
    res['laserAt'] = tl
    # kill rate after the first kill
    kills = sorted(d['t'] for d in tr['deaths'] if d.get('by') == s and d['id'] != s)
    res['kills'] = len(kills)
    res['killGapMed'] = q([b - a for a, b in zip(kills, kills[1:])], .5)
    # damage taken from mechs per minute and the attackers count
    T = tr['rec']['timeAlive']
    res['takenPerMin'] = round(sum(x[3] for x in din) / max(1, T) * 60)
    res['dealtPerMin'] = round(sum(x[3] for x in dout) / max(1, T) * 60)
    res['attackers'] = len(set(x[1] for x in din))
    res['hpMin'] = round(min(f['hp'] / max(1, f['mhp']) for f in F), 2)
    # hp fraction trajectory: share of alive time under 50% hp
    res['under50'] = round(sum(1 for f in F if f['hp'] < 0.5 * f['mhp']) / max(1, n), 3)
    res['death'] = '%s r=%s hunters=%s' % (tr['rec'].get('cause'), tr['rec'].get('killRange'), tr['rec'].get('hunters'))
    return res


def main():
    d = sys.argv[1]
    for tag in sys.argv[2:]:
        TR = load(d, tag)
        print('==== %s n=%d' % (tag, len(TR)))
        allv = []
        for tr in TR:
            r = one(tr)
            print('seed %s: %s' % (tr['seed'], json.dumps(r)))


if __name__ == '__main__':
    main()
