"""Laser aim model: which victim position/time does the beam direction correspond to?"""
import sys, os, math, collections, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
recs = json.load(open(os.path.join(OUT, 'lasers.json')))
la = {(e['id'], e['t']): e for e in R.events if e['e'] == 'laser'}
ch = [e for e in R.events if e['e'] == 'charge']
use = [r for r in recs if r['victim'] is not None and not r.get('blocked') and r['ang'] is not None and r['ang'] < 12]
print('beams used', len(use))
rows = []
for k in range(0, 19):
    ey = []; ep = []
    for r in use:
        L = la[(r['s'], r['t'])]
        o = L['from']; d = [L['to'][i] - o[i] for i in range(3)]
        byaw = math.atan2(d[1], d[0]); bpitch = math.atan2(d[2], math.hypot(d[0], d[1]))
        pv = R.pos(r['victim'], r['t'] - k)
        ps = R.pos(r['s'], r['t'])
        if pv is None or ps is None: continue
        mz = (ps[0], ps[1], ps[2] + 7)
        ey.append(math.degrees(angdiff(byaw, math.atan2(pv[1] - mz[1], pv[0] - mz[0]))))
        ep.append(math.degrees(bpitch - math.atan2(pv[2] + 4.5 - mz[2], math.hypot(pv[0] - mz[0], pv[1] - mz[1]))))
    rows.append([k, k * TICK, len(ey), math.sqrt(mean([x * x for x in ey])), pct([abs(x) for x in ey], .5), math.sqrt(mean([x * x for x in ep])), pct([abs(x) for x in ep], .5)])
print(table(['lag ticks', 'lag s', 'n', 'yaw rms deg', 'yaw median |err|', 'pitch rms', 'pitch median |err|'], rows))
# charge event yaw/pitch (aim at charge start) vs beam direction: does aim move during charge?
dy = []
for r in use:
    c = [c for c in ch if c['id'] == r['s'] and c['t'] == r['t_charge']][0]
    L = la[(r['s'], r['t'])]
    d = [L['to'][i] - L['from'][i] for i in range(3)]
    dy.append(math.degrees(angdiff(math.atan2(d[1], d[0]), c['yaw'])))
print('beam yaw minus aim yaw at charge start (deg): p10 %.1f p50 %.1f p90 %.1f ; |.| median %.1f' % (pct(dy, .1), pct(dy, .5), pct(dy, .9), median([abs(x) for x in dy])))
# torso aim of the charger through the charge: frames
print('\nexample aim traces during charge (charger yaw per frame minus bearing to victim per frame, deg):')
for r in use[:14]:
    tr = []
    for t in range(r['t_charge'] - 1, r['t'] + 1, 2):
        a = R.row(r['s'], t); ps = R.pos(r['s'], t); pv = R.pos(r['victim'], t)
        if a and ps and pv:
            tr.append(round(math.degrees(angdiff(a[MYAW], math.atan2(pv[1] - ps[1], pv[0] - ps[0]))), 1))
    print('  ', r['s'], r['type'], r['t'], 'HIT' if r['hit'] else 'miss', 'vlat %.1f rng %.0f' % (r['vlat'], r['rng']), tr)
