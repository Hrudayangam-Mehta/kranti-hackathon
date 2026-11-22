"""Do dropped cubes / weapons rest on the surface under the drop point? (replay mech16)"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'forensics'))
from common import Replay, World
R = Replay(); W = World()
rows = []
for e in R.events:
    if e['e'] == 'cube' or (e['e'] == 'weapon' and e['op'] in ('spawn', 'drop')):
        x, y, z = e['at']
        s = W.surface_z(x, y, z + 1.0)
        g = W.ground(x, y)
        rows.append((e['e'], round(z - s, 2), round(z - g, 2)))
import collections
for k in ('cube', 'weapon'):
    d = sorted(r[1] for r in rows if r[0] == k)
    print(k, 'n', len(d), 'z - surface: min', d[0], 'p50', d[len(d)//2], 'max', d[-1], ' >1m above surface:', sum(1 for v in d if v > 1.0))
