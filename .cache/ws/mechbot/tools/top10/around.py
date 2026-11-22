#!/usr/bin/env python3
"""List every candidate commit in a window before (and shortly after) a team's submission times.
usage: around.py <subtimes.json> <commits_mech.tsv> <declared.tsv> <team> [before_s=900] [after_s=90]"""
import json, sys, datetime, collections
sub = json.load(open(sys.argv[1])); team = sys.argv[4]
before = int(sys.argv[5]) if len(sys.argv) > 5 else 900
after = int(sys.argv[6]) if len(sys.argv) > 6 else 90
decl = {l.split('\t')[0]: l.split('\t')[1] for l in open(sys.argv[3]) if l.strip()}
ep = lambda s: datetime.datetime.fromisoformat(s).timestamp()
hm = lambda t: datetime.datetime.utcfromtimestamp(t).strftime('%H:%M:%S')
commits = collections.defaultdict(list)
for line in open(sys.argv[2], encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    commits[p[0]].append((int(p[2]), p[4], p[7], p[6]))
for x in sub['tracks']['mech'].get(team, []):
    T = ep(x['at'])
    print('\n== %s  mech %s  score %s' % (team, x['at'][11:19], x['score']))
    rows = []
    for r, cs in commits.items():
        cs.sort()
        prior = [c for c in cs if c[0] <= T + 5]
        near = [c for c in cs if T - before <= c[0] <= T + after]
        if not near: continue
        last = max((c for c in near if c[0] <= T + 5), default=None, key=lambda c: c[0])
        c = last or min(near, key=lambda c: c[0])
        rows.append((T - c[0], r, len(prior), len(cs), c, decl.get(r, '')))
    for gap, r, nb, n, c, d in sorted(rows, key=lambda z: (z[0] < -5, abs(z[0]))):
        print('  %+6.0fs %-44s %3d/%-3d prior  %s%s' % (gap, r, nb, n, c[2][:78], ('   [declares: %s]' % d) if d else ''))
