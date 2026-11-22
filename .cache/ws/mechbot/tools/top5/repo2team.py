#!/usr/bin/env python3
"""For given repos, list teams whose best times fall 0..WIN s after one of the repo's commits.
usage: repo2team.py <times.json> <commits.tsv> WIN repo ..."""
import json, sys, datetime, collections
times = json.load(open(sys.argv[1])); WIN = int(sys.argv[3])
ep = lambda s: datetime.datetime.fromisoformat(s).timestamp()
rows = collections.defaultdict(list)
for l in open(sys.argv[2], encoding='utf-8'):
    p = l.rstrip('\n').split('\t')
    if len(p) >= 8: rows[p[0]].append((int(p[2]), p[1], p[7]))
for repo in sys.argv[4:]:
    print('##', repo, len(rows[repo]), 'commits')
    res = []
    for team, lst in times.items():
        hs = []
        for a, s in lst:
            T = ep(a); g = [(T - c[0], c) for c in rows[repo] if 0 <= T - c[0] <= WIN]
            if g: gg, c = min(g); hs.append('%s %.2f gap %ds %s' % (a[11:19], s, gg, c[2][:60]))
        if hs: res.append((len(hs) / len(lst), len(hs), len(lst), team, hs))
    for fr, k, n, team, hs in sorted(res, reverse=True)[:6]:
        print('  %-28s %d/%d' % (team, k, n)); [print('      ' + h) for h in hs]
