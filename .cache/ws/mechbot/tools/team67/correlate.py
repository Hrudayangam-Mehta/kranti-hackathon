#!/usr/bin/env python3
"""Correlate commit timestamps with team 67 submission times.

Input: TSV lines  repo  sha  committer_iso  author_iso  author_name  subject
Output: per repo, hits per track (commit 0..WIN min before a submission),
plus commit density so chance matches can be judged.
"""
import sys
from datetime import datetime, timezone, timedelta

SUBS = {
    'machina-deid': ['03:04:23', '04:16:37', '05:36:16', '14:41:08'],
    'blast-radius': ['04:10:59', '07:24:02', '15:10:25'],
    'shopping-sessions': ['06:15:29', '07:17:30', '16:00:34'],
}
DAY = '2026-11-21'
WIN = float(sys.argv[2]) if len(sys.argv) > 2 else 6.0


def ts(s):
    return datetime.fromisoformat(DAY + 'T' + s + '+00:00')


subs = {k: [ts(x) for x in v] for k, v in SUBS.items()}
repos = {}
for line in open(sys.argv[1], encoding='utf-8', errors='replace'):
    p = line.rstrip('\n').split('\t')
    if len(p) < 6:
        continue
    repo, sha, ci, ai, an, subj = p[:6]
    try:
        c = datetime.fromisoformat(ci).astimezone(timezone.utc)
        a = datetime.fromisoformat(ai).astimezone(timezone.utc)
    except ValueError:
        continue
    repos.setdefault(repo, {})[sha] = (c, a, an, subj)

rows = []
for repo, cm in repos.items():
    commits = list(cm.values())
    day = [x for x in commits if x[0].date().isoformat() in ('2026-11-20', '2026-11-21')]
    hits = {}
    for tr, tl in subs.items():
        for t in tl:
            for sha, (c, a, an, subj) in cm.items():
                for kind, x in (('c', c), ('a', a)):
                    d = (t - x).total_seconds() / 60
                    if 0 <= d <= WIN:
                        hits.setdefault(tr, set()).add((t.strftime('%H:%M:%S'), sha, kind, round(d, 1), an, subj[:60]))
    nsub = {tr: len({h[0] for h in hs}) for tr, hs in hits.items()}
    if nsub:
        span = 0
        if day:
            span = (max(x[0] for x in day) - min(x[0] for x in day)).total_seconds() / 3600
        rows.append((max(nsub.values()), repo, len(commits), len(day), round(span, 1), nsub, hits))

rows.sort(key=lambda r: (-r[0], r[3]))
for best, repo, n, nd, span, nsub, hits in rows:
    print(f'{repo}\tcommits={n} on-day={nd} span_h={span}\t{nsub}')
    for tr, hs in hits.items():
        for h in sorted(hs):
            print(f'    {tr} sub {h[0]}  {h[1]} {h[2]} -{h[3]}m  {h[4]} | {h[5]}')
