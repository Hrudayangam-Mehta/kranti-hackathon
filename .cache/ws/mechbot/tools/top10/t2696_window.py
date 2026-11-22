# For each official 2696 time, list proj1 commits in the preceding window (default 6 min) plus the nearest before/after.
# Input: a TSV of "epoch<TAB>iso<TAB>sha<TAB>branches<TAB>profile<TAB>subject" from stdin. Reads data only.
import sys, datetime as dt
W = float(sys.argv[1]) if len(sys.argv) > 1 else 360
times = [("4.65","2026-11-21T02:05:34"),("4.90","2026-11-21T04:45:24"),("4.96","2026-11-21T05:32:56"),
         ("5.42","2026-11-21T05:40:15"),("5.60","2026-11-21T06:58:15")]
rows = [l.rstrip("\n").split("\t") for l in sys.stdin if l.strip()]
rows = [(int(r[0]),)+tuple(r[1:]) for r in rows]
rows.sort()
for sc, t in times:
    e = int(dt.datetime.fromisoformat(t).replace(tzinfo=dt.timezone.utc).timestamp())
    hits = [r for r in rows if e - W <= r[0] <= e]
    before = [r for r in rows if r[0] < e - W][-1:]
    after = [r for r in rows if r[0] > e][:3]
    print(f"== {sc} at {t[11:]}  commits within {int(W)} s before: {len(hits)}")
    for r in hits: print(f"   HIT  -{e-r[0]:4d}s  {r[1][11:19]} {r[2][:7]} [{r[3]}] {r[4]} | {r[5]}")
    for r in before: print(f"   prev -{e-r[0]:4d}s  {r[1][11:19]} {r[2][:7]} [{r[3]}] {r[4]} | {r[5]}")
    for r in after: print(f"   next +{r[0]-e:4d}s  {r[1][11:19]} {r[2][:7]} [{r[3]}] {r[4]} | {r[5]}")
