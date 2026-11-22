"""Panel R6 I/O: house gun shots at us by range (hit rate, damage per match) and jink counts, per trace dir. python3 -I incoming.py DIR..."""
import gzip, json, glob, sys, collections, math
bins = [(0, 45), (45, 75), (75, 110), (110, 160), (160, 300)]
for D in sys.argv[1:]:
    sh = collections.Counter(); hi = collections.Counter(); dm = collections.Counter(); n = 0; alive = 0
    for f in sorted(glob.glob(D + '/*.json.gz')):
        d = json.load(gzip.open(f, 'rt')); s = d['slot']; n += 1; alive += d['rec']['timeAlive']
        for x in d['shots']:
            if x[2] == s:
                for lo, h in bins:
                    if lo <= x[3] < h: sh[lo] += 1; hi[lo] += x[4]
        for x in d['dmg']:
            if x[2] == s and x[4] == 'gun':
                for lo, h in bins:
                    if lo <= x[5] < h: dm[lo] += x[3]
    row = []
    for lo, h in bins:
        p = hi[lo] / max(1, sh[lo]); se = math.sqrt(p * (1 - p) / max(1, sh[lo]))
        row.append(f'{lo}-{h}: {p:.3f}+-{se:.3f} (n {sh[lo]}) dmg/min {60*dm[lo]/max(1,alive):.0f}')
    print(D.split('/')[-1], f'matches {n} alive/match {alive/n:.0f}s |', ' | '.join(row))
