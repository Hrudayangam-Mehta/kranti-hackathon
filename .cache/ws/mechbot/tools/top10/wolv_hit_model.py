#!/usr/bin/env python3
"""Own toy model (clean room, written from prose notes; no third-party code).

Question: how often does an exact first-order gun lead hit a mech that strafes the way the
Wolverines bot is described to strafe (tangential stick 0.9, direction re-drawn every
0.35-1.05 s with a coin flip), with and without its late bullet side-step, by range?

1-D lateral model. Balance numbers are the organiser's published config values.
Simplifications: shooter static, target at constant range, pure tangential motion,
spread treated as a Gaussian sigma of 0.6 deg, target radius 2.5 m (no cubes).
"""
import math, random, sys

WALK, BOOST, ACC = 11.7, 19.5, 58.5
BULLET, CD, MAG, RELOAD = 252.0, 0.24, 12, 2.4
R_HIT = 2.5 + 0.3
DT = 0.05  # engine tick


def run(dist, sees_bullets, has_laser, seconds, rng):
    y = 0.0
    v = 0.0
    sdir = 1
    next_roll = 0.0
    t = 0.0
    bullets = []  # (arrive_time, lateral_aim)
    shots = hits = 0
    next_shot = 0.0
    in_mag = MAG
    obs_y, obs_v = y, v
    cmd = 0.0
    tick = 0
    laser_phase = rng.random() * 2.4
    energy = 100.0
    since_spend = 9.0
    boosting = False
    while t < seconds:
        decide = (tick % 2 == 0)
        if decide:
            obs_y, obs_v = y, v  # what the shooter sees this decision
            # target's own decision
            if t >= next_roll:
                sdir = -1 if rng.random() < 0.5 else 1
                next_roll = t + 0.35 + rng.random() * 0.7
            charging = has_laser and ((t + laser_phase) % 2.4) < 0.75
            top = WALK * (0.5 if charging else 1.0)
            cmd = sdir * 0.9 * top
            if sees_bullets:
                push = 0.0
                for (ta, yb) in bullets:
                    togo = ta - t
                    if 0 <= togo <= 0.9 and abs(yb - y) < 3.6:
                        push += 1.0 if y >= yb else -1.0
                boosting = False
                if push != 0.0:
                    d = 1.0 if push > 0 else -1.0
                    mix = 0.3 * (cmd / max(top, 1e-9)) + 0.95 * d
                    mix = max(-1.0, min(1.0, mix))
                    boosting = energy > 25.0  # described threshold without lightning
                    cmd = mix * (BOOST if boosting else WALK) * (0.5 if charging else 1.0)
        # shooter: fire when the cooldown ends, aim from the last observation
        while next_shot <= t + DT and next_shot < seconds:
            tf = max(next_shot, t)
            flight = dist / BULLET
            lead = obs_y + obs_v * ((tf - (t if decide else t - DT)) + flight)
            sigma = dist * math.tan(math.radians(0.6))
            bullets.append((tf + flight, lead + rng.gauss(0, sigma)))
            shots += 1
            in_mag -= 1
            if in_mag == 0:
                in_mag = MAG
                next_shot = tf + RELOAD
            else:
                next_shot = tf + CD
        # energy: boost drains 17/s, regen 18/s after 0.6 s without spending
        if boosting:
            energy = max(0.0, energy - 17.0 * DT)
            since_spend = 0.0
        else:
            since_spend += DT
            if since_spend >= 0.6:
                energy = min(100.0, energy + 18.0 * DT)
        # integrate target
        dv = cmd - v
        step = ACC * DT
        v += max(-step, min(step, dv))
        y += v * DT
        t += DT
        tick += 1
        keep = []
        for (ta, yb) in bullets:
            if ta <= t:
                if abs(yb - y) < R_HIT:
                    hits += 1
            else:
                keep.append((ta, yb))
        bullets = keep
    return shots, hits


def main():
    rng = random.Random(20261121)
    print("range_m  flight_s  unseen_bullets  seen_bullets(side-step)  seen+laser_half_speed")
    for d in (40, 55, 70, 90, 110, 130, 150, 180, 210):
        row = []
        for sees, laser in ((False, False), (True, False), (True, True)):
            s = h = 0
            for _ in range(60):
                a, b = run(d, sees, laser, 60.0, rng)
                s += a
                h += b
            row.append(h / max(s, 1))
        print(f"{d:7d}  {d / BULLET:8.2f}  {row[0]:14.2f}  {row[1]:23.2f}  {row[2]:21.2f}")


if __name__ == "__main__":
    main()
