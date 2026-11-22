"""Arithmetic behind notes/panel_r3_levers.md (stdlib only, deterministic)."""
import math, random
random.seed(7)
# 1. best of N draws: E[max of N standard normals] by simulation
def emax(n, k=40000):
    s = 0.0
    for _ in range(k):
        s += max(random.gauss(0, 1) for _ in range(n))
    return s / k
print('best-of-N gain (x sigma_draw):')
for n in (1, 2, 4, 8, 16, 24, 32, 48):
    e = emax(n, 20000 if n < 32 else 8000)
    print(f'  N={n:2d}  E[max]={e:.2f}  gain at sd 0.15: {0.15*e:+.2f}  at 0.20: {0.20*e:+.2f}  at 0.27: {0.27*e:+.2f}')
# 2. board steps
print('board steps: 1/48 =', round(1/48, 4), '; 5.33 =', round(256/48, 4), '; next 5.35 =', round(257/48, 4))
# 3. house hunter DPS by range (gun obs-gated 0.30 s, duty 0.75, no gun while charging; laser 315 / 2.7 s at 67%)
hit = {'<75': 1.0, '75-100': 0.86, '100-126': 0.57, '126-151': 0.32, '151-200': 0.2}
for band, h in hit.items():
    gun = 45 / 0.30 * 0.75 * h
    las = 315 / 2.7 * 0.67
    print(f'  hunter at {band:8s} m: gun {gun:5.1f} dps, gun while not charging {gun*0.7:5.1f} + laser {las:4.1f} = {gun*0.7+las:5.1f} dps')
# 4. zone phases: dps, time to lose 25% / 50% of 1400 HP
for ph, (dps, win) in enumerate([(20, '0-110'), (35, '110-195'), (60, '195-265'), (100, '265-325'), (160, '325-375'), (260, '375-415')], 1):
    print(f'  phase {ph} ({win} s) {dps:3d} dps: 350 HP in {350/dps:5.1f} s, 700 HP in {700/dps:5.1f} s')
# 5. shadow corridor: B shoots at us, A between; hit radius 2.8 m (2.5 + 0.3) scaled by A's cubes
for dBA in (30, 50, 80):
    for s in (50, 100):
        for cubes in (0, 5):
            r = 2.5 * (1 + 0.05 * cubes) + 0.3
            hw = r * (dBA + s) / dBA
            print(f'  B->A {dBA:3d} m, A->us {s:3d} m, A cubes {cubes}: corridor half-width at us {hw:5.1f} m')
# 6. pull-through: ImagineLosing-type score hp + 4*d (+600 if no line of fire); switch to Y when lower
for hp_us, hp_y in ((1400, 1400), (700, 1400), (1400, 700)):
    # hidden us: score_us = hp_us + 4 d_us + 600; Y visible: hp_y + 4 d_y
    # switch when d_y < d_us + (hp_us - hp_y + 600)/4
    print(f'  hp us {hp_us}, hp Y {hp_y}: X switches to Y when d(X,Y) < d(X,us) + {(hp_us - hp_y + 600)/4:.0f} m (we hidden); '
          f'{(hp_us - hp_y)/4:+.0f} m (we visible)')
# 7. late zone bleed of a stand-off hunter (holds 100-150 m from us while we sit on the centre)
for t0, R, dps in ((310, 105, 100), (325, 70, 160), (362, 47, 160), (390, 25, 260)):
    for d in (100, 150):
        out = d - R
        print(f'  t {t0} s circle {R:3d} m dps {dps}: hunter at {d} m from centre is {out:3d} m outside, 1400 HP lasts {1400/dps:4.1f} s')
# 8. friendly-fire geometry (practice): chance two hunters are aligned within the corridor by accident
for d_near in (60, 100, 150):
    half = math.degrees(math.atan(2.8 / d_near))
    print(f'  near hunter at {d_near} m subtends +-{half:.1f} deg: accidental alignment in a 120 deg sector {2*half/120:.1%}')
