import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
fires = collections.defaultdict(list)
for e in R.events:
    if e['e'] == 'fire': fires[(e['id'], e['w'])].append(e['t'])
tot = collections.Counter(); bytype = collections.defaultdict(collections.Counter)
for (mid, w), ts in sorted(fires.items()):
    d = collections.Counter(ts[i+1]-ts[i] for i in range(len(ts)-1))
    small = {k: v for k, v in sorted(d.items()) if k <= 80}
    print(mid, R.names[mid], w, len(ts), small)
    if w == 'gun':
        for k, v in d.items(): bytype[R.names[mid]][k] += v
print()
for t, c in bytype.items():
    print(t, sorted((k, v) for k, v in c.items() if k <= 70))
# upgrades timeline
for e in R.events:
    if e['e'] == 'upgrade': print(e)
# burst lengths: consecutive shots with gaps <= 12 ticks
for (mid, w), ts in sorted(fires.items()):
    if w != 'gun': continue
    bursts = []; cur = 1
    for i in range(1, len(ts)):
        if ts[i]-ts[i-1] <= 12: cur += 1
        else: bursts.append(cur); cur = 1
    bursts.append(cur)
    print(mid, R.names[mid], 'bursts', collections.Counter(bursts).most_common(8))
