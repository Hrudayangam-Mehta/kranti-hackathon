#!/usr/bin/env python3
"""Gun and laser fire discipline of one team in the recorded showdowns: at what range it opens fire,
how often its rounds hit, and what the target was doing.  Data only.  usage: sd_gun.py TEAM"""
import sys, os, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sd_load
team = sys.argv[1]
d = sd_load.load()
def wrap(a): return (a + math.pi) % (2 * math.pi) - math.pi
B = lambda x: '0-45' if x < 45 else '45-75' if x < 75 else '75-100' if x < 100 else '100-125' if x < 125 else '125-150' if x < 150 else '150-200' if x < 200 else '200+'
shots = collections.Counter(); hits = collections.Counter(); chg = collections.Counter(); lh = collections.Counter()
maxfire = []; chg_r = []
tgt_speed_hit = []; 
for r in d:
    me = sd_load.idx(r, team)
    if me < 0: continue
    rows = {}
    pend = []   # (t, target, bucket) of gun rounds in flight
    for f in r['frames']:
        t = f['t'] / 20.0
        for row in f['m']: rows[row[0]] = row
        a = rows.get(me)
        for e in f.get('ev', []):
            if e['e'] == 'fire' and e['id'] == me and e.get('w') == 'gun' and a:
                # which mech is the aim on? (smallest yaw offset under 0.15 rad, alive)
                best = None
                for j, b in rows.items():
                    if j == me or j >= 16 or b[6] <= 0: continue
                    dd = math.hypot(b[1] - a[1], b[2] - a[2])
                    off = abs(wrap(math.atan2(b[2] - a[2], b[1] - a[1]) - a[4]))
                    if off < 0.15 and dd < 320 and (best is None or off < best[0]): best = (off, j, dd)
                if best:
                    shots[B(best[2])] += 1; maxfire.append(best[2]); pend.append((t, best[1], B(best[2])))
            elif e['e'] == 'hit' and e['src'] == me and e.get('w') == 'gun' and e['dst'] < 16:
                # credit the oldest pending round at that target
                for i, (tp, j, bk) in enumerate(pend):
                    if j == e['dst'] and t - tp < 1.6:
                        hits[bk] += 1; pend.pop(i); break
            elif e['e'] == 'charge' and e['id'] == me and a:
                best = None
                for j, b in rows.items():
                    if j == me or j >= 16 or b[6] <= 0: continue
                    dd = math.hypot(b[1] - a[1], b[2] - a[2])
                    off = abs(wrap(math.atan2(b[2] - a[2], b[1] - a[1]) - e['yaw']))
                    if off < 0.25 and dd < 300 and (best is None or off < best[0]): best = (off, j, dd)
                if best: chg[B(best[2])] += 1; chg_r.append(best[2])
            elif e['e'] == 'hit' and e['src'] == me and e.get('w') == 'laser' and e['dst'] < 16:
                b = rows.get(e['dst'])
                if a and b: lh[B(math.hypot(b[1] - a[1], b[2] - a[2]))] += 1
        pend = [p for p in pend if t - p[0] < 1.6]
print('=====', team)
print('gun rounds fired with the aim on a mech, by range, and share that hit:')
for k in ['0-45', '45-75', '75-100', '100-125', '125-150', '150-200', '200+']:
    if shots[k]: print('   %-8s rounds %4d hits %4d = %3.0f%%' % (k, shots[k], hits[k], 100.0 * hits[k] / shots[k]))
mf = sorted(maxfire)
if mf: print('gun open-fire range: median %.0f q90 %.0f q98 %.0f max %.0f m (n=%d)' % (mf[len(mf) // 2], mf[int(len(mf) * .9)], mf[int(len(mf) * .98)], mf[-1], len(mf)))
print('laser charges started with a mech within 0.25 rad of the aim, by range:', dict(chg), '| laser hits on mechs by range:', dict(lh))
cr = sorted(chg_r)
if cr: print('laser charge-start range: median %.0f q90 %.0f max %.0f m (n=%d)' % (cr[len(cr) // 2], cr[int(len(cr) * .9)], cr[-1], len(cr)))
