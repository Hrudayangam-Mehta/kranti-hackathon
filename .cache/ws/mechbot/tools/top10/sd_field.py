#!/usr/bin/env python3
"""Field baselines from the recorded showdowns: how often a laser beam aimed at a mech lands (by shooter
team and by target team), time from charge to release, life span, and torso spin when idle.  Data only."""
import sys, os, math, collections, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sd_load
d = sd_load.load()
def wrap(a): return (a + math.pi) % (2 * math.pi) - math.pi
sh = collections.defaultdict(lambda: [0, 0]); tg = collections.defaultdict(lambda: [0, 0])
ctf = collections.defaultdict(list); spin = collections.defaultdict(list); rear = collections.defaultdict(lambda: [0, 0])
for r in d:
    names = [m['name'] for m in r['hdr']['mechs']]
    rows = {}; prev = {}; lastc = {}; lastdmg = collections.defaultdict(lambda: -99)
    for f in r['frames']:
        t = f['t'] / 20.0
        prev = dict(rows)
        for row in f['m']: rows[row[0]] = row
        for e in f.get('ev', []):
            if e['e'] == 'hit' and e.get('src') is not None and e['dst'] < 16:
                lastdmg[e['dst']] = t
                if e['src'] < 16: lastdmg[e['src']] = t
                # rear hit? compare beam/bullet origin bearing with the victim torso yaw
                if e['src'] < 16 and e['src'] in rows and e['dst'] in rows and e.get('w') in ('laser', 'gun'):
                    v, s = rows[e['dst']], rows[e['src']]
                    off = abs(wrap(math.atan2(s[2] - v[2], s[1] - v[1]) - v[4]))
                    rear[names[e['dst']]][1] += 1; rear[names[e['dst']]][0] += off > math.pi / 2
            if e['e'] == 'charge' and e['id'] < 16: lastc[e['id']] = t
            if e['e'] == 'laser' and e['id'] < 16:
                i = e['id']
                if i in lastc: ctf[names[i]].append(t - lastc.pop(i))
                fx, fy = e['from'][0], e['from'][1]; yaw = math.atan2(e['to'][1] - fy, e['to'][0] - fx)
                best = None
                for j, b in rows.items():
                    if j == i or j >= 16 or b[6] <= 0: continue
                    dd = math.hypot(b[1] - fx, b[2] - fy)
                    off = abs(wrap(math.atan2(b[2] - fy, b[1] - fx) - yaw))
                    if dd < 285 and off < 0.10 and (best is None or off < best[0]): best = (off, j)
                hm = [h for h in (e.get('hits') or []) if h < 16]
                if hm:
                    sh[names[i]][0] += 1; sh[names[i]][1] += 1; tg[names[hm[0]]][0] += 1; tg[names[hm[0]]][1] += 1
                elif best and not (e.get('hits') or []):
                    sh[names[i]][1] += 1; tg[names[best[1]]][1] += 1
        for i, a in rows.items():
            if i < 16 and a[6] > 0 and i in prev and t - lastdmg[i] > 3:
                spin[names[i]].append(abs(wrap(a[4] - prev[i][4])) / 0.1)
tot_s = [sum(v[0] for v in sh.values()), sum(v[1] for v in sh.values())]
print('field: beams aimed at a mech that hit: %d of %d = %.0f%%' % (tot_s[0], tot_s[1], 100.0 * tot_s[0] / tot_s[1]))
print('\nas SHOOTER (hit/aimed), charge->release median, idle torso: share of frames turning faster than 2 rad/s:')
for n in sorted(sh, key=lambda n: -sh[n][1]):
    if sh[n][1] >= 8:
        sp = spin.get(n, [0])
        print('  %-26s %3d/%3d = %3.0f%%  charge->release med %.2f s  idle spin>2rad/s %3.0f%%' % (n, sh[n][0], sh[n][1], 100.0 * sh[n][0] / sh[n][1], statistics.median(ctf[n]) if ctf[n] else float('nan'), 100.0 * sum(1 for x in sp if x > 2) / max(1, len(sp))))
print('\nas TARGET (hit/aimed) and share of gun+laser hits taken in the rear arc:')
for n in sorted(tg, key=lambda n: -tg[n][1]):
    if tg[n][1] >= 8:
        print('  %-26s %3d/%3d = %3.0f%%   rear hits %3d/%4d = %2.0f%%' % (n, tg[n][0], tg[n][1], 100.0 * tg[n][0] / tg[n][1], rear[n][0], rear[n][1], 100.0 * rear[n][0] / max(1, rear[n][1])))
