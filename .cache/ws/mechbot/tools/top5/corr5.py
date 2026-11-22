#!/usr/bin/env python3
"""Correlate a team's best-submission times with commit times (local metadata only).
usage: corr5.py <times.json> <commits.tsv> [--win SEC] team ...
hit = commit with 0 <= T - ct <= WIN (default 360); p = binomial tail with per-repo coverage over the day
(fraction of 23:30-16:40 UTC covered by [ct, ct+WIN] intervals)."""
import json, sys, datetime, collections, math
args = sys.argv[1:]
WIN = 360
if '--win' in args:
    i = args.index('--win'); WIN = int(args[i + 1]); del args[i:i + 2]
times = json.load(open(args[0])); tsv = args[1]; teams = args[2:]
ep = lambda s: datetime.datetime.fromisoformat(s).timestamp()
A, B = ep('2026-11-20T23:30:00+00:00'), ep('2026-11-21T16:40:00+00:00')
rows = collections.defaultdict(list)
for line in open(tsv, encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) >= 8: rows[p[0]].append((int(p[2]), p[1], p[4], p[6], p[7]))
def cover(r):
    iv = sorted((max(A, c[0]), min(B, c[0] + WIN)) for c in rows[r] if c[0] + WIN > A and c[0] < B)
    tot = 0; s0 = e0 = None
    for s, e in iv:
        if e0 is None or s > e0:
            if e0 is not None: tot += e0 - s0
            s0, e0 = s, e
        else: e0 = max(e0, e)
    if e0 is not None: tot += e0 - s0
    return tot / (B - A)
cov = {r: cover(r) for r in rows}
for team in teams:
    lst = times.get(team, [])
    print('\n## %s %s' % (team, [(a[11:19], s) for a, s in lst]))
    res = []
    for r in rows:
        hs = []
        for a, s in lst:
            T = ep(a)
            near = [(T - c[0], c) for c in rows[r] if 0 <= T - c[0] <= WIN]
            if near:
                g, c = min(near, key=lambda x: x[0]); hs.append((a[11:19], s, int(g), c, len(near)))
        if not hs: continue
        k, n, p = len(hs), len(lst), max(cov[r], 1e-3)
        pv = sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))
        res.append((pv, r, k, p, hs))
    res.sort(key=lambda x: x[0])
    for pv, r, k, p, hs in res[:12]:
        print('  %-48s hits %d cov %.3f p %.4f' % (r, k, p, pv))
        for at, s, g, c, m in hs:
            print('      %s %.2f gap %4ds n=%d %s %s [%s] %s' % (at, s, g, m, c[1][:8], datetime.datetime.utcfromtimestamp(c[0]).strftime('%H:%M:%S'), c[2][:14], c[4][:80]))
