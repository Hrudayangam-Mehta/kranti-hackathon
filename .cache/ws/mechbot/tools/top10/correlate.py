#!/usr/bin/env python3
"""Timestamp correlation between leaderboard submission times and repository commit times.
Local data only (subtimes.json + commits TSVs).
usage: correlate.py <subtimes.json> <commits.tsv>[,<commits2.tsv>...] <out.json> [--track mech] [--print]
Definitions
  T        a team's submission time ('at' of its best entry in a snapshot)
  hit      some commit c of the repo has  -SKEW <= T - c <= WIN   (SKEW 90 s, WIN 360 s);
           gap is measured to the latest such commit.
  p_repo   chance that a random submission time hits the repo:
           max( covered fraction of the event window by [c-WIN... c+SKEW] intervals,
                share of all *other* teams' submission times (all tracks) that hit it )
  pval     P(Binomial(n_times, p_repo) >= hits)
"""
import json, sys, bisect, math, datetime, collections

SKEW, WIN, TIGHT = 90, 360, 120
sub = json.load(open(sys.argv[1]))
files = sys.argv[2].split(',')
out = sys.argv[3]
track = 'mech'
if '--track' in sys.argv: track = sys.argv[sys.argv.index('--track') + 1]

def ep(s):
    return datetime.datetime.fromisoformat(s).timestamp()

commits = collections.defaultdict(list)   # repo -> [(ct, at, author, subject, branches)]
for fn in files:
    for line in open(fn, encoding='utf-8'):
        p = line.rstrip('\n').split('\t')
        if len(p) < 8: continue
        commits[p[0]].append((int(p[2]), int(p[3]), p[4], p[7], p[6], p[1]))
for r in commits: commits[r].sort()

all_times = []   # (track, team, T)
for k, teams in sub['tracks'].items():
    for team, lst in teams.items():
        for x in lst: all_times.append((k, team, ep(x['at']), x['score']))
T0 = ep('2026-11-20T23:00:00+00:00')
T1 = max(t for _, _, t, _ in all_times) + 60

def hit(repo, T):
    cs = commits[repo]
    times = [c[0] for c in cs]
    i = bisect.bisect_right(times, T + SKEW) - 1
    if i < 0: return None
    gap = T - times[i]
    if gap <= WIN: return gap, cs[i]
    return None

def coverage(repo):
    iv = sorted((max(T0, c[0] - SKEW), min(T1, c[0] + WIN)) for c in commits[repo] if c[0] + WIN > T0 and c[0] - SKEW < T1)
    tot, cur_s, cur_e = 0.0, None, None
    for s, e in iv:
        if cur_e is None or s > cur_e:
            if cur_e is not None: tot += cur_e - cur_s
            cur_s, cur_e = s, e
        else: cur_e = max(cur_e, e)
    if cur_e is not None: tot += cur_e - cur_s
    return tot / (T1 - T0)

def binom_tail(n, p, k):
    return sum(math.comb(n, i) * p**i * (1 - p)**(n - i) for i in range(k, n + 1))

res = {'params': dict(SKEW=SKEW, WIN=WIN, TIGHT=TIGHT, window=[T0, T1]), 'repos': {}, 'pairs': []}
emp_hits = collections.defaultdict(list)
for repo in commits:
    for k, team, T, sc in all_times:
        h = hit(repo, T)
        if h: emp_hits[repo].append((k, team, T, h[0]))
for repo in commits:
    cov = coverage(repo)
    inwin = [c for c in commits[repo] if T0 - 3600 <= c[0] <= T1]
    res['repos'][repo] = dict(n_commits=len(commits[repo]), n_event=len(inwin), coverage=round(cov, 4),
                              emp_all=len(emp_hits[repo]), first=commits[repo][0][0], last=commits[repo][-1][0],
                              authors=sorted(set(c[2] for c in commits[repo]))[:8])
N_all = len(all_times)
teams = sub['tracks'][track]
for team, lst in teams.items():
    Ts = [(ep(x['at']), x['score'], x['at']) for x in lst]
    for repo in commits:
        hs = []
        for T, sc, at in Ts:
            h = hit(repo, T)
            if h: hs.append(dict(at=at[11:19], score=sc, gap=round(h[0], 1), sha=h[1][5], subject=h[1][3][:120], author=h[1][2]))
        if not hs: continue
        others = sum(1 for (k, t2, T, g) in emp_hits[repo] if not (t2 == team))
        n_other = sum(1 for (k, t2, T, s) in all_times if t2 != team)
        p_emp = (others + 0.5) / (n_other + 1)
        p = max(res['repos'][repo]['coverage'], p_emp)
        pv = binom_tail(len(Ts), p, len(hs))
        res['pairs'].append(dict(team=team, repo=repo, n_times=len(Ts), hits=len(hs), detail=hs, p_repo=round(p, 4),
                                 pval=pv, tight=sum(1 for h in hs if 0 <= h['gap'] <= TIGHT),
                                 min_gap=min(abs(h['gap']) for h in hs)))
res['pairs'].sort(key=lambda x: (x['team'], x['pval']))
json.dump(res, open(out, 'w'), indent=1)
if '--print' in sys.argv:
    order = sub.get('rank_now', {})
    byteam = collections.defaultdict(list)
    for p in res['pairs']: byteam[p['team']].append(p)
    for team in sorted(teams, key=lambda t: (order.get(t, 999), t)):
        ps = sorted(byteam.get(team, []), key=lambda x: x['pval'])
        print('\n#%s %s  times=%s' % (order.get(team, '-'), team, [(x['at'][11:19], x['score']) for x in teams[team]]))
        for p in ps[:6]:
            print('   %-48s hits %d/%d tight %d p_repo %.3f pval %.4f  %s' % (
                p['repo'], p['hits'], p['n_times'], p['tight'], p['p_repo'], p['pval'],
                ' ; '.join('%s gap %ss [%s] %s' % (h['at'], h['gap'], h['author'][:14], h['subject'][:60]) for h in p['detail'])))
