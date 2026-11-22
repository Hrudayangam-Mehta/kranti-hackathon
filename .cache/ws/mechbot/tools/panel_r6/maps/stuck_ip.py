#!/usr/bin/env python3
"""In-process simulator traces (frames carry the brain's mode / leg): per tag, score, time alive, zone deaths,
out-of-zone seconds, stuck episodes (|move| > 0.5, speed < 1.5 m/s, grounded, >= 2 s, not a hop), the legs they
happened in, pocket hops, slowest decision. usage: python3 stuck_ip.py <trace dir> <out dir> tag:jsonname ..."""
import collections
import glob
import gzip
import json
import math
import os
import sys


def main():
    td, od = sys.argv[1], sys.argv[2]
    pairs = [a.split(':') for a in sys.argv[3:]]
    print('tag          n  score   se  alive  zoneD  outZ_s  stuckEp  stuck_s  maxStuck  hops  maxMs  lates>50  stuck legs')
    for tag, jn in pairs:
        recs = {m['seed']: m for m in json.load(open(os.path.join(od, jn)))['matches']}
        files = sorted(glob.glob(os.path.join(td, '%s_m*.json.gz' % tag)))
        S = collections.Counter(); legs = collections.Counter(); scores = []; maxms = 0; worst = None
        for f in files:
            d = json.load(gzip.open(f, 'rt'))
            fr = d['frames']; rec = recs.get(d['seed'], d['rec'])
            scores.append(rec['score']); S['alive'] += rec['timeAlive']; S['lates'] += rec.get('lates', 0)
            maxms = max(maxms, rec.get('maxMs', 0))
            if rec.get('cause') == 'zone': S['zd'] += 1
            S['oz'] += 0.1 * sum(1 for x in fr if not x.get('iz', 1))
            prev = None; t0 = None; lg0 = None
            for x in fr:
                if x.get('lg') == 'hop' and prev != 'hop': S['hops'] += 1
                prev = x.get('lg')
                c = math.hypot(*x['mv']) > 0.5 and x.get('v', 0) < 1.5 and x.get('g', 1) and x.get('lg') != 'hop'
                if c and t0 is None: t0 = x['t']; lg0 = '%s/%s' % (x.get('md'), x.get('lg'))
                if not c and t0 is not None:
                    dur = x['t'] - t0
                    if dur >= 2.0:
                        S['se'] += 1; S['ss'] += dur; legs[lg0] += 1
                        if dur > S['ms']: S['ms'] = dur; worst = (d['seed'], round(t0, 1), x['x'], x['y'], lg0)
                    t0 = None
        n = len(scores)
        if not n: continue
        mu = sum(scores) / n
        se = (sum((s - mu) ** 2 for s in scores) / max(1, n - 1)) ** 0.5 / n ** 0.5
        print('%-11s %2d %6.2f %4.2f %6.1f %6d %7.1f %8d %8.1f %9.1f %5d %6.1f %9d  %s %s' % (tag, n, mu, se, S['alive'] / n, S['zd'], S['oz'] / n, S['se'], S['ss'], S['ms'], S['hops'], maxms, S['lates'], dict(legs.most_common(4)), worst or ''))


if __name__ == '__main__':
    main()
