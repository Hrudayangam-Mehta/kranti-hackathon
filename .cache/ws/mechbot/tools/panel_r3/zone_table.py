#!/usr/bin/env python3
"""Zone arithmetic from the real config (notes/hello_example.json). Stdlib only.
Prints: phase timeline, edge speed bounds, crossing times, hp cost per metre outside,
excursion cost with and without regen, laser-band fit by radius, final-shrink exit times."""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.abspath(os.path.join(HERE, '..', '..'))
cfg = json.load(open(os.path.join(P, 'notes', 'hello_example.json')))
cfg = cfg.get('config', cfg)
Z = cfg['zone']; M = cfg['mech']
walk, boost = M['walk_speed'], M['boost_speed']
regen, rdelay = M['regen_per_s'], M['regen_delay']

print('## Phase timeline (circle that is CURRENT during the window; dps applies hold+shrink)')
t = 0.0; R = Z['start_radius']
rows = []
for i, ph in enumerate(Z['phases']):
    h0, h1 = t, t + ph['hold_s']; s1 = h1 + ph['shrink_s']
    dR = R - ph['radius']
    vr = dR / ph['shrink_s']
    vmax = 2 * dR / ph['shrink_s']          # radius + worst-case centre motion (|dc| <= dR)
    cross = 2 * dR                          # worst-case edge-of-current to edge-of-next distance
    rows.append((i, h0, h1, s1, R, ph['radius'], ph['dps'], vr, vmax, cross))
    t = s1; R = ph['radius']
print('ph | hold s     | shrink s   | R now -> next | dps | edge v (r only / worst) m/s | worst cross m: walk s / boost s | hp per m outside walk / boost')
for (i, h0, h1, s1, R0, R1, dps, vr, vmax, cross) in rows:
    print(f'{i} | {h0:5.0f}-{h1:5.0f} | {h1:5.0f}-{s1:5.0f} | {R0:4.0f} -> {R1:4.0f} | {dps:3d} | {vr:4.1f} / {vmax:4.1f} | {cross:4.0f}: {cross/walk:5.1f} / {cross/boost:5.1f} | {dps/walk:5.1f} / {dps/boost:5.1f}')

print('\n## Excursion cost outside the zone, s seconds (hp). in-fight = zone only; healing = zone + lost regen incl. the 5 s restart')
print('dps | s=3: fight / heal | s=5 | s=10 | s=15 | max s for 300 hp (fight) | max s for 20% of 1400')
for (i, *_rest) in rows:
    dps = rows[i][6]
    cells = []
    for s in (3, 5, 10, 15):
        cells.append(f'{dps*s:5.0f} / {dps*s + regen*(s+rdelay):5.0f}')
    print(f'{dps:3d} | ' + ' | '.join(cells) + f' | {300/dps:4.1f} | {280/dps:4.1f}')

print('\n## Laser band fit: largest distance to a mech sitting at f*R from the centre while we keep m metres inside the edge')
for R in (560, 380, 240, 140, 70, 25):
    out = []
    for f in (0.0, 0.41, 0.8):
        for m in (8, 15):
            out.append(f'f{f:.2f}/m{m}:{f*R + R - m:5.0f}')
    print(f'R={R:3d}: ' + '  '.join(out))

print('\n## Final shrink (390-415 s, r = 25 -> 0, centre c5 -> c6 at rho m/s). Exit time and E cost of standing off the final point')
def exit_time(off, ang, rho):
    # we stand still at offset `off` from c6 at angle `ang` measured from the c6->c5 direction
    # centre at time u in [0,25]: c(u) = c6 + (c5-c6)*(1-u/25); radius 25-u. Inside while |p - c(u)| <= 25-u
    px, py = off * math.cos(ang), off * math.sin(ang)
    lo, hi = 0.0, 25.0
    def inside(u):
        cx = 25 * rho * (1 - u / 25.0)    # |c5-c6| = 25*rho, along +x
        return math.hypot(px - cx, py) <= 25 - u
    if not inside(0):
        return 390.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if inside(mid): lo = mid
        else: hi = mid
    return 390 + lo
for rho in (0.0, 0.33, 0.67, 0.9):
    cells = []
    for off in (0, 2.5, 5, 10):
        e_to = exit_time(off, 0.0, rho)        # toward the old centre c5
        e_aw = exit_time(off, math.pi, rho)    # away from it
        cells.append(f'd{off:4.1f}: toward c5 -{(415-e_to)*260:5.0f} / away -{(415-e_aw)*260:5.0f}')
    print(f'rho={rho:.2f}: ' + ' | '.join(cells))
print('(E = hp - 260 x (415 - exit time); same-E ties share a place)')
