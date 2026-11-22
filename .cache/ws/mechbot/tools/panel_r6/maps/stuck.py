#!/usr/bin/env python3
"""Per-map summary of the simulator traces: score, time alive, zone deaths, out-of-zone time, stuck episodes
(legs commanded |move| > 0.5 while ground speed < 1.5 m/s for >= 2 s), long stand-stills, late answers.
usage: python3 stuck.py <trace dir> <out dir> [names...]"""
import gzip
import json
import math
import os
import sys


def episodes(fr, cond, min_s):
    out, t0 = [], None
    for f in fr:
        if cond(f):
            if t0 is None: t0 = f['t']
        else:
            if t0 is not None and f['t'] - t0 >= min_s: out.append((t0, f['t'] - t0, f))
            t0 = None
    if t0 is not None and fr and fr[-1]['t'] - t0 >= min_s: out.append((t0, fr[-1]['t'] - t0, fr[-1]))
    return out


def main():
    td, od = sys.argv[1], sys.argv[2]
    names = sys.argv[3:] or ['base', 'lift40', 'tr300', 'mirx', 'miry', 'rot90', 'zs070', 'zs130', 'zt070', 'wide', 'v3dir']
    print('map/mode      n  score  alive  zoneDeath  outZone_s  stuckEp  stuck_s  maxStuck  lates  worst stuck (seed t x y)')
    for n in names:
        for mode, tag in (('squad', 'sq'), ('ffa', 'ffa')):
            jf = os.path.join(od, 'sim_%s_%s.json' % (n, mode))
            recs = []
            if os.path.exists(jf):
                j = json.load(open(jf))
                recs = j.get('records') or j.get('recs') or j.get('matches') or []
            S = dict(n=0, score=0, alive=0, zd=0, oz=0, se=0, ss=0, ms=0, lates=0)
            worst = None
            for s in range(1, 7):
                f = os.path.join(td, '%s_%s_m%d.json.gz' % (n, tag, s))
                if not os.path.exists(f): continue
                d = json.load(gzip.open(f, 'rt'))
                fr, rec = d['frames'], d['rec']
                S['n'] += 1; S['score'] += rec['score']; S['alive'] += rec['timeAlive']; S['lates'] += rec.get('lates', 0)
                if rec.get('cause') == 'zone': S['zd'] += 1
                S['oz'] += 0.1 * sum(1 for x in fr if not x.get('iz', 1))
                st = episodes(fr, lambda x: math.hypot(*x['mv']) > 0.5 and x.get('v', 0) < 1.5 and x.get('g', 1), 2.0)
                for (t0, dur, f2) in st:
                    S['se'] += 1; S['ss'] += dur
                    if dur > S['ms']: S['ms'] = dur; worst = (s, round(t0, 1), f2['x'], f2['y'])
            if S['n'] == 0: continue
            k = S['n']
            print('%-12s %2d %6.2f %6.1f %9d %10.1f %8d %8.1f %9.1f %6d  %s' % (n + '/' + mode, k, S['score'] / k, S['alive'] / k, S['zd'], S['oz'] / k, S['se'], S['ss'], S['ms'], S['lates'], worst))


if __name__ == '__main__':
    main()
