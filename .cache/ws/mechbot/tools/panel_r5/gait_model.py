#!/usr/bin/env python3
"""Panel R5 algorithms expert: house-bot gun (exact linear lead) against our movement policies.

Model (all numbers from kit/protocol.md, notes/housebot_model.json, notes/mechanics_deep.md):
- 20 ticks/s; both sides decide on even ticks; an action decided on obs E applies from time E on.
- House gun: aims on obs E at our centre + v(E) * tof (first-order intercept, 252 m/s, 3 m muzzle offset),
  bullet leaves at once (consistent with "best-fit reference tick for aim is E"); fires on every decision whose obs
  shows cooldown 0 -> every 6 ticks (0.30 s); 12 rounds then 50 ticks silent; Gaussian yaw spread 0.6 deg.
- Hit: bullet (r 0.3) passes within 2.8 m of our axis. One dimension of our motion: lateral to the shooter line
  (radial errors do not make a centre-aimed bullet miss).
- Us: accel 58.5 m/s^2 (2.925 m/s per tick) toward the commanded lateral velocity; walk 11.7 m/s.
Policies (lateral command each decision):
  strafe      V4 D4 strafe: full walk, reversal every U(0.8, 1.6) s
  strafe+dodge V4 strafe plus a reactive bullet dodge (bullet first seen on the obs after launch, i.e. 0.1 s old;
              candidates keep / reverse / stop over the rest of its flight, take the best if the current one hits,
              hold it 0.3 s) -- a 1-D version of mover.bulletDodge
  stopgo-open move 0.3 s / stand 0.3 s, open loop (phase unrelated to the shooter)
  stopgo-sync toggle move/stand on the decision whose obs the main shooter aims from (known cadence)
  sync+dodge  stopgo-sync with the reactive dodge on top
  sync-err1   stopgo-sync with the cadence estimate one decision late (robustness)
  sync+dodge-err1  sync+dodge one decision late
Second shooter: same range, its own random fire phase (what a sync to shooter 1 does to everyone else).
Run: python3 -I -B gait_model.py  (stdlib only, about 10 s)
"""
import math
import random

TICK = 0.05
ACC = 58.5
DV = ACC * TICK
WALK = 11.7
BUL = 252.0
OFF = 3.0
HITR = 2.8
SPREAD = math.radians(0.6)
DODGE_RR = 2.5 + 1.2


def step_v(v, target):
    d = target - v
    if abs(d) <= DV:
        return target
    return v + DV * (1 if d > 0 else -1)


class Shooter:
    def __init__(self, R, rng, phase):
        self.R = R
        self.rng = rng
        self.next_tick = phase * 2      # even tick of its next aim decision
        self.mag = 12
        self.reload_until = -1

    def maybe_fire(self, tick, x, v):
        """Called on even ticks. Returns a bullet dict or None."""
        if tick < self.next_tick:
            return None
        if self.reload_until > tick:
            return None
        # first-order intercept: lateral offset x + v*tau, range sqrt(R^2 + (..)^2) = BUL*tau + OFF
        tau = self.R / BUL
        for _ in range(4):
            px = x + v * tau
            tau = (math.hypot(self.R, px) - OFF) / BUL
        px = x + v * tau
        ang = math.atan2(px, self.R) + self.rng.gauss(0, SPREAD)
        b = {'t0': tick * TICK, 'dx': math.sin(ang), 'dy': -math.cos(ang), 'done': False, 'hit': False, 'best': 1e9,
             'seen_tick': tick + 2}
        self.mag -= 1
        if self.mag == 0:
            self.mag = 12
            self.reload_until = tick + 6 + 50     # 12th shot, then 2.5 s
            self.next_tick = self.reload_until
        else:
            self.next_tick = tick + 6
        return b


def bullet_pos(b, R, t):
    s = OFF + BUL * (t - b['t0'])
    return b['dx'] * s, R + b['dy'] * s


def predict_miss(b, R, t, x, v, cmd, horizon=0.9):
    """Closest approach of bullet b to us if we command `cmd` (lateral m/s) from now on."""
    best = 1e9
    xx, vv = x, v
    tt = t
    for _ in range(int(horizon / TICK) + 1):
        bx, by = bullet_pos(b, R, tt)
        best = min(best, math.hypot(bx - xx, by))
        if by < -5:
            break
        vv = step_v(vv, cmd)
        xx += vv * TICK
        tt += TICK
    return best


def run(policy, R, seconds=150.0, seed=1, err=0):
    rng = random.Random(seed * 7919 + int(R) * 31)   # same draws for every policy (paired)
    sh1 = Shooter(R, rng, phase=rng.randrange(3))
    sh2 = Shooter(R, rng, phase=rng.randrange(3))
    sh2.next_tick += 2 * rng.randrange(0, 30)          # independent magazine phase
    x, v = 0.0, 0.0
    sign = 1
    flip_at = rng.uniform(0.8, 1.6)
    moving = True
    toggle_at = 0.3
    cmd = WALK
    hold_until = -1.0
    hold_cmd = 0.0
    bullets = []
    n_ticks = int(seconds / TICK)
    speed_sum = 0.0
    for tick in range(n_ticks):
        t = tick * TICK
        if tick % 2 == 0:
            # ---- house decisions (aim from our state now)
            fired1 = False
            for sh, tag in ((sh1, 1), (sh2, 2)):
                b = sh.maybe_fire(tick, x, v)
                if b:
                    b['who'] = tag
                    bullets.append(b)
                    if tag == 1:
                        fired1 = True
                        run.last_fire1 = tick
            # ---- our decision
            if policy in ('strafe', 'strafe+dodge'):
                if t >= flip_at:
                    sign = -sign
                    flip_at = t + rng.uniform(0.8, 1.6)
                cmd = sign * WALK
            elif policy == 'stopgo-open':
                if t >= toggle_at:
                    moving = not moving
                    toggle_at = t + 0.3
                    if moving and t >= flip_at:
                        sign = -sign
                        flip_at = t + rng.uniform(0.8, 1.6)
                cmd = sign * WALK if moving else 0.0
            elif policy in ('stopgo-sync', 'sync+dodge', 'sync-err1', 'sync+dodge-err1'):
                # we know shooter 1's aim decisions (cadence tracker): toggle on the decision it aims from;
                # err1: the estimate is one decision late
                due = fired1 if not policy.endswith('err1') else (tick == run.last_fire1 + 2)
                if due:
                    moving = not moving
                    if moving and t >= flip_at:
                        sign = -sign
                        flip_at = t + rng.uniform(0.8, 1.6)
                elif sh1.reload_until > tick:
                    moving = True                          # its reload: just strafe
                cmd = sign * WALK if moving else 0.0
            if policy in ('strafe+dodge', 'sync+dodge', 'sync+dodge-err1'):
                if t < hold_until:
                    cmd = hold_cmd
                else:
                    seen = [b for b in bullets if not b['done'] and b['seen_tick'] <= tick]
                    threat = [b for b in seen if predict_miss(b, R, t, x, v, cmd) < DODGE_RR]
                    if threat:
                        best_c, best_s = cmd, None
                        for c in (cmd, -cmd if cmd != 0 else WALK, 0.0, -WALK if cmd == 0 else cmd):
                            s = 0.0
                            for b in seen:
                                m = predict_miss(b, R, t, x, v, c)
                                s += (m - 1000) if m < DODGE_RR else min(m, 2 * DODGE_RR)
                            if best_s is None or s > best_s + 0.05:
                                best_s, best_c = s, c
                        if best_c != cmd:
                            hold_cmd = best_c
                            hold_until = t + 0.3
                            cmd = best_c
        # ---- physics
        v0, x0 = v, x
        v = step_v(v, cmd)
        x += v * TICK
        speed_sum += abs(v)
        # ---- bullets: closest approach inside this tick (linear motion of both)
        t1 = t + TICK
        for b in bullets:
            if b['done']:
                continue
            bx0, by0 = bullet_pos(b, R, t)
            bx1, by1 = bullet_pos(b, R, t1)
            rx0, ry0 = bx0 - x0, by0
            rx1, ry1 = bx1 - x, by1
            dvx, dvy = rx1 - rx0, ry1 - ry0
            vv = dvx * dvx + dvy * dvy
            u = 0.0 if vv < 1e-12 else max(0.0, min(1.0, -(rx0 * dvx + ry0 * dvy) / vv))
            d = math.hypot(rx0 + dvx * u, ry0 + dvy * u)
            b['best'] = min(b['best'], d)
            if by1 < -30:
                b['done'] = True
                b['hit'] = b['best'] < HITR
        bullets = [b for b in bullets if not (b['done'] and t - b['t0'] > 3)]
        if tick == n_ticks - 1:
            for b in bullets:
                if not b['done']:
                    b['done'] = True
                    b['hit'] = b['best'] < HITR
        run.store.extend(b for b in bullets if b['done'] and not b.get('counted') and not b.update({'counted': True}))
    return speed_sum / n_ticks


run.store = []
run.last_fire1 = -99


def main():
    policies = ['strafe', 'strafe+dodge', 'stopgo-open', 'stopgo-sync', 'sync+dodge', 'sync-err1', 'sync+dodge-err1']
    ranges = [60, 85, 100, 115, 130, 150]
    print('Hit rate of house gun bullets (shooter 1 = the one we sync to; shooter 2 = independent phase) and our mean')
    print('lateral speed. 150 s x 12 paired seeds per cell, about 3000 bullets per shooter per cell.\n')
    print('%-16s' % 'policy' + ''.join('%7dm s1/s2  ' % r for r in ranges) + ' speed')
    for pol in policies:
        row = '%-16s' % pol
        spd = 0.0
        for R in ranges:
            run.store = []
            sp = 0.0
            for seed in range(1, 13):
                sp += run(pol, R, seed=seed)
            spd += sp / 12
            s1 = [b for b in run.store if b['who'] == 1]
            s2 = [b for b in run.store if b['who'] == 2]
            h1 = sum(b['hit'] for b in s1) / max(1, len(s1))
            h2 = sum(b['hit'] for b in s2) / max(1, len(s2))
            row += '   %4.2f/%4.2f  ' % (h1, h2)
        print(row + ' %5.1f' % (spd / len(ranges)))


if __name__ == '__main__':
    main()
