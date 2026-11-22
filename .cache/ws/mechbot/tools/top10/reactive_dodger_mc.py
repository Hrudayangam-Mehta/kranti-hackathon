# Our own Monte Carlo (no third-party code): gun aim rules against a generic "random-reversal strafer that also
# sidesteps visible bullets". 1-D lateral model of the target:
#   - walks sideways at V with acceleration limit A, decisions every 0.1 s;
#   - baseline direction reverses at random intervals U(lo, hi);
#   - each bullet in flight that would pass within TRIG metres of its current position within HORIZON seconds adds
#     a push away from the bullet's pass point; pushes outweigh the baseline (weight WD each against WS).
# Shooter: 12 shots at 0.24 s spacing, then 2.4 s pause; sees the target state one decision late; Gaussian angular
# spread SIGMA_DEG. Hit when the bullet passes within R of the target at arrival.
# Aim rules: lead1 = first-order lead; model = acceleration-limited motion toward the observed commanded direction;
#            ahead(d) = observed position + d metres in the direction of the observed commanded motion (no time lead).
#   python3 -I tools/top10/reactive_dodger_mc.py
import random, math
V, A, DT, R = 11.7, 58.5, 0.01, 2.8
TRIG, HORIZON, WS, WD = 4.5, 1.2, 0.9, 1.5
SIGMA_DEG = 0.6
def predict(x, v, sign, tt):
    t = 0.0
    while t < tt - 1e-9:
        v += max(-A * DT, min(A * DT, sign * V - v)); x += v * DT; t += DT
    return x
def run(rule, dist, lo=0.35, hi=1.15, reactive=True, shots=6000, seed=5, par=0.0):
    rng = random.Random(seed)
    T = dist / 252.0
    t = 0.0; x = 0.0; v = V; base = 1.0; cmd = 1.0
    nextflip = lo + rng.random() * (hi - lo)
    bullets = []  # (arrival time, lateral aim point)
    obs = (x, v, cmd)
    next_shot = 0.0; in_mag = 12; hits = 0; fired = 0
    dec_every = int(round(0.1 / DT)); k = 0
    while fired < shots:
        if k % dec_every == 0:
            # target decision
            if t > nextflip:
                base = -base; nextflip = t + lo + rng.random() * (hi - lo)
            push = 0.0
            if reactive:
                for (ta, xa) in bullets:
                    if 0 < ta - t < HORIZON and abs(xa - x) < TRIG:
                        push += -1.0 if xa > x else 1.0
            s = WS * base + WD * push
            cmd = 0.0 if abs(s) < 1e-9 else (1.0 if s > 0 else -1.0)
            # shooter decision (uses the state observed at the previous decision)
            ox, ov, oc = obs
            if t >= next_shot:
                tt = T + 0.2
                if rule == 'lead1': aim = ox + ov * tt
                elif rule == 'model': aim = predict(ox, ov, oc, tt)
                else: aim = ox + ov * 0.1 + (oc if oc != 0 else (1.0 if ov >= 0 else -1.0)) * par
                aim += rng.gauss(0, math.radians(SIGMA_DEG)) * dist
                bullets.append((t + T + 0.05, aim)); fired += 1; in_mag -= 1
                next_shot = t + 0.24
                if in_mag == 0: in_mag = 12; next_shot = t + 2.4
            obs = (x, v, cmd)
        v += max(-A * DT, min(A * DT, cmd * V - v)); x += v * DT; t += DT; k += 1
        keep = []
        for (ta, xa) in bullets:
            if ta <= t:
                hits += abs(xa - x) < R
            else: keep.append((ta, xa))
        bullets = keep
    return hits / fired
print('hit rates; target reverses every 0.35-1.15 s; columns = range 60, 80, 100, 130 m')
for reactive in (False, True):
    print(' target sidesteps bullets:' , reactive)
    for rule, par in (('lead1', 0), ('model', 0), ('ahead', 0.0), ('ahead', 1.0), ('ahead', 1.5), ('ahead', 2.0), ('ahead', 3.0)):
        row = [run(rule, d, reactive=reactive, par=par) for d in (60, 80, 100, 130)]
        print('   %-10s %s' % (rule + ('' if rule != 'ahead' else ' %.1f m' % par), ' '.join('%.2f' % r for r in row)))
print('same, target reverses every 0.8-1.6 s and sidesteps bullets')
for rule, par in (('lead1', 0), ('model', 0), ('ahead', 1.5), ('ahead', 2.0)):
    row = [run(rule, d, lo=0.8, hi=1.6, par=par) for d in (60, 80, 100, 130)]
    print('   %-10s %s' % (rule + ('' if rule != 'ahead' else ' %.1f m' % par), ' '.join('%.2f' % r for r in row)))
