#!/usr/bin/env python3
"""Panel R5 arithmetic behind notes/panel_r5_research.md (stdlib only; config numbers from notes/hello_example.json).

1. Linear-lead dodge: lateral deviation from the shooter's constant-velocity extrapolation after a velocity
   change made at the moment of fire (brake, start, reverse), and the flight time / range at which it exceeds
   the hit radius (2.5 m body + 0.3 m bullet).
2. Stop-and-go cycle: worst-case deviation over all fire phases for a periodic speed profile.
3. Attack-Value (Smith's rule) ordering versus the R3a2 focus cost on a two-hunter example.
4. Partial-lead coverage against a strafer that reverses at random (GuessFactor idea), Monte Carlo.
"""
import math, random

A = 58.5      # ground_accel m/s^2
V = 11.7      # walk_speed m/s
VB = 19.5     # boost_speed
BUL = 252.0   # gun speed m/s
R_HIT = 2.8   # 2.5 body radius + 0.3 bullet radius


def pos_profile(v_of_t, T, dt=0.001):
    x, t = 0.0, 0.0
    while t < T:
        x += v_of_t(t) * dt
        t += dt
    return x


def ramp(v0, v1, t):
    """velocity at time t when commanding v1 from v0 with acceleration A"""
    d = v1 - v0
    tt = abs(d) / A
    if t >= tt:
        return v1
    return v0 + math.copysign(A * t, d)


def deviation(kind, T, v=V):
    if kind == 'brake':
        actual = pos_profile(lambda t: ramp(v, 0.0, t), T); pred = v * T
    elif kind == 'start':
        actual = pos_profile(lambda t: ramp(0.0, v, t), T); pred = 0.0
    elif kind == 'reverse':
        actual = pos_profile(lambda t: ramp(v, -v, t), T); pred = v * T
    return abs(pred - actual)


def first_miss_T(kind, v=V):
    T = 0.0
    while T < 2.0:
        if deviation(kind, T, v) >= R_HIT:
            return T
        T += 0.005
    return None


print('1. Velocity change at the fire tick: flight time and range at which a linear-lead bullet misses')
for kind in ('brake', 'start', 'reverse'):
    for v, name in ((V, 'walk'), (VB, 'boost')):
        T = first_miss_T(kind, v)
        print(f'   {kind:8s} {name:5s}: miss from flight {T:.3f} s = range {T * BUL:5.1f} m')

# 2. periodic speed profile: accelerate to V, cruise c, brake to 0, stand s (one direction, no reversal)
def cycle_v(t, c, s):
    ta = V / A
    per = 2 * ta + c + s
    u = t % per
    if u < ta:
        return A * u
    if u < ta + c:
        return V
    if u < 2 * ta + c:
        return V - A * (u - ta - c)
    return 0.0


def dev_at(t0, c, s, T):
    v0 = cycle_v(t0, c, s)
    x, t = 0.0, 0.0
    while t < T:
        x += cycle_v(t0 + t, c, s) * 0.001
        t += 0.001
    return abs(v0 * T - x)


def phase_stats(c, s, T):
    ta = V / A
    per = 2 * ta + c + s
    devs = [dev_at(per * k / 120, c, s, T) for k in range(120)]
    miss = sum(1 for d in devs if d >= R_HIT) / len(devs)
    synced = min(dev_at(ta + c, c, s, T), dev_at(2 * ta + c + s, c, s, T))   # fire tick = brake start / start of acceleration
    return miss, synced, per


print('2. Stop-and-go (no reversal). open loop = share of random fire phases that miss; synced = fire tick at brake / start')
for c, s in ((0.1, 0.1), (0.2, 0.1), (0.3, 0.2)):
    for rng in (85, 100, 115, 130, 150):
        T = rng / BUL + 0.05      # +1 tick: the shooter leads with the velocity of its last observation
        miss, synced, per = phase_stats(c, s, T)
        mean_v = (V * (V / A) + V * c) / per
        print(f'   cruise {c:.1f} stand {s:.1f} (period {per:.2f} s, mean {mean_v:4.1f} m/s) range {rng:3d} m: '
              f'open-loop miss {miss:4.2f}, synced worst dev {synced:4.2f} m ({"miss" if synced >= R_HIT else "hit"})')

# 3. Attack-Value example: two hunters at 110 m
def house_dps(has_laser, rng_hit):
    gun = 45 / 0.30 * rng_hit           # house cadence 0.30 s, hit prob at range (D1 table: 100-126 m 57%)
    las = 315 / 2.4 * 0.67 if has_laser else 0.0   # 2.4 s cycle, 4 of 6 hits in the stream
    return gun + las

our_dps = 150 * 0.6 + 129             # our gun burst x hit prob + full-charge laser DPS
H = [('A gun+laser 1400 hp', True, 1400.0), ('B gun-only 900 hp', False, 900.0)]
print('3. Attack-Value (Smith rule: kill highest threat/time-to-kill first) at 110 m')
for name, las, hp in H:
    a = house_dps(las, 0.57)
    ttk = hp / our_dps
    print(f'   {name}: threat {a:5.1f} dps, ttk {ttk:4.1f} s, priority a/ttk {a / ttk:5.1f}; R3a2 focus cost = d + {0.1 * hp:.0f}')
for order in ((0, 1), (1, 0)):
    t, dmg = 0.0, 0.0
    alive = [True, True]
    for i in order:
        ttk = H[i][2] / our_dps
        dps_now = sum(house_dps(H[j][1], 0.57) for j in range(2) if alive[j])
        dmg += dps_now * ttk; t += ttk; alive[i] = False
    print(f'   order {"".join("AB"[i] for i in order)}: damage taken to kill both {dmg:6.0f} hp in {t:4.1f} s')

# 4. partial lead against a reversing strafer
print('4. Gun hit rate against a 9.95 m/s strafer, reversal interval U(0.8,1.4) s, by lead fraction and flight time')
random.seed(7)
def sim_hit(T, frac, since_bucket=None, n=4000):
    hits = 0
    for _ in range(n):
        interval = random.uniform(0.8, 1.4)
        since = random.uniform(0, interval) if since_bucket is None else min(interval - 1e-3, random.uniform(*since_bucket))
        left = interval - since
        v0, x, t = 9.95, 0.0, 0.0
        v, sign, nxt = v0, 1, left
        while t < T:
            if t >= nxt:
                sign = -sign; nxt += random.uniform(0.8, 1.4)
            target = sign * v0
            v = v + max(-A * 0.002, min(A * 0.002, target - v))
            x += v * 0.002; t += 0.002
        if abs(x - frac * v0 * T) < R_HIT:
            hits += 1
    return hits / n
for rng in (100, 130, 160):
    T = rng / BUL + 0.05
    row = ' '.join(f'{f:.1f}:{sim_hit(T, f):.2f}' for f in (1.0, 0.8, 0.6, 0.4))
    print(f'   {rng} m (T {T:.2f} s) lead fraction:hit  {row}')
for rng in (130, 160):
    T = rng / BUL + 0.05
    for b in ((0.0, 0.3), (0.8, 1.4)):
        row = ' '.join(f'{f:.1f}:{sim_hit(T, f, b):.2f}' for f in (1.0, 0.6, 0.2))
        print(f'   {rng} m, time since reversal {b[0]:.1f}-{b[1]:.1f} s: {row}')
