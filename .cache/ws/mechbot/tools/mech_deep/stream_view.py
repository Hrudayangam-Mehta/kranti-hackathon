"""When mech 10 leaves the stream mech's observation: wedge / range / building LOS at the last-seen and first-missing obs."""
import sys, os, math, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'forensics'))
from common import World, angdiff
W = World()
P = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
L = [json.loads(l) for l in gzip.open(os.path.join(P, 'kit/check/stream.jsonl.gz'), 'rt')]
O = [x for x in L if x.get('type') == 'obs']
last = None
for i, o in enumerate(O):
    m = [m for m in o['mechs'] if m['id'] == 10]
    if last is not None and not m and last['m']:
        lm = last['m']; s = o['self']; ls = last['o']['self']
        # extrapolate mech 10 one obs forward
        px = [lm['pos'][k] + lm['vel'][k] * (o['t'] - last['o']['t']) for k in range(3)]
        for tag, ss, pp in (('last-seen', ls, lm['pos']), ('first-missing(extrap)', s, px)):
            d = math.hypot(pp[0]-ss['pos'][0], pp[1]-ss['pos'][1])
            brg = math.atan2(pp[1]-ss['pos'][1], pp[0]-ss['pos'][0])
            off = math.degrees(abs(angdiff(brg, ss['aim'][0])))
            eye = (ss['pos'][0], ss['pos'][1], ss['pos'][2] + 8)
            losc = W.los(*eye, pp[0], pp[1], pp[2] + 4.5)
            lost = W.los(*eye, pp[0], pp[1], pp[2] + 9)
            print(f"obs {o['tick'] if tag!='last-seen' else last['o']['tick']} {tag}: d={d:.1f} wedge_off={off:.1f}deg los_center={losc} los_top={lost}")
        # does it come back, and when?
        for j in range(i, min(i+80, len(O))):
            if any(mm['id'] == 10 for mm in O[j]['mechs']):
                print('  reappears at obs', O[j]['tick'], 'after', round(O[j]['t'] - o['t'], 2), 's'); break
    last = {'o': o, 'm': m[0] if m else None}
