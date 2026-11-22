# Cross-check proj1 commit times against leaderboard best-submission times (read-only analysis).
import json, sys, datetime as dt
commits_path, times_path, lb_path = sys.argv[1:4]
commits = []
for line in open(commits_path):
    h, c, a, s = line.rstrip('\n').split(' ', 3)
    commits.append((dt.datetime.fromisoformat(c).astimezone(dt.timezone.utc), h, s, dt.datetime.fromisoformat(a).astimezone(dt.timezone.utc)))
commits.sort()
times = json.load(open(times_path))
rows = []
for team, subs in times.items():
    for ts, score in subs:
        t = dt.datetime.fromisoformat(ts)
        prev = [c for c in commits if c[0] <= t]
        nxt = [c for c in commits if c[0] > t]
        p = prev[-1] if prev else None
        n = nxt[0] if nxt else None
        rows.append((t, team, score, p, n))
rows.sort()
for t, team, score, p, n in rows:
    dp = (t - p[0]).total_seconds() if p else None
    dn = (n[0] - t).total_seconds() if n else None
    flag = '<<' if (dp is not None and dp < 180) else ''
    print(f"{t.strftime('%H:%M:%S.%f')[:-3]} {team[:28]:28s} {score:5.2f} prev={p[1] if p else '-'} +{dp if dp is not None else -1:8.1f}s next={n[1] if n else '-'} -{dn if dn is not None else -1:8.1f}s {flag} {p[2][:40] if p else ''}")
