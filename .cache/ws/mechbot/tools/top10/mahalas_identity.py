import json, subprocess, sys, datetime as dt
P = sys.argv[1]
d = json.load(open(P + '/../web/mech_submission_times.json'))
out = subprocess.run(['git', '-C', P + '/intel/_meta/chriseco427-spec__CyprusBot.git', 'log', '--all',
                      '--format=%h %ct'], capture_output=True, text=True).stdout.split('\n')
commits = sorted((int(l.split()[1]), l.split()[0]) for l in out if l.strip())
def ts(s): return dt.datetime.fromisoformat(s).timestamp()
def utc(t): return dt.datetime.utcfromtimestamp(t).strftime('%H:%M:%S')
for name, rows in d.items():
    if name != 'Mahalas': continue
    for s, sc in rows:
        t = ts(s); prev = [c for c in commits if c[0] <= t]
        c = prev[-1]
        print(name, utc(t), sc, 'last commit', c[1], utc(c[0]), 'lag', int(t - c[0]), 's')
lo, hi = commits[0][0], commits[-1][0] + 240
for W in (120, 240, 300):
    n = k = 0
    for name, rows in d.items():
        if name == 'Mahalas': continue
        for s, sc in rows:
            t = ts(s)
            if not (lo <= t <= hi): continue
            n += 1
            if any(0 <= t - c[0] <= W for c in commits): k += 1
    p = k / n if n else 0
    print('window', W, 'others in span', n, 'hits', k, 'rate %.3f' % p, 'p^3 %.4f' % p ** 3)
print('teams in file', len(d), 'teams with 3+ entries', [n for n, r in d.items() if len(r) >= 3])
# max-lag needed for Mahalas: 215 s; use 216-s window too
W = 216; n = k = 0
for name, rows in d.items():
    if name == 'Mahalas': continue
    for s, sc in rows:
        t = ts(s)
        if lo <= t <= hi:
            n += 1; k += any(0 <= t - c[0] <= W for c in commits)
print('window 216', n, k, '%.3f' % (k / n), '%.4f' % ((k / n) ** 3))
