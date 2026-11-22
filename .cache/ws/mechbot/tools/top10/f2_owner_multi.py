#!/usr/bin/env python3
"""Finder 2: for one team, find OWNERS whose repos have commits shortly before several of the team's
best-submission times on different tracks/snapshots (track-aware by repo name keywords).
usage (inputs live in intel/_triage/f2): f2_owner_multi.py <max_lag_s> <team> <snapshot.tsv>... -- <commits.txt>..."""
import sys, datetime, re, collections
a = sys.argv[1:]; i = a.index('--')
lag, team, snaps, files = float(a[0]), a[1], a[2:i], a[i+1:]
def track_of(repo):
    r = repo.lower()
    if re.search(r'blast|rwx', r): return 'blast'
    if re.search(r'shop|session|databrick', r): return 'shop'
    if re.search(r'cad|machina|mechina|deid', r): return 'cad'
    return 'mech'
trk = {1: 'mech', 2: 'shop', 3: 'cad', 4: 'blast'}
rows = set()
for s in snaps:
    blk = 0
    for l in open(s, encoding='utf-8'):
        if l.startswith('#'): continue
        p = l.rstrip('\n').split('\t')
        if len(p) != 4: continue
        if p[0] == '1': blk += 1
        if p[1] == team: rows.add((trk[blk], p[2], p[3]))
hits = collections.defaultdict(dict)
for f in files:
    for l in open(f, encoding='utf-8', errors='replace'):
        p = l.rstrip('\n').split('|')
        if len(p) < 6: continue
        repo = p[0].replace('.git', '').replace('__', '/')
        try: t = datetime.datetime.fromisoformat(p[4]).astimezone(datetime.timezone.utc)
        except ValueError: continue
        for tr, score, at in rows:
            if track_of(repo) != tr: continue
            d = (datetime.datetime.fromisoformat(at).astimezone(datetime.timezone.utc) - t).total_seconds()
            if -3 <= d <= lag:
                k = (tr, score, at[11:19]); o = repo.split('/')[0]
                if k not in hits[o] or d < hits[o][k][0]: hits[o][k] = (d, repo, p[1])
print(team, sorted(rows))
for o, h in sorted(hits.items(), key=lambda x: -len(x[1])):
    if len(h) < 2 and len(rows) > 1: continue
    print(' ', o, len(h), '/', len(rows), '; '.join('%s %s@%s lag %.0fs (%s %s)' % (k[0], k[1], k[2], v[0], v[1].split('/')[1], v[2]) for k, v in sorted(h.items())))
