"""Which solid blocks the eye->target line in the kit stream at given ticks (terrain or which prism)."""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'forensics'))
from common import World
W = World()
P = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
L = [json.loads(l) for l in gzip.open(os.path.join(P, 'kit/check/stream.jsonl.gz'), 'rt')]
O = {x['tick']: x for x in L if x.get('type') == 'obs'}
for tk in [int(a) for a in sys.argv[1:]]:
    o = O[tk]; s = o['self']; m = [q for q in o['mechs'] if q['id'] == 10][0]
    a = (s['pos'][0], s['pos'][1], s['pos'][2] + 8); b = (m['pos'][0], m['pos'][1], m['pos'][2] + 4.5)
    g0 = W.ground(s['pos'][0], s['pos'][1]); sz = W.surface_z(s['pos'][0], s['pos'][1], s['pos'][2] + 1)
    print(f"tick {tk}: self z={s['pos'][2]:.2f} ground={g0:.2f} surface={sz:.2f} grounded={s['grounded']}; mech10 z={m['pos'][2]:.2f} ground={W.ground(m['pos'][0], m['pos'][1]):.2f}")
    n = int(math.dist(a, b))
    for i in range(1, n):
        f = i / n; x, y, z = (a[k] + (b[k] - a[k]) * f for k in range(3))
        g = W.ground(x, y)
        if z < g: print(f"   terrain at {f*n:.0f} m: line z {z:.2f} < ground {g:.2f}"); break
        if W.in_solid(x, y, z):
            pr = [p for p in W.prisms_at(x, y)]
            print(f"   solid at {f*n:.0f} m: z {z:.2f}, prisms here: {[(W.prisms[i]['kind'] if isinstance(i,int) else i.get('kind'), ) for i in pr][:3]}"); break
