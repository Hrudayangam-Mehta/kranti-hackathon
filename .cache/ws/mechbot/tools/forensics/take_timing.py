import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
pk = {p['id']: p for p in R.hdr['pickups']}
pos = {p['id']: p['pos'] for p in R.hdr['pickups']}
for e in R.events:
    if e['e'] == 'weapon':
        if e['op'] in ('spawn', 'drop') and 'at' in e: pos[e['id']] = e['at']
        print(e)
print()
for e in R.events:
    if e['e'] == 'weapon' and e['op'] == 'take':
        p = pos.get(e['id']); t = e['t']
        ds = []
        for k in range(0, 8):
            q = R.pos(e['by'], t - k)
            ds.append(round(math.hypot(q[0]-p[0], q[1]-p[1]), 2) if q else None)
        v = R.vel(e['by'], t-1)
        print(t, t % 2, e['by'], R.names[e['by']], e['kind'], 'd(t-k) k=0..7', ds, 'spd', round(math.hypot(v[0], v[1]), 1), 'dz', round(R.pos(e['by'], t)[2]-p[2], 2))
