#!/usr/bin/env python3
"""Behaviour metrics of one traced bot from sim/run.js --trace files (our own simulator output).

usage: python3 -I giddy_metrics.py <trace_dir> <tag> [<tag> ...]
Prints one block per tag: per-match lines and a summary. Reads only trace json.gz files.
"""
import gzip, json, os, sys, statistics as st

def load(d, tag):
    out = []
    for f in sorted(os.listdir(d)):
        if f.startswith(tag + '_m') and f.endswith('.json.gz'):
            out.append(json.load(gzip.open(os.path.join(d, f))))
    return sorted(out, key=lambda t: t['seed'])

def frame_at(F, t):
    lo, hi = 0, len(F) - 1
    while lo < hi:
        m = (lo + hi + 1) // 2
        if F[m]['t'] <= t: lo = m
        else: hi = m - 1
    return F[lo]

def q(xs, p):
    if not xs: return None
    xs = sorted(xs); k = (len(xs) - 1) * p; i = int(k); j = min(i + 1, len(xs) - 1)
    return xs[i] + (xs[j] - xs[i]) * (k - i)

def metrics(tr):
    s, F, rec = tr['slot'], tr['frames'], tr['rec']
    T = rec['timeAlive']
    m = {'seed': tr['seed'], 'slot': s, 'score': rec['score'], 'kills': rec['kills'], 'alive': T,
         'cause': 'alive' if rec['alive'] else '%s:%s' % (rec['cause'], (rec.get('killerName') or '').replace('squad:', '')),
         'killRange': rec.get('killRange'), 'huntersAtDeath': rec.get('hunters'), 'upgrades': rec.get('upgrades')}
    shots_mech = [x for x in tr['shots'] if x[1] == s and x[2] is not None and x[2] < 100]
    lasers = [e for e in tr['events'] if e['e'] == 'laser' and e['id'] == s]
    dout = [x for x in tr['dmg'] if x[1] == s and x[2] != s and x[2] < 100]
    din = [x for x in tr['dmg'] if x[2] == s and x[1] is not None and 0 <= x[1] < 100 and x[1] != s]
    cand = [x[0] for x in shots_mech[:1]] + [e['t'] for e in lasers if e.get('mh')][:1] + [x[0] for x in dout[:1]]
    m['firstShotMech'] = min(cand) if cand else None
    m['firstDealtMech'] = dout[0][0] if dout else None
    m['firstTaken'] = din[0][0] if din else None
    kills = [d['t'] for d in tr['deaths'] if d.get('by') == s and d['id'] != s]
    m['killT'] = kills
    for tt in (30, 60, 120, 180):
        f = frame_at(F, tt) if T >= tt else None
        m['cu%d' % tt] = f['cu'] if f else None
        m['up%d' % tt] = f['up'] if f else None
    # loadout timeline
    tl, last = [], None
    for f in F:
        if f['ld'] != last:
            tl.append((f['t'], f['ld'])); last = f['ld']
    m['loadout'] = tl
    # damage-dealing ranges by weapon
    m['rangeBy'] = {}
    for x in dout:
        m['rangeBy'].setdefault(x[4], []).append(x[5])
    # laser shot charge fractions and whether they hit a mech
    m['laserFrac'] = [round(e['frac'], 2) for e in lasers]
    m['laserHit'] = [e.get('mh', 0) for e in lasers]
    # farming: time from 0 to first mech contact, crates/drones damaged, cube pickups
    npc = tr['npc']
    m['crateHits'] = sum(1 for x in npc if x[1] == 'c')
    m['droneHits'] = sum(1 for x in npc if x[1] == 'n')
    m['crateKills'] = sum(1 for x in npc if x[1] == 'c' and x[5])
    m['droneKills'] = sum(1 for x in npc if x[1] == 'n' and x[5])
    # farm time: decisions with an npc/crate hit in the last 1.5 s and no mech damage either way in the last 2 s
    ni = 0; lastN = -99; mi = 0; lastM = -99; allm = sorted([x[0] for x in dout] + [x[0] for x in din]); farm = 0.0
    for f in F:
        t = f['t']
        while ni < len(npc) and npc[ni][0] <= t: lastN = npc[ni][0]; ni += 1
        while mi < len(allm) and allm[mi] <= t: lastM = allm[mi]; mi += 1
        if t - lastN <= 1.5 and t - lastM > 2: farm += 0.1
    m['farmS'] = round(farm, 1)
    m['farmBeforeContact'] = round(sum(0.1 for f in F if (m['firstTaken'] or 1e9) > f['t'] and (m['firstDealtMech'] or 1e9) > f['t'] and any(abs(x[0] - f['t']) < 1.5 for x in npc)), 1)
    # retreat onsets: in contact (mech damage taken in last 3 s), radial speed away from the latest attacker > 2.5 m/s for >= 1 s
    W = tr['world']
    onsets = []
    run, start_hp = 0, None
    di = 0; recent = []
    for w in W:
        t = w[0]
        while di < len(din) and din[di][0] <= t: recent.append(din[di]); di += 1
        recent = [x for x in recent if x[0] >= t - 3]
        me = next((q_ for q_ in w[1] if q_[0] == s), None)
        if not me or not recent:
            run = 0; continue
        att = recent[-1][1]
        a = next((q_ for q_ in w[1] if q_[0] == att), None)
        f = frame_at(F, t)
        if not a: run = 0; continue
        dx, dy = me[1] - a[1], me[2] - a[2]; d = max(1e-6, (dx * dx + dy * dy) ** 0.5)
        radial = (f['vx'] * dx + f['vy'] * dy) / d
        if radial > 2.5:
            if run == 0: start_hp = f['hp'] / max(1, f['mhp'])
            run += 1
            if run == 2: onsets.append(round(start_hp, 2))
        else:
            run = 0
    m['retreatOnsetHp'] = onsets
    # hp fraction at death-fight start and number of attackers in the last 5 s
    if not rec['alive'] and din:
        last5 = [x for x in din if x[0] >= T - 5]
        m['attackersLast5'] = len(set(x[1] for x in last5))
        f0 = frame_at(F, max(0, T - 5))
        m['hpFrac5sBeforeDeath'] = round(f0['hp'] / max(1, f0['mhp']), 2)
    # boost and stand shares
    n = len(F)
    m['boostShare'] = round(sum(1 for f in F if f['b']) / max(1, n), 3)
    m['standShare'] = round(sum(1 for f in F if f['v'] < 1.5 and f['g']) / max(1, n), 3)
    # distance moved from spawn in the first 30 s
    f0 = F[0]; f30 = frame_at(F, 30)
    m['moved30'] = round(((f30['x'] - f0['x']) ** 2 + (f30['y'] - f0['y']) ** 2) ** 0.5, 1)
    return m

def main():
    d = sys.argv[1]
    for tag in sys.argv[2:]:
        TR = load(d, tag)
        M = [metrics(t) for t in TR]
        print('==== %s  n=%d' % (tag, len(M)))
        for m in M:
            rb = {k: (len(v), round(st.median(v), 1)) for k, v in m['rangeBy'].items()}
            print('seed %d slot %d score %d kills %d alive %.1f cause %s killRange %s hunters %s' % (m['seed'], m['slot'], m['score'], m['kills'], m['alive'], m['cause'], m['killRange'], m['huntersAtDeath']))
            print('   firstShotMech %s firstDealt %s firstTaken %s kills@ %s' % (m['firstShotMech'], m['firstDealtMech'], m['firstTaken'], [round(x, 1) for x in m['killT']]))
            print('   cubes 30/60/120/180 %s/%s/%s/%s  upgrades %s/%s/%s/%s  %s' % (m['cu30'], m['cu60'], m['cu120'], m['cu180'], m['up30'], m['up60'], m['up120'], m['up180'], m['upgrades']))
            print('   loadout %s' % ' '.join('%.1f:%s' % (t, l) for t, l in m['loadout']))
            print('   dealt-range by weapon (n, median m) %s' % rb)
            print('   laser shots frac %s mechhit %s' % (m['laserFrac'], m['laserHit']))
            print('   crates hit/killed %d/%d drones hit/killed %d/%d farm s %.1f (before contact %.1f) moved30 %.1f' % (m['crateHits'], m['crateKills'], m['droneHits'], m['droneKills'], m['farmS'], m['farmBeforeContact'], m['moved30']))
            print('   retreat onsets hp %s  hp 5 s before death %s attackers last 5 s %s boost %.3f stand %.3f' % (m['retreatOnsetHp'], m.get('hpFrac5sBeforeDeath'), m.get('attackersLast5'), m['boostShare'], m['standShare']))
        def mean(k):
            xs = [m[k] for m in M if m[k] is not None]
            return round(sum(xs) / len(xs), 2) if xs else None
        allr = {}
        for m in M:
            for k, v in m['rangeBy'].items(): allr.setdefault(k, []).extend(v)
        print('SUMMARY score %s kills %s alive %s firstShotMech med %s firstDealt med %s firstKill med %s' % (
            mean('score'), mean('kills'), mean('alive'), q([m['firstShotMech'] for m in M if m['firstShotMech']], .5),
            q([m['firstDealtMech'] for m in M if m['firstDealtMech']], .5), q([m['killT'][0] for m in M if m['killT']], .5)))
        print('  cubes@60 %s @120 %s @180 %s ; upgrades@60 %s @120 %s @180 %s (alive only)' % (mean('cu60'), mean('cu120'), mean('cu180'), mean('up60'), mean('up120'), mean('up180')))
        print('  dealt ranges by weapon: ' + '; '.join('%s n=%d q25/med/q75 %.0f/%.0f/%.0f' % (k, len(v), q(v, .25), q(v, .5), q(v, .75)) for k, v in allr.items()))
        lf = [x for m in M for x in m['laserFrac']]; lh = [x for m in M for x in m['laserHit']]
        if lf:
            print('  laser shots %d, partial (<0.98) %d, mean frac %.2f, mech-hit %.2f' % (len(lf), sum(1 for x in lf if x < 0.98), sum(lf) / len(lf), sum(lh) / len(lh)))
        ro = [x for m in M for x in m['retreatOnsetHp']]
        print('  retreat onsets %d, hp frac q25/med/q75 %s/%s/%s' % (len(ro), q(ro, .25), q(ro, .5), q(ro, .75)))
        print('  farm s mean %s, before contact %s, crates killed %s, drones killed %s, moved30 %s, boost %s, stand %s' % (
            mean('farmS'), mean('farmBeforeContact'), mean('crateKills'), mean('droneKills'), mean('moved30'), mean('boostShare'), mean('standShare')))

if __name__ == '__main__':
    main()
