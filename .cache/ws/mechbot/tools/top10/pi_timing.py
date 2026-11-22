import json, subprocess, sys, datetime as dt
P = sys.argv[1]
M = P + "/intel/_meta/AbhirajTiwari12__mech-royale-bot.git"
out = subprocess.run(["git", "-C", M, "log", "--all", "--format=%h %ct %s"], capture_output=True, text=True).stdout.splitlines()
commits = [(l.split(" ", 2)[0], int(l.split(" ", 2)[1]), l.split(" ", 2)[2]) for l in out]
sub = json.load(open(P + "/../web/mech_submission_times.json"))
rows = []
for team, lst in sub.items():
    for ts, sc in lst:
        t = dt.datetime.fromisoformat(ts).timestamp()
        rows.append((team, t, sc, ts))
print("rows", len(rows), "commits", len(commits))
for team, t, sc, ts in rows:
    best = min(commits, key=lambda c: abs(c[1] - t))
    gap = t - best[1]
    if abs(gap) <= 150:
        print("%-28s %5.2f %s  gap %+7.2f s  commit %s %s" % (team, sc, ts[11:19], gap, best[0], best[2][:60]))
