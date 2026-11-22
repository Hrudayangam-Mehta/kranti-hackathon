"""Torso scan pattern while travelling (not engaged): aim yaw relative to movement heading."""
import sys, os, math, collections, json, bisect, gzip
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
R = Replay()
G = json.load(open(os.path.join(OUT, 'gunshots.json')))
TYPES = ['expert', 'hard', 'medium', 'brawler', 'sniper', 'thirdparty', 'farmer']
shot_t = collections.defaultdict(list)
for o in G: shot_t[o['s']].append(o['tf'])
zap_t = collections.defaultdict(list)
for e in R.events:
    if e['e'] in ('zap', 'laser', 'charge') : shot_t[e['id']].append(e['t'])
    if e['e'] == 'fire' and e['w'] == 'mortar': shot_t[e['id']].append(e['t'])
for s in shot_t: shot_t[s].sort()
def quiet(mid, t, w=60):
    lst = shot_t.get(mid, [])
    i = bisect.bisect_left(lst, t - w)
    return not (i < len(lst) and lst[i] <= t + w)
series = collections.defaultdict(list)   # mid -> list of runs; each run list of (t, offset)
for mid in R.ids:
    rows = R.m[mid]; run = []
    for k in range(1, R.nf):
        a, b = rows[k - 1], rows[k]
        ok = a and b and R.ticks[k] - R.ticks[k - 1] == 2 and (b[MFL] & 1) and quiet(mid, R.ticks[k])
        if ok:
            vx, vy = (b[MX] - a[MX]) / 0.1, (b[MY] - a[MY]) / 0.1
            if math.hypot(vx, vy) > 6:
                run.append((R.ticks[k], angdiff(b[MYAW], math.atan2(vy, vx))))
                continue
        if len(run) >= 30: series[mid].append(run)
        run = []
    if len(run) >= 30: series[mid].append(run)
rows = []
allper = []; allamp = []
for ty in ['ALL'] + TYPES:
    offs = []; per = []; amp = []; rate = []
    for mid in R.ids:
        if ty != 'ALL' and R.names[mid] != ty: continue
        for run in series[mid]:
            o = [x[1] for x in run]
            offs += o
            # zero crossings of the offset (with hysteresis 0.1 rad) -> half periods
            last = None; lt = None; ext = 0
            for (t, x) in run:
                sg = 1 if x > 0.1 else -1 if x < -0.1 else 0
                if sg == 0: continue
                if last is not None and sg != last:
                    per.append((t - lt) * TICK * 2); amp.append(ext); ext = 0; lt = t
                if last is None or sg != last: lt = t if lt is None or sg != last else lt
                last = sg; ext = max(ext, abs(x))
            for (t0, x0), (t1, x1) in zip(run, run[1:]):
                if t1 - t0 == 2: rate.append(abs(angdiff(x1, x0)) / 0.1)
    if not offs: continue
    ao = [abs(math.degrees(x)) for x in offs]
    rows.append([ty, len(offs) / 10.0, pct(ao, .5), pct(ao, .9), pct(ao, .99), 100.0 * sum(1 for x in ao if x > 60) / len(ao), 100.0 * sum(1 for x in ao if x > 120) / len(ao), median(per) if per else float('nan'), math.degrees(median(amp)) if amp else float('nan'), math.degrees(median(rate)) if rate else float('nan')])
    if ty == 'ALL': allper, allamp = per, amp
print('## torso aim relative to movement heading while travelling and not fighting (no weapon use within 3 s, speed > 6 m/s, grounded)')
print(table(['type', 'seconds', '|offset| p50 deg', 'p90', 'p99', '% time |offset|>60', '% >120', 'median full sweep period s', 'median sweep amplitude deg', 'median yaw rate deg/s'], rows))
print('  sweep period histogram (s, 1 s bins 0..10):', [sum(1 for p in allper if lo <= p < lo + 1) for lo in range(10)], '>=10:', sum(1 for p in allper if p >= 10))
print('  amplitude histogram (deg, 15 deg bins 0..180):', [sum(1 for a in allamp if lo <= math.degrees(a) < lo + 15) for lo in range(0, 180, 15)])
# example trace
for mid in (5, 9):
    if series[mid]:
        run = max(series[mid], key=len)
        print('  example mech %d (%s) offset deg every 0.2 s:' % (mid, R.names[mid]), [round(math.degrees(x[1])) for x in run[:120:2]])
# coverage: fraction of time each absolute direction relative to heading is inside the 120 deg FOV wedge (aim +-60)
cov = collections.Counter(); n = 0
for mid in R.ids:
    for run in series[mid]:
        for (t, x) in run:
            n += 1
            for b in range(-180, 180, 30):
                c = math.radians(b + 15)
                if abs(angdiff(c, x)) <= math.radians(60): cov[b] += 1
print('  share of travel time a direction (relative to heading, 30 deg bins from -180) lies inside the 120 deg view wedge:')
print('   ', {b: round(100.0 * cov[b] / n) for b in range(-180, 180, 30)})
# longest continuous time the direct rear (150..210 deg off heading) is outside the wedge
gaps = []
for mid in R.ids:
    for run in series[mid]:
        cur = 0
        for (t, x) in run:
            if abs(angdiff(math.pi, x)) > math.radians(60): cur += 0.1
            else:
                if cur > 0: gaps.append(cur)
                cur = 0
        if cur > 0: gaps.append(cur)
print('  continuous intervals during which the exact rear direction is outside the view wedge: median %.1f s p90 %.1f s max %.1f s (n=%d) ; share of travel time rear is unseen: %.0f%%' % (median(gaps), pct(gaps, .9), max(gaps), len(gaps), 100.0 * sum(gaps) * 10 / n))
