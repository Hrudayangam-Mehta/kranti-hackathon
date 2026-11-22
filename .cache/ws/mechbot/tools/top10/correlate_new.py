#!/usr/bin/env python3
"""Correlate submission times (team -> [[iso, score], ...]) with commit times from a commits TSV.
Local data only. usage: correlate_new.py <times.json> <commits.tsv> <team> [<team> ...] [--all]
hit: a commit with -SKEW <= T - ct <= WIN (ct = committer time; author time also reported).
p_cov: share of the 05:00-07:20 UTC window covered by [ct - SKEW, ct + WIN] intervals of that repo
(chance that a random time in the window would 'hit' the repo)."""
import json, sys, bisect, datetime, collections, math

SKEW, WIN = 60, 360
times = json.load(open(sys.argv[1]))
rows = collections.defaultdict(list)
for line in open(sys.argv[2], encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) < 8:
        continue
    rows[p[0]].append((int(p[2]), int(p[3]), p[1], p[4], p[6], p[7]))
for r in rows:
    rows[r].sort()
ep = lambda s: datetime.datetime.fromisoformat(s).timestamp()
W0 = ep('2026-11-20T23:30:00+00:00')
W1 = ep('2026-11-21T07:20:00+00:00')


def cover(repo, a=W0, b=W1):
    iv = sorted((max(a, c[0] - SKEW), min(b, c[0] + WIN)) for c in rows[repo] if c[0] + WIN > a and c[0] - SKEW < b)
    tot, s0, e0 = 0.0, None, None
    for s, e in iv:
        if e0 is None or s > e0:
            if e0 is not None:
                tot += e0 - s0
            s0, e0 = s, e
        else:
            e0 = max(e0, e)
    if e0 is not None:
        tot += e0 - s0
    return tot / (b - a)


def hits(repo, T):
    out = []
    for c in rows[repo]:
        g = T - c[0]
        if -SKEW <= g <= WIN:
            out.append((g, c))
    return out


teams = [a for a in sys.argv[3:] if not a.startswith('--')]
if '--all' in sys.argv:
    teams = list(times)
cov = {r: cover(r) for r in rows}
nwin = {r: sum(1 for c in rows[r] if W0 - 600 <= c[0] <= W1) for r in rows}
for team in teams:
    lst = times.get(team, [])
    print('\n## %s  %s' % (team, [(a[11:19], s) for a, s in lst]))
    per = collections.defaultdict(list)
    for a, s in lst:
        T = ep(a)
        for r in rows:
            for g, c in hits(r, T):
                per[r].append((a[11:19], s, round(g), c))
    ranked = []
    for r, hs in per.items():
        subs = sorted(set(h[0] for h in hs))
        k = len(subs)
        n = len(lst)
        p = max(cov[r], 1e-3)
        pv = sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))
        ranked.append((pv, r, k, hs))
    ranked.sort(key=lambda x: x[0])
    for pv, r, k, hs in ranked[:15]:
        print('  %-50s subs_hit %d  p_cov %.3f  n_win %3d  pval %.4f' % (r, k, cov[r], nwin[r], pv))
        bysub = collections.defaultdict(list)
        for h in hs:
            bysub[h[0]].append(h)
        for at in sorted(bysub):
            hh = sorted(bysub[at], key=lambda h: (h[2] < 0, abs(h[2])))
            at_, s, g, c = hh[0]
            ct = datetime.datetime.utcfromtimestamp(c[0]).strftime('%H:%M:%S')
            print('      %s %.2f  gap %4ds (+%d more)  %s %s [%s|%s] %s' % (at, s, g, len(hh) - 1, c[2], ct, c[3][:16], c[4][:20], c[5][:90]))
