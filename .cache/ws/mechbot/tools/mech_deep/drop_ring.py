"""Who stood within 8 m of supply drop 20000/20001 around landing, and what the drop state said (replay mech16)."""
import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'forensics'))
from common import Replay
R = Replay()
drops = {e['id']: e for e in R.events if e['e'] == 'drop' and e['op'] == 'call'}
for did, c in drops.items():
    at = c['at']; land = c['lands']
    print('drop', did, 'at', at, 'lands tick', land)
    for k, fr in enumerate(R.frames):
        if fr['t'] < land - 40 or fr['t'] > land + 260 or fr['t'] % 20: continue
        ds = [d for d in fr.get('d', []) if d[0] == did]
        inside = []
        for row in fr['m']:
            d = math.hypot(row[1] - at[0], row[2] - at[1])
            if d < 14: inside.append((row[0], round(d, 1), round(row[3] - at[2], 1), row[6]))
        print('  tick', fr['t'], 'state', ds[0][1:] if ds else None, 'near(<14m):', inside)
