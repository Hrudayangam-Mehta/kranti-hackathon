"""Do mechs fire the gun while their laser charges (both triggers held)? Replay mech16."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'forensics'))
from common import Replay
R = Replay()
ch = [e for e in R.events if e['e'] == 'charge']
las = [e for e in R.events if e['e'] == 'laser']
fires = [e for e in R.events if e['e'] == 'fire' and e['w'] == 'gun']
n_in = 0; n_win = 0; tot = 0.0
for c in ch:
    end = min([l['t'] for l in las if l['id'] == c['id'] and l['t'] >= c['t']] or [c['t'] + 13])
    f = [x for x in fires if x['id'] == c['id'] and c['t'] < x['t'] < end]
    n_win += 1; n_in += len(f); tot += (end - c['t']) * 0.05
    # gun fire right before and after the window
    before = [x['t'] for x in fires if x['id'] == c['id'] and c['t'] - 20 <= x['t'] <= c['t']]
    after = [x['t'] for x in fires if x['id'] == c['id'] and end <= x['t'] <= end + 20]
    print(f"mech {c['id']} charge {c['t']}->{end}: gun shots inside={len(f)} shots in 1s before={len(before)} after={len(after)} (first after +{(after[0]-end) if after else None} ticks)")
print('windows', n_win, 'gun shots inside', n_in, 'window seconds', round(tot, 1))
