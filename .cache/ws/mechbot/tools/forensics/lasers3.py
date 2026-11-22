"""Laser (replay build): what does the locked charge direction point at?  Test lead horizons."""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
recs = json.load(open(os.path.join(OUT, 'lasers.json')))
ch = {(e['id'], e['t']): e for e in R.events if e['e'] == 'charge'}
use = [r for r in recs if r['victim'] is not None and r['ang'] is not None and r['ang'] < 12]
rows = []
for T in (0.0, 0.2, 0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 1.0):
    ey = []; ep = []
    for r in use:
        c = ch[(r['s'], r['t_charge'])]; E = r['t_charge'] - 1
        ps = R.pos(r['s'], E); pv = R.pos(r['victim'], E); vv = R.vel(r['victim'], E, back=True)
        if not ps or not pv or not vv: continue
        q = (pv[0] + vv[0] * T, pv[1] + vv[1] * T, pv[2] + 4.5)
        mz = (ps[0], ps[1], ps[2] + 7)
        ey.append(math.degrees(angdiff(c['yaw'], math.atan2(q[1] - mz[1], q[0] - mz[0]))))
        ep.append(math.degrees(c['pitch'] - math.atan2(q[2] - mz[2], math.hypot(q[0] - mz[0], q[1] - mz[1]))))
    rows.append([T, len(ey), mean(ey), sd(ey), pct([abs(x) for x in ey], .5), pct([abs(x) for x in ey], .9), pct([abs(x) for x in ep], .5)])
print('charge-start aim vs bearing to (victim position + velocity * T) at the observation before the charge (deg)')
print(table(['lead horizon T (s)', 'n', 'yaw mean', 'yaw sd', 'median |yaw err|', 'p90 |yaw err|', 'median |pitch err|'], rows))
