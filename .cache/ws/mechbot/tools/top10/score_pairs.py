#!/usr/bin/env python3
"""Gap-aware timestamp correlation between leaderboard submission times and commit times.
Local data only.
usage: score_pairs.py <subtimes.json> <commits_mech.tsv> <commits_other.tsv> <out.json>

For a submission time T and a repo R:
    gap(T,R)  = T - (latest commit of R at or before T + EPS)          (EPS = 5 s clock tolerance)
    u(T,R)    = chance that an unrelated submission time is at least this close to a commit of R
              = max( share of the event window lying within gap after some commit,
                     (1 + number of other teams' submission times, all tracks, with gap <= this gap) / (1 + N) )
    p(team,R) = Fisher combination of u over all the team's submission times in the chosen scope
    E(team,R) = p * number of repos compared  (expected number of unrelated repos scoring this well)
Two scopes: 'mech' (mech times against mech-candidate repos) and 'owner' (all tracks' times against the
union of all repos of one GitHub owner).  The fixed-window rule of the task (commit within [-90 s, +360 s]
of T) is reported alongside as hits6.
"""
import json, sys, bisect, math, datetime, collections

EPS, SKEW, WIN = 5, 90, 360
sub = json.load(open(sys.argv[1]))
ep = lambda s: datetime.datetime.fromisoformat(s).timestamp()
hm = lambda t: datetime.datetime.utcfromtimestamp(t).strftime('%H:%M:%S')

repo_commits = collections.defaultdict(list)
repo_set = {}
for tag, fn in (('mech', sys.argv[2]), ('other', sys.argv[3])):
    for line in open(fn, encoding='utf-8'):
        p = line.rstrip('\n').split('\t')
        if len(p) < 8: continue
        repo_commits[p[0]].append((int(p[2]), p[4], p[7], p[1]))
        repo_set[p[0]] = tag
for r in repo_commits: repo_commits[r].sort()
owner_commits = collections.defaultdict(list)
for r, cs in repo_commits.items():
    owner_commits[r.split('/')[0]] += [(c[0], c[1], r.split('/')[1] + ': ' + c[2], c[3]) for c in cs]
for o in owner_commits: owner_commits[o].sort()

times = []                     # (track, team, T, score, at)
for k, teams in sub['tracks'].items():
    for team, lst in teams.items():
        for x in lst: times.append((k, team, ep(x['at']), x['score'], x['at']))
T0 = ep('2026-11-20T23:00:00+00:00')
T1 = max(t[2] for t in times) + 60
WLEN = T1 - T0

class Series:
    def __init__(self, commits):
        self.c = commits
        self.t = [x[0] for x in commits]
        self.all_gaps = None
    def gap(self, T):
        i = bisect.bisect_right(self.t, T + EPS) - 1
        if i < 0: return None, None
        return max(0.0, T - self.t[i]), self.c[i]
    def post(self, T):                       # first commit after T (for the +90 s rule)
        i = bisect.bisect_right(self.t, T + EPS)
        return (self.t[i] - T, self.c[i]) if i < len(self.t) else (None, None)
    def cover(self, g):
        tot, cs, ce = 0.0, None, None
        for c in self.t:
            s, e = max(T0, c - EPS), min(T1, c + g)
            if e <= s: continue
            if ce is None or s > ce:
                if ce is not None: tot += ce - cs
                cs, ce = s, e
            else: ce = max(ce, e)
        if ce is not None: tot += ce - cs
        return tot / WLEN
    def hit6(self, T):
        i = bisect.bisect_right(self.t, T + SKEW) - 1
        return i >= 0 and T - self.t[i] <= WIN

def chi2_sf(x, k):          # survival function of chi-square with even dof k = 2n
    n = k // 2
    term, s = 1.0, 1.0
    for i in range(1, n):
        term *= (x / 2) / i
        s += term
    return min(1.0, math.exp(-x / 2) * s)

def evaluate(series_map, scope_tracks, n_compare):
    out = []
    # precompute gaps of every submission time against every series
    allg = {}
    for name, S in series_map.items():
        allg[name] = [(S.gap(t[2])[0], t[1]) for t in times]
    team_times = collections.defaultdict(list)
    for t in times:
        if t[0] in scope_tracks: team_times[t[1]].append(t)
    for team, tl in team_times.items():
        for name, S in series_map.items():
            other = sorted(g for g, tm in allg[name] if tm != team and g is not None)
            n_other = sum(1 for g, tm in allg[name] if tm != team)
            us, det, h6 = [], [], 0
            for (k, _, T, sc, at) in tl:
                g, c = S.gap(T)
                if S.hit6(T): h6 += 1
                if g is None:
                    us.append(1.0); det.append(dict(track=k, at=at[11:19], score=sc, gap=None)); continue
                ua = S.cover(max(g, EPS))
                ue = (1 + bisect.bisect_right(other, g)) / (1 + n_other)
                u = min(1.0, max(ua, ue))
                us.append(u)
                pg, pc = S.post(T)
                det.append(dict(track=k, at=at[11:19], score=sc, gap=round(g, 1), u=round(u, 4), commit=hm(c[0]),
                                author=c[1], subject=c[2][:110], sha=c[3],
                                post=(round(pg, 1) if pg is not None and pg <= SKEW else None)))
            X = -2 * sum(math.log(max(u, 1e-9)) for u in us)
            p = chi2_sf(X, 2 * len(us))
            if p < 0.25 or h6:
                out.append(dict(team=team, cand=name, n=len(us), hits6=h6, p=p, E=p * n_compare, detail=det))
    return out

mech_series = {r: Series(cs) for r, cs in repo_commits.items() if repo_set[r] == 'mech'}
owner_series = {o: Series(cs) for o, cs in owner_commits.items()}
res = dict(params=dict(EPS=EPS, SKEW=SKEW, WIN=WIN, T0=T0, T1=T1),
           n_mech_repos=len(mech_series), n_owners=len(owner_series),
           mech=evaluate(mech_series, ('mech',), len(mech_series)),
           owner=evaluate(owner_series, tuple(sub['tracks'].keys()), len(owner_series)),
           repo_stats={r: dict(n=len(S.t), cov360=round(S.cover(360), 4), cov60=round(S.cover(60), 4),
                               first=hm(S.t[0]), last=hm(S.t[-1])) for r, S in mech_series.items()})
json.dump(res, open(sys.argv[4], 'w'), indent=1)
print('mech repos', len(mech_series), 'owners', len(owner_series), 'pairs kept', len(res['mech']), len(res['owner']))
