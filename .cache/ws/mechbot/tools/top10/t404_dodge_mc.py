# Our own Monte Carlo (clean room, no third-party code): how often an exact-lead gun hits a mech that behaves
# like the "404 Competition Not Found" D1 build, as described in our prose notes:
#   - ring strafe: lateral full stick, optional radial component, direction timer U(0.45, 1.35) s and a 55 %
#     chance to reverse when the timer ends;
#   - bullet reaction: every decision (0.1 s), for each bullet whose closest pass to the mech's CURRENT centre is
#     0.02-0.45 s away and nearer than 3.8 m, add one unit of sideways stick away from the pass point (if the pass
#     is within 0.3 m of dead centre, use the current strafe side); then clamp the stick to length 1.
# Physics from the public rules: walk 11.7 m/s, ground acceleration 58.5 m/s^2, bullet 252 m/s, 12 rounds at
# 0.24 s then 2.4 s reload, Gaussian spread (sigma assumed = spread_deg 0.6), hit radius 2.5 m, bullet leaves
# 3 m in front of the shooter one tick after the decision.
# Shooter rules: lead = first-order intercept; short(k) = the same intercept pulled k metres back toward the
# target's present position (against its velocity).
#   python3 -I tools/top10/t404_dodge_mc.py
import math, random
V, A, BS, R = 11.7, 58.5, 252.0, 2.5
DT = 0.01

def sim(dist, rule='lead', k=0.0, dodge=True, radial=0.0, shots=4000, seed=11, sigma_deg=0.6, shooter_v=0.0):
    rng = random.Random(seed)
    tx, ty = dist, 0.0
    tvx, tvy = 0.0, V
    strafe = 1.0
    timer = 0.45 + rng.random() * 0.9
    cmdx, cmdy = 0.0, 1.0
    bullets = []   # [x, y, vx, vy]
    t = 0.0
    cool = 0.0; mag = 12
    fired = hits = 0
    pending = None
    step = 0
    while fired < shots or bullets:
        if step % 10 == 0:
            # ---------- target decision
            d = math.hypot(tx, ty)
            ux, uy = tx / d, ty / d            # from shooter to target
            if t > timer:
                if rng.random() < 0.55:
                    strafe = -strafe
                timer = t + 0.45 + rng.random() * 0.9
            lx, ly = -uy * strafe, ux * strafe
            mx = lx + ux * radial * 0.8
            my = ly + uy * radial * 0.8
            n = math.hypot(mx, my)
            if n > 1: mx, my = mx / n, my / n
            if dodge:
                for b in bullets:
                    bx, by, bvx, bvy = b
                    vv = bvx * bvx + bvy * bvy
                    tc = ((tx - bx) * bvx + (ty - by) * bvy) / vv
                    if not 0.02 <= tc <= 0.45: continue
                    ox, oy = bx + bvx * tc - tx, by + bvy * tc - ty
                    if ox * ox + oy * oy > 3.8 * 3.8: continue
                    s = math.sqrt(vv)
                    nx, ny = -bvy / s, bvx / s
                    dot = nx * ox + ny * oy
                    side = -1.0 if dot > 0 else 1.0
                    if abs(dot) < 0.3:
                        # the mech uses its strafe sign as the side along (nx, ny)
                        side = strafe
                    mx += nx * side; my += ny * side
                n = math.hypot(mx, my)
                if n > 1: mx, my = mx / n, my / n
            cmdx, cmdy = mx, my
            # ---------- shooter decision (sees the target as it is now; shot leaves one tick later)
            if fired < shots and cool <= 1e-9:
                delay = 0.05
                px, py = tx, ty
                tt = 0.0
                for _ in range(4):
                    hit_t = delay + tt
                    px, py = tx + tvx * hit_t, ty + tvy * hit_t
                    tt = max(0.0, math.hypot(px, py) - 3.0) / BS
                if rule == 'short':
                    sp = math.hypot(tvx, tvy)
                    if sp > 0.5:
                        back = min(k, math.hypot(px - tx, py - ty))
                        px -= tvx / sp * back; py -= tvy / sp * back
                yaw = math.atan2(py, px) + rng.gauss(0.0, math.radians(sigma_deg))
                pending = (t + delay, yaw)
                fired += 1; mag -= 1
                cool = 0.24
                if mag == 0:
                    mag = 12; cool = 2.4
        if pending and t >= pending[0] - 1e-9:
            yaw = pending[1]
            bullets.append([3.0 * math.cos(yaw), 3.0 * math.sin(yaw), BS * math.cos(yaw), BS * math.sin(yaw)])
            pending = None
        # ---------- integrate target
        wx, wy = cmdx * V - tvx, cmdy * V - tvy
        w = math.hypot(wx, wy)
        if w > A * DT:
            wx, wy = wx / w * A * DT, wy / w * A * DT
        tvx += wx; tvy += wy
        tx += tvx * DT; ty += tvy * DT
        # ---------- integrate bullets, hit test on the segment
        keep = []
        for b in bullets:
            x0, y0 = b[0], b[1]
            x1, y1 = x0 + b[2] * DT, y0 + b[3] * DT
            sx, sy = x1 - x0, y1 - y0
            L2 = sx * sx + sy * sy
            u = max(0.0, min(1.0, ((tx - x0) * sx + (ty - y0) * sy) / L2))
            cx, cy = x0 + sx * u, y0 + sy * u
            if (cx - tx) ** 2 + (cy - ty) ** 2 < R * R:
                hits += 1
                continue
            b[0], b[1] = x1, y1
            if math.hypot(x1, y1) < 260:
                keep.append(b)
        bullets = keep
        cool -= DT
        t += DT; step += 1
    return hits / fired

if __name__ == '__main__':
    ranges = (40, 60, 75, 90, 110, 130, 150)
    print('columns: range m ->', ' '.join('%5d' % r for r in ranges))
    for label, kw in (
        ('no reaction, lead        ', dict(dodge=False)),
        ('reacts,      lead        ', dict()),
        ('reacts,      short 1.0 m ', dict(rule='short', k=1.0)),
        ('reacts,      short 1.5 m ', dict(rule='short', k=1.5)),
        ('reacts,      short 2.0 m ', dict(rule='short', k=2.0)),
        ('reacts,      short 2.5 m ', dict(rule='short', k=2.5)),
        ('no reaction, short 1.5 m ', dict(rule='short', k=1.5, dodge=False)),
        ('no reaction, short 2.0 m ', dict(rule='short', k=2.0, dodge=False)),
        ('closing spiral, lead     ', dict(radial=-1.0)),
        ('closing spiral, short 1.5', dict(radial=-1.0, rule='short', k=1.5)),
    ):
        row = []
        for r in ranges:
            a = sum(sim(r, seed=s, **kw) for s in (11, 12, 13)) / 3
            row.append(a)
        print(label, ' '.join('%5.2f' % v for v in row))
