#!/usr/bin/env python3
"""List every repo with a commit shortly before given submission times (local data only).
usage: at_bob_window.py [before_s] [after_s]
Reads commits_mech.tsv and commits_other.tsv (repo, sha, committer_ts, author_ts, author, committer, branches, subject)."""
import sys, datetime, collections
BEFORE = int(sys.argv[1]) if len(sys.argv) > 1 else 360
AFTER = int(sys.argv[2]) if len(sys.argv) > 2 else 60
def ep(s): return datetime.datetime.fromisoformat(s).timestamp()
TIMES = {
 'AT': [('mech 5.52', '2026-11-21T03:43:50+00:00'), ('shopping 0.96', '2026-11-21T03:36:45+00:00'),
        ('cad 51', '2026-11-21T02:39:25+00:00'), ('blast 184.8', '2026-11-21T03:37:06+00:00')],
 'BobBuildIt': [('mech 5.27', '2026-11-21T03:03:29+00:00'), ('shopping 0.86', '2026-11-21T03:07:37+00:00'),
        ('shopping 0.84', '2026-11-21T04:52:02+00:00'), ('cad 399', '2026-11-21T03:55:42+00:00'),
        ('blast 187.5', '2026-11-21T03:46:02+00:00')],
}
rows = []
for fn in ('commits_mech.tsv', 'commits_other.tsv'):
    for line in open(fn, encoding='utf-8'):
        p = line.rstrip('\n').split('\t')
        if len(p) < 8: continue
        rows.append((p[0], p[1], int(p[2]), int(p[3]), p[4], p[6], p[7], fn))
for team, lst in TIMES.items():
    print('=====', team)
    owners = collections.defaultdict(set)
    for label, at in lst:
        T = ep(at)
        print('--', label, at[11:19])
        for r in sorted(rows, key=lambda r: r[2]):
            for ts, kind in ((r[2], 'c'), (r[3], 'a')):
                g = T - ts
                if -AFTER <= g <= BEFORE:
                    print('   %6.0fs %s %-52s %s %-18s %s' % (g, kind, r[0], r[1][:8], r[4][:18], r[6][:90]))
                    owners[r[0].split('/')[0]].add(label)
                    break
    print('owners hit on >=2 labels:')
    for o, s in sorted(owners.items(), key=lambda x: -len(x[1])):
        if len(s) >= 2: print('   ', o, sorted(s))
