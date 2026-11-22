# For tigerbyte's two best-submission times, list repos with a commit shortly before BOTH (read-only).
import sys, csv, datetime as dt, collections
path = sys.argv[1]
T = [dt.datetime.fromisoformat("2026-11-21T04:03:41+00:00"), dt.datetime.fromisoformat("2026-11-21T04:58:47+00:00")]
win = float(sys.argv[2]) if len(sys.argv) > 2 else 600
best = collections.defaultdict(lambda: [None, None])
with open(path, newline='') as f:
    for row in csv.reader(f, delimiter='\t'):
        if len(row) < 3:
            continue
        repo = row[0]
        ts = None
        for cell in row[1:]:
            try:
                ts = dt.datetime.fromisoformat(cell.replace('Z', '+00:00'))
                break
            except Exception:
                continue
        if ts is None:
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=dt.timezone.utc)
        for i, t in enumerate(T):
            d = (t - ts).total_seconds()
            if 0 <= d <= win:
                cur = best[repo][i]
                if cur is None or d < cur[0]:
                    best[repo][i] = (d, row[-1][:60])
for repo, (a, b) in sorted(best.items(), key=lambda kv: (kv[1][0] is None) + (kv[1][1] is None)):
    if a and b:
        print("BOTH", repo, round(a[0]), a[1], '|', round(b[0]), b[1])
print('---- single')
for repo, (a, b) in sorted(best.items()):
    if (a is None) != (b is None):
        x = a or b
        print('ONE ', repo, 'first' if a else 'second', round(x[0]), x[1])
