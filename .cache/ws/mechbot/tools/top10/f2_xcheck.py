#!/usr/bin/env python3
"""Finder 2 cross-check (not the main timing analysis): for chosen repos, which leaderboard rows
(any track, both snapshots) have a best-submission time shortly after one of the repo's commits.
usage (inputs live in intel/_triage/f2): f2_xcheck.py <commits.txt> <max_lag_s> <snapshot.tsv>... -- <owner/repo>..."""
import sys, datetime
args = sys.argv[1:]; i = args.index('--')
commits, lag, snaps, repos = args[0], float(args[1]), args[2:i], args[i+1:]
rows = set()
for s in snaps:
    blk = 0
    for l in open(s, encoding='utf-8'):
        if l.startswith('#'): continue
        p = l.rstrip('\n').split('\t')
        if len(p) != 4: continue
        if p[0] == '1': blk += 1
        rows.add((blk, p[1], p[2], p[3]))
cm = {}
for l in open(commits, encoding='utf-8', errors='replace'):
    p = l.rstrip('\n').split('|')
    if len(p) < 6: continue
    r = p[0].replace('.git', '').replace('__', '/')
    if r not in repos: continue
    try: t = datetime.datetime.fromisoformat(p[4]).astimezone(datetime.timezone.utc)
    except ValueError: continue
    cm.setdefault(r, []).append((t, p[1], '|'.join(p[5:])[:60]))
trk = {1: 'mech', 2: 'shop', 3: 'cad', 4: 'blast'}
for r in repos:
    print('##', r, len(cm.get(r, [])), 'commits')
    out = []
    for blk, team, score, at in rows:
        t0 = datetime.datetime.fromisoformat(at).astimezone(datetime.timezone.utc)
        best = None
        for t, h, s in cm.get(r, []):
            d = (t0 - t).total_seconds()
            if -2 <= d <= lag and (best is None or d < best[0]): best = (d, h, s)
        if best: out.append((best[0], trk.get(blk, blk), team, score, at[11:19], best[1], best[2]))
    for o in sorted(out): print('   lag %6.1fs  %-5s %-28s %-6s %s  <- %s %s' % o)
