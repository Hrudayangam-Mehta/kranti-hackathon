"""Per-obs geometric LOS (terrain+prisms, no trees) from the stream mech's eye to mech 10 (center/top), and whether it is listed."""
import sys, os, math, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'forensics'))
from common import World, angdiff
W = World()
P = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
L = [json.loads(l) for l in gzip.open(os.path.join(P, 'kit/check/stream.jsonl.gz'), 'rt')]
O = [x for x in L if x.get('type') == 'obs']
for o in O:
    m = [m for m in o['mechs'] if m['id'] == 10]
    if not m: continue
    m = m[0]; s = o['self']
    eye = (s['pos'][0], s['pos'][1], s['pos'][2] + 8)
    pp = m['pos']
    a = W.los(*eye, pp[0], pp[1], pp[2] + 4.5); b = W.los(*eye, pp[0], pp[1], pp[2] + 9)
    d = math.hypot(pp[0]-s['pos'][0], pp[1]-s['pos'][1])
    off = math.degrees(abs(angdiff(math.atan2(pp[1]-s['pos'][1], pp[0]-s['pos'][0]), s['aim'][0])))
    flag = '' if (a >= 1 or b >= 1) else '  <-- listed while geometrically blocked'
    print(o['tick'], f"d={d:.0f} off={off:.0f} los_c={a:.2f} los_t={b:.2f}{flag}")
