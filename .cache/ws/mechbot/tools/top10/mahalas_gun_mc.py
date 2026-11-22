# Scratch model (clean room): hit chance of a 252 m/s bullet against a mech moving the way the
# Mahalas study describes (sideways strafe, reversal every U(0.45,0.95) s with p=0.85, boost on a
# fixed match-clock phase, half speed for 0.75 s of every 2.4 s laser cycle), versus steady legs.
# Shooter leads with the velocity it observed at its last decision (10 Hz), shot leaves 0.05 s later.
import math, random, sys
R = 2.5; V = 252.0; TICK = 0.05; SPREAD_SD = math.radians(0.6)
def boost_on(t): return math.sin(1.3 * t) > 0.3
def make_track(seed, T=60.0, steady=False, speed=11.7, charge_cycle=True):
    rnd = random.Random(seed); xs = []; x = 0.0; d = 1.0; nxt = 0.0; vs = []
    t = 0.0; phase0 = rnd.random() * 2.4
    while t < T:
        if not steady and t >= nxt:
            if rnd.random() < 0.85: d = -d
            nxt = t + 0.45 + 0.5 * rnd.random()
        s = (19.5 if boost_on(t) else 11.7) if not steady else speed
        if charge_cycle and ((t + phase0) % 2.4) < 0.75: s *= 0.5
        v = d * s; xs.append(x); vs.append(v); x += v * TICK; t += TICK
    return xs, vs
def sim(D, lead_k, steady=False, speed=11.7, phase_aware=False, n=40, charge_cycle=True):
    hits = shots = 0
    tof = D / V
    for seed in range(n):
        xs, vs = make_track(seed * 7 + 1, steady=steady, speed=speed, charge_cycle=charge_cycle)
        rnd = random.Random(seed + 999)
        for i in range(40, len(xs) - 200, 5):          # one shot every 0.25 s
            obs_i = i - 2                                  # velocity seen at last decision
            t_fire = i * TICK
            if phase_aware:
                # skip a shot whose flight would cross a boost on/off edge of the match clock
                if boost_on(t_fire) != boost_on(t_fire + tof + 0.1): continue
            lead = vs[obs_i] * (tof + 0.1) * lead_k
            aim = xs[obs_i] + lead
            k = i + int(round(tof / TICK))
            err = abs(xs[k] - aim) + abs(rnd.gauss(0, SPREAD_SD * D))
            shots += 1; hits += err < R
    return hits / max(shots, 1), shots
for D in (55, 115, 150):
    row = [D]
    for k in (0.0, 0.78, 1.0): row.append('%.2f' % sim(D, k)[0])
    row.append('%.2f' % sim(D, 1.0, phase_aware=True)[0])
    row.append('%.2f' % sim(D, 1.0, steady=True, speed=11.7, charge_cycle=False)[0])
    row.append('%.2f' % sim(D, 1.0, steady=True, speed=19.5, charge_cycle=False)[0])
    row.append('%.2f' % sim(D, 1.0, steady=True, speed=11.7, charge_cycle=True)[0])
    print('D=%d  strafe: lead0 %s lead0.78 %s lead1 %s lead1+phase %s | steady 11.7 %s steady 19.5 %s steady+charge %s' % tuple(row))
