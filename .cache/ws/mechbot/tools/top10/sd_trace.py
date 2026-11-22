#!/usr/bin/env python3
"""Second-by-second trace of one mech in one recorded showdown (data only).
usage: sd_trace.py TEAM SEED T0 T1 [step_s] [OTHER,OTHER...]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sd_load
team, seed, t0, t1 = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
step = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
others = sys.argv[6].split(',') if len(sys.argv) > 6 else []
r = [x for x in sd_load.load() if x['seed'] == seed][0]
me = sd_load.idx(r, team)
oi = [sd_load.idx(r, o) for o in others]
names = [m['name'] for m in r['hdr']['mechs']]
WK = ['gun', 'mortar', 'laser', 'lightning']
prev = None
evq = []
nxt = t0
for f in r['frames']:
    t = f['t'] / 20.0
    for e in f.get('ev', []):
        if e.get('id') == me and e['e'] in ('fire', 'charge', 'laser', 'zap'): evq.append(e['e'] + (':' + e.get('w', '') if e['e'] == 'fire' else ''))
        if e['e'] == 'hit' and e['dst'] == me: evq.append('HIT<-%s(%s %d)' % (names[e['src']] if e['src'] < 16 else 'drone', e.get('w'), e['amt']))
        if e['e'] == 'hit' and e['src'] == me: evq.append('hit->%s(%s %d)' % (names[e['dst']] if e['dst'] < 16 else ('drone' if e['dst'] < 1000 else 'crate'), e.get('w'), e['amt']))
    rows = {row[0]: row for row in f['m']}
    a = rows.get(me)
    if a is None: continue
    if t < t0 - 1e-6:
        prev = (t, a); evq = []; continue
    if t > t1: break
    if t + 1e-6 >= nxt:
        sp = math.hypot(a[1] - prev[1][1], a[2] - prev[1][2]) / max(1e-6, t - prev[0]) if prev else 0
        fl = ('G' if a[8] & 1 else 'A') + ('B' if a[8] & 2 else '-') + ('C' if a[8] & 4 else '-')
        ot = ''
        for o in oi:
            b = rows.get(o)
            if b and b[6] > 0:
                dd = math.hypot(a[1] - b[1], a[2] - b[2])
                brg = math.atan2(b[2] - a[2], b[1] - a[1])
                off = abs((a[4] - brg + math.pi) % (2 * math.pi) - math.pi)
                their = abs((b[4] - (brg + math.pi) + math.pi) % (2 * math.pi) - math.pi)
                ot += ' | %s %.0fm hp%d ourAimOff %.1f theirAimOff %.1f' % (names[o][:10], dd, b[6], off, their)
        print('%6.1f pos (%6.0f,%6.0f,%5.1f) v %4.1f yaw %5.2f pit %5.2f hp %4d/%4d en %3d %s cubes %2d w %s+%s%s  %s' % (
            t, a[1], a[2], a[3], sp, a[4], a[5], a[6], a[10], a[7], fl, a[9], WK[a[11]] if a[11] >= 0 else '-', WK[a[12]] if a[12] >= 0 else '-', ot, ' '.join(evq)[:150]))
        evq = []
        nxt += step
        prev = (t, a)
