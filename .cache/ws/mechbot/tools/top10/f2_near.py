#!/usr/bin/env python3
"""Finder 2 cross-check: commits (from the metadata dump) that precede a team's best-submission time.
usage (inputs live in intel/_triage/f2): f2_near.py <commits.txt> <before_s> <after_s> <ISO time> [<ISO time> ...]"""
import sys, datetime
rows = []
for l in open(sys.argv[1], encoding='utf-8', errors='replace'):
    p = l.rstrip('\n').split('|')
    if len(p) < 6: continue
    try: t = datetime.datetime.fromisoformat(p[4]).astimezone(datetime.timezone.utc)
    except ValueError: continue
    rows.append((t, p[0].replace('.git', '').replace('__', '/'), p[1], '|'.join(p[5:])[:90]))
b, a = float(sys.argv[2]), float(sys.argv[3])
for s in sys.argv[4:]:
    t0 = datetime.datetime.fromisoformat(s).astimezone(datetime.timezone.utc)
    print('##', s)
    for t, repo, h, subj in sorted(rows):
        d = (t0 - t).total_seconds()
        if -a <= d <= b:
            print('  %+7.1fs  %s %s  %s' % (-d, repo, h, subj))
