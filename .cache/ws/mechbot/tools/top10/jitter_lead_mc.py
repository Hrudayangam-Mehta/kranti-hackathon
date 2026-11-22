# Our own Monte Carlo (no third-party code): how well do gun aim rules hit a mech that strafes sideways at walk
# speed and reverses at random intervals drawn uniformly from [lo, hi] seconds?
# Model: 1-D lateral motion, commanded speed +-V, acceleration limit A, decisions every 0.1 s (a reversal is applied
# at the first decision after its timer runs out). The shooter sees the state of the previous decision; a shot with
# flight time T therefore arrives T + 0.2 s after the observed state. Hit when |x(arrival) - aim| < R
# (body radius 2.5 m + bullet radius 0.3 m; the target's own bullet dodging is NOT modelled).
# Aim rules: first_order = observed position + observed velocity * time; zero = observed position;
#            model = integrate the acceleration-limited motion toward the observed commanded direction, assuming
#                    no further reversal (the commanded direction is read from the sign of the acceleration, or of
#                    the velocity once it is at full speed).
#   python3 -I tools/top10/jitter_lead_mc.py
import random
V, A, DT, R = 11.7, 58.5, 0.01, 2.8
def traj(lo, hi, n, seed):
    rng = random.Random(seed)
    t = 0.0; x = 0.0; v = V; sign = 1.0; nextflip = lo + rng.random() * (hi - lo); lastflip = 0.0
    dec_every = int(round(0.1 / DT)); steps = n * dec_every + int(3 / DT)
    xs = []; dec = []
    for k in range(steps):
        if k % dec_every == 0:
            if t > nextflip:
                sign = -sign; lastflip = t
                nextflip = t + lo + rng.random() * (hi - lo)
            dec.append((k, x, v, sign, round(t - lastflip, 1)))
        v += max(-A * DT, min(A * DT, sign * V - v)); x += v * DT; t += DT
        xs.append(x)
    return xs, dec
def predict_noflip(x, v, sign, tt):
    t = 0.0
    while t < tt - 1e-9:
        v += max(-A * DT, min(A * DT, sign * V - v)); x += v * DT; t += DT
    return x
def evaluate(lo, hi, T, n=60000):
    xs, dec = traj(lo, hi, n, 11)
    tt = T + 0.2
    k_arr = int(round(tt / DT))
    tot = {'first_order': 0, 'zero': 0, 'model': 0}
    by = {}
    cnt = 0
    for i in range(n):
        k, x, v, sign, since = dec[i]
        xa = xs[k + k_arr - 1]
        cnt += 1
        h1 = abs(x + v * tt - xa) < R; h0 = abs(x - xa) < R; hm = abs(predict_noflip(x, v, sign, tt) - xa) < R
        tot['first_order'] += h1; tot['zero'] += h0; tot['model'] += hm
        b = by.setdefault(since, [0, 0, 0, 0]); b[0] += 1; b[1] += hm; b[2] += h1; b[3] += h0
    return {k: round(v / cnt, 2) for k, v in tot.items()}, {s: (round(b[0] / cnt, 2), round(b[1] / b[0], 2), round(b[2] / b[0], 2), round(b[3] / b[0], 2)) for s, b in sorted(by.items())}
for lo, hi, name in ((0.35, 1.15, 'reversals every 0.35-1.15 s'), (0.8, 1.6, 'reversals every 0.8-1.6 s')):
    print('==', name)
    for d in (50, 80, 100, 130, 150):
        T = d / 252.0
        tot, by = evaluate(lo, hi, T)
        good = [s for s, b in by.items() if b[1] >= 0.8]
        share = sum(by[s][0] for s in good)
        hit = sum(by[s][0] * by[s][1] for s in good) / max(1e-9, share)
        print(' range %3d m (flight %.2f s): always-fire hit rate %s' % (d, T, tot))
        print('   by observed time since reversal: {s: (share of time, model, first-order, zero-lead)}')
        print('   ', by)
        print('   gate "fire only when model >= 80%%": seconds since reversal %s -> %.0f%% of the time, hit rate %.2f' % (good, share * 100, hit))
