#!/usr/bin/env python3
"""Print, for given team=repo pairs, the commits around each submission time (no window).
usage: gaps.py <subtimes.json> <commits.tsv[,more]> 'Team=owner/repo' ..."""
import json, sys, datetime, bisect, collections
sub = json.load(open(sys.argv[1]))
commits = collections.defaultdict(list)
for fn in sys.argv[2].split(','):
    for line in open(fn, encoding='utf-8'):
        p = line.rstrip('\n').split('\t')
        commits[p[0]].append((int(p[2]), int(p[3]), p[4], p[7], p[6]))
for r in commits: commits[r].sort()
ep = lambda s: datetime.datetime.fromisoformat(s).timestamp()
hm = lambda t: datetime.datetime.utcfromtimestamp(t).strftime('%H:%M:%S')
for arg in sys.argv[3:]:
    team, repo = arg.split('=', 1)
    for k in sub['tracks']:
        for x in sub['tracks'][k].get(team, []):
            T = ep(x['at']); cs = commits.get(repo, []); ts = [c[0] for c in cs]
            i = bisect.bisect_right(ts, T) - 1
            before = cs[i] if i >= 0 else None
            after = cs[i + 1] if i + 1 < len(cs) else None
            print('%-20s %-8s %s score %-6s | prev commit %s gap %6.0fs "%s" | next +%s' % (
                team[:20], k, x['at'][11:19], x['score'],
                hm(before[0]) if before else '-', (T - before[0]) if before else float('nan'),
                (before[3][:60] if before else ''), ('%.0fs' % (after[0] - T)) if after else '-'))
