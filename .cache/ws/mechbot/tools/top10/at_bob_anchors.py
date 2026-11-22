#!/usr/bin/env python3
"""Per-repo check against several time anchors of AT and BobBuildIt (local commit metadata only).
For each mech repo: commits inside each anchor window; print repos that hit the exact-time window
and report the other windows. usage: at_bob_anchors.py"""
import datetime, collections
def ep(s): return datetime.datetime.fromisoformat(s + '+00:00').timestamp()
def hm(t): return datetime.datetime.utcfromtimestamp(t).strftime('%H:%M:%S')
commits = collections.defaultdict(list)
for line in open('commits_mech.tsv', encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) < 8: continue
    commits[p[0]].append((int(p[2]), p[1][:8], p[7][:70], p[6]))
D = '2026-11-21T'
ANCH = {
 'AT': dict(exact=ep(D + '03:43:50'), wins=[('first<=00:55', ep('2026-11-20T22:00:00'), ep(D + '00:55:00')),
        ('5.40 in 02:05-02:40', ep(D + '02:05:00'), ep(D + '02:40:00')),
        ('5.48 in 02:30-02:55', ep(D + '02:30:00'), ep(D + '02:55:00'))]),
 'BobBuildIt': dict(exact=ep(D + '03:03:29'), wins=[('5.25 in 01:00-02:40', ep(D + '01:00:00'), ep(D + '02:40:00'))]),
}
for team, a in ANCH.items():
    print('=====', team, 'exact', hm(a['exact']))
    out = []
    for repo, cs in commits.items():
        cs = sorted(cs)
        near = [c for c in cs if 0 <= a['exact'] - c[0] <= 480]
        if not near: continue
        last = near[-1]
        cols = []
        ok = True
        for name, lo, hi in a['wins']:
            n = sum(1 for c in cs if lo <= c[0] <= hi)
            cols.append('%s:%d' % (name, n))
            if n == 0: ok = False
        after = sum(1 for c in cs if c[0] > a['exact'] + 30)
        out.append((not ok, a['exact'] - last[0], repo, last, cols, after, len(cs), hm(cs[0][0]), hm(cs[-1][0])))
    for bad, gap, repo, last, cols, after, n, first, lastt in sorted(out):
        print('%s %4.0fs %-46s n=%-3d first %s last %s after=%-3d | %s | %s %s' % ('  ' if not bad else 'x ', gap, repo, n, first, lastt, after, ' '.join(cols), last[1], last[2]))
