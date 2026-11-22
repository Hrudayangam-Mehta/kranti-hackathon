#!/usr/bin/env python3
"""Track-aware correlation with a chance baseline.

usage: correlate2.py commits.tsv [window_min]
commits.tsv: repo sha committer_iso author_iso author_name subject
For each repo, hits are counted only on the track(s) its name suggests.
p = share of one-minute sample points (00:00-17:00 UTC Nov 21) whose
preceding window holds a commit; expected chance hits = p * n_subs.
"""
import re
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


def tracks_for(repo):
    r = repo.lower()
    out = []
    if re.search(r'shop|session|databrick', r):
        out.append('shopping-sessions')
    if re.search(r'blast|radius|rwx', r):
        out.append('blast-radius')
    if re.search(r'cad|deid|de-id|machina|mechina|dicom|anonym', r):
        out.append('machina-deid')
    return out or list(SUBS)


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

start = ts('00:00:00')
samples = [start + timedelta(minutes=i) for i in range(17 * 60)]
rows = []
for repo, cm in repos.items():
    times = sorted({x for v in cm.values() for x in (v[0], v[1])})
    covered = 0
    for s in samples:
        if any(0 <= (s - x).total_seconds() / 60 <= WIN for x in times):
            covered += 1
    pchance = covered / len(samples)
    trs = tracks_for(repo)
    hits = {}
    for tr in trs:
        for t in subs[tr]:
            for sha, (c, a, an, subj) in cm.items():
                ds = [round((t - x).total_seconds() / 60, 1) for x in (c, a)]
                ok = [d for d in ds if 0 <= d <= WIN]
                if ok:
                    hits.setdefault(tr, {}).setdefault(t.strftime('%H:%M:%S'), []).append(
                        (sha, min(ok), c.strftime('%H:%M:%S'), a.strftime('%H:%M:%S'), an, subj[:70]))
    nsubs = sum(len(subs[tr]) for tr in trs)
    nh = sum(len(v) for v in hits.values())
    lastc = max((v[0] for v in cm.values()), default=None)
    rows.append((nh, nh - pchance * nsubs, repo, len(cm), round(pchance, 3), nsubs, trs, hits, lastc))

rows.sort(key=lambda r: (-r[1], -r[0]))
for nh, ex, repo, n, pc, nsubs, trs, hits, lastc in rows:
    if nh == 0 and '-v' not in sys.argv:
        continue
    print(f'{repo}  commits={n} last={lastc:%H:%M} p_chance={pc} hits={nh}/{nsubs} expected={pc*nsubs:.2f} tracks={trs}')
    for tr, d in hits.items():
        for t, lst in sorted(d.items()):
            for sha, dm, c, a, an, subj in lst:
                print(f'    {tr} {t}: {sha} -{dm}m (c {c} a {a}) {an} | {subj}')
