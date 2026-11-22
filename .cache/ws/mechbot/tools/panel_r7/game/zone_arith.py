# Panel R7 game lens: zone schedule anchors (fractions of the config's zone total) and first-rotation geometry.
# Toy geometry: spawn uniform in the disc of spawn_zone_fraction x start radius; next centre uniform in the disc of
# (R0 - r1) around the start centre (the next circle lies inside the current one). Map bounds ignored. [A]
import json, math, random, sys
h = json.load(open(sys.argv[1]))
c = h['config']; z = c['zone']; ph = z['phases']; m = c['match']
T = 0.0; rows = []; R = z['start_radius']
for i, p in enumerate(ph):
    a, b = T + p['hold_s'], T + p['hold_s'] + p['shrink_s']
    rows.append((i + 1, T, a, b, R, p['radius'], p['dps'])); T = b; R = p['radius']
print('zone total %.0f s' % T)
for i, t0, a, b, r0, r1, d in rows:
    print('phase %d: hold %.0f-%.0f (tau %.3f-%.3f) shrink -%.0f (tau %.3f)  r %d->%d  dps %d  edge speed %.1f m/s' % (i, t0, a, t0 / T, a / T, b, b / T, r0, r1, d, (r0 - r1) / (b - a)))
for t in c['drops']['times']:
    print('drop called %.0f (tau %.3f) lands %.0f (tau %.3f)' % (t, t / T, t + c['drops']['fall_s'], (t + c['drops']['fall_s']) / T))
R0 = z['start_radius']; r1 = ph[0]['radius']; sf = m['spawn_zone_fraction']
random.seed(7); N = 200000; far = 0; deep = 0; dist = []
for _ in range(N):
    u = math.sqrt(random.random()) * sf * R0; a = random.random() * 2 * math.pi
    v = math.sqrt(random.random()) * (R0 - r1); b = random.random() * 2 * math.pi
    d = math.hypot(u * math.cos(a) - v * math.cos(b), u * math.sin(a) - v * math.sin(b))
    dist.append(d)
    if d > 0.8 * r1: far += 1
    if d > 0.6 * r1: deep += 1
dist.sort()
print('spawn distance to next centre: median %.0f m, p90 %.0f m' % (dist[N // 2], dist[int(N * 0.9)]))
print('P(spawn beyond 0.8 x next radius = %.0f m: D9 rotation fires in phase 1) = %.2f' % (0.8 * r1, far / N))
print('P(spawn beyond 0.6 x next radius = %.0f m: the D9 goal depth) = %.2f' % (0.6 * r1, deep / N))
# walk needed from 0.8 r1 to 0.6 r1 and its time
print('walk 0.8 r1 -> 0.6 r1 = %.0f m = %.1f s at walk %.1f m/s (x1.3 path %.1f s)' % (0.2 * r1, 0.2 * r1 / c['mech']['walk_speed'], c['mech']['walk_speed'], 0.26 * r1 / c['mech']['walk_speed']))
