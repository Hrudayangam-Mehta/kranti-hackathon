#!/usr/bin/env python3
"""Panel R5 algorithms expert: our gun lead against a house strafer (toy, grounded targets only).

Target: lateral speed 0.85 x 11.7 = 9.95 m/s, reverses after log-normal intervals (median 1.1 s, sigma 0.72: the
replay's p10 0.4 / p50 1.1 / p90 2.7 s, sim/house.js strafeS), accel 58.5 m/s^2 (a reversal takes 0.34 s).
Also a 'walker' target: steady 9.95 m/s for 4-8 s legs (walking to the zone, chasing), to price the cost of a
reduced lead on targets that do not jink.
Us: a shot every 0.25 s, leaves 0.05 s after the obs (latency compensated), 252 m/s, spread 0.6 deg; hit if the
bullet passes within 2.8 m of the axis (lateral error only).
Lead rules (lateral part only; radial lead is exact in every rule):
  full      first-order lead (fraction 1.0)
  v4        fraction 0.5 when the target reversed >= 2 times in the last 2 s (perp speed > 3 m/s sign changes),
            else 1.0 (firecontrol.gunSolve revLeadScale / revCount / revWindow)
  f06       fraction 0.6 always
  steady    fraction 1.0 if the velocity has not changed by > 2 m/s for 1.0 s, else 0.55
  vgun      online virtual gun: every decision a virtual shot with each fraction {0, .25, .5, .75, 1} is scored
            against the target's real position at arrival, per (range band, time-since-last-flip bucket); fire the
            fraction with the most virtual hits in that cell (decayed counts), 1.0 until 20 samples and on ties
            (another fraction must beat 1.0 by 5%)
Run: python3 -I -B lead_model.py
"""
import math
import random

TICK = 0.05
ACC = 58.5
V = 9.95
BUL = 252.0
HITR = 2.8
SPREAD = math.radians(0.6)
FRACS = [0.0, 0.25, 0.5, 0.75, 1.0]


def target_track(rng, seconds, kind):
    """Lateral position and velocity per tick."""
    n = int(seconds / TICK) + 400
    xs, vs = [0.0] * n, [0.0] * n
    x, v, sign = 0.0, V, 1
    nxt = rng.lognormvariate(math.log(1.1), 0.72) if kind == 'strafer' else rng.uniform(4, 8)
    t = 0.0
    for k in range(n):
        if t >= nxt:
            sign = -sign
            nxt = t + (max(0.3, rng.lognormvariate(math.log(1.1), 0.72)) if kind == 'strafer' else rng.uniform(4, 8))
        tgt = sign * V
        d = tgt - v
        dv = ACC * TICK
        v = tgt if abs(d) <= dv else v + dv * (1 if d > 0 else -1)
        x += v * TICK
        xs[k], vs[k] = x, v
        t += TICK
    return xs, vs


def bucket_tsf(tsf):
    return 0 if tsf < 0.3 else 1 if tsf < 0.6 else 2 if tsf < 0.9 else 3


def run(rule, R, kind, seed, seconds=300.0):
    rng = random.Random(seed * 101 + int(R) + (7 if kind == 'walker' else 0))
    xs, vs = target_track(rng, seconds, kind)
    T = R / BUL
    nT = int(round((T + 0.05) / TICK))
    shots = hits = 0
    flips = []
    last_sign = 1
    steady_since = 0.0
    prev_v = vs[0]
    vstat = {}          # (bucket) -> [counts per fraction]
    pending = []        # virtual shots: (arrive_tick, aim offsets per fraction, bucket)
    for k in range(0, int(seconds / TICK), 2):          # our decisions (even ticks)
        t = k * TICK
        x, v = xs[k], vs[k]
        if abs(v) > 3:
            s = 1 if v > 0 else -1
            if s != last_sign:
                flips.append(t)
                last_sign = s
        if abs(v - prev_v) > 2.0:
            steady_since = t
        prev_v = v
        tsf = t - (flips[-1] if flips else -9)
        b = bucket_tsf(tsf)
        # resolve virtual shots
        if rule == 'vgun':
            keep = []
            for (ak, aims, bb) in pending:
                if ak <= k:
                    cnt = vstat.setdefault(bb, [0.0] * len(FRACS))
                    for i, a in enumerate(aims):
                        cnt[i] = cnt[i] * 0.995 + (1.0 if abs(xs[ak] - a) < HITR else 0.0)
                else:
                    keep.append((ak, aims, bb))
            pending = keep
            pending.append((k + nT, [x + v * 0.05 + v * T * f for f in FRACS], b))
        # choose the fraction
        if rule == 'full':
            f = 1.0
        elif rule == 'v4':
            recent = sum(1 for ft in flips[-4:] if t - ft <= 2.0)
            f = 0.5 if recent >= 2 else 1.0
        elif rule == 'f06':
            f = 0.6
        elif rule == 'steady':
            f = 1.0 if t - steady_since >= 1.0 else 0.55
        elif rule == 'vgun':
            cnt = vstat.get(b)
            if cnt is None or sum(cnt) < 20 * 0.5:
                f = 1.0
            else:
                # full lead unless another fraction has 5% more virtual hits in this cell (ties -> full lead)
                bi = len(FRACS) - 1
                for i in range(len(FRACS) - 2, -1, -1):
                    if cnt[i] > cnt[bi] * 1.05:
                        bi = i
                f = FRACS[bi]
        # fire every 0.25 s (every 2.5 decisions: alternate 2 and 3 decisions)
        if (k // 2) % 5 in (0, 2):
            aim = x + v * 0.05 + v * T * f
            err = math.tan(rng.gauss(0, SPREAD)) * R
            arrive = k + nT
            if arrive < len(xs):
                shots += 1
                if abs(xs[arrive] - (aim + err)) < HITR:
                    hits += 1
    return hits / max(1, shots)


def main():
    rules = ['full', 'v4', 'f06', 'steady', 'vgun']
    ranges = [60, 85, 100, 115, 130, 150]
    for kind in ('strafer', 'walker'):
        print('%s target: our gun hit rate by range (lateral error only, spread included; 300 s x 3 seeds)' % kind)
        print('%-8s' % 'rule' + ''.join('%7dm' % r for r in ranges))
        for rule in rules:
            row = '%-8s' % rule
            for R in ranges:
                h = sum(run(rule, R, kind, s) for s in (1, 2, 3)) / 3
                row += '%8.2f' % h
            print(row)
        print()


if __name__ == '__main__':
    main()
