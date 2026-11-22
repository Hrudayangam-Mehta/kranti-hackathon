"""Panel R2 chair: arithmetic re-checks of numbers carried into notes/tactics_update_r2.md.
Run: python3 -I tools/panel_r2/chair_checks.py   (standard library only; reads the replay and the hello example as data)
"""
import gzip, json, math, os, random
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, '..', '..')
cfg = json.load(open(os.path.join(P, 'notes', 'hello_example.json')))['config']

print('== 1. zone schedule (hello.config.zone) ==')
t = 0.0; r = cfg['zone']['start_radius']; sched = []
for ph in cfg['zone']['phases']:
    hold0, sh0, sh1 = t, t + ph['hold_s'], t + ph['hold_s'] + ph['shrink_s']
    sched.append((hold0, sh0, sh1, r, ph['radius'], ph['dps']))
    print(f"hold {hold0:.0f}-{sh0:.0f} s, shrink {sh0:.0f}-{sh1:.0f} s: radius {r} -> {ph['radius']} m, {ph['dps']} HP/s, edge speed {(r - ph['radius']) / ph['shrink_s']:.2f} m/s")
    t, r = sh1, ph['radius']
last = sched[-1]
print(f"final shrink {last[1]:.0f}-{last[2]:.0f} s: radius = {last[2]:.0f} - t; dps {last[5]}")

print('\n== 2. cost of standing d metres off the final point (centre moves linearly from the old centre) ==')
# circle at fraction w of the shrink remaining: centre = final + w*v, radius = R0*w (R0 = 25). rho = |v|/R0 in [0,1].
R0, T = last[3], last[2] - last[1]; dps = last[5]
def exit_before_end(d, ang, rho):
    """seconds before the end of the shrink at which a point d m off the final point (angle ang from v) leaves the circle"""
    qx, qy = d * math.cos(ang), d * math.sin(ang); vx = rho * R0
    lo, hi = 0.0, 1.0   # w: inside at w=1? (only if |q - v| <= R0)
    if math.hypot(qx - vx, qy) > R0: return T
    for _ in range(60):
        w = (lo + hi) / 2
        if math.hypot(qx - w * vx, qy) <= R0 * w: hi = w
        else: lo = w
    return hi * T
for rho in (0.0, 0.33, 0.67, 0.9):
    row = [f"{exit_before_end(1, a, rho) * dps:6.0f}" for a in (0, math.pi / 2, math.pi)]
    print(f"rho {rho:.2f}: 1 m off costs toward old centre / sideways / away = {' /'.join(row)} HP  (closed form {dps / (1 + rho):.0f} / {dps / math.sqrt(max(1e-9, 1 - rho * rho)):.0f} / {dps / max(1e-9, 1 - rho):.0f})")
random.seed(7); xs = []
for _ in range(200000):
    while True:
        x, y = random.uniform(-1, 1), random.uniform(-1, 1)
        if x * x + y * y <= 1: break
    xs.append(math.hypot(x, y))
xs.sort(); print(f"if the final point is uniform in the 25 m circle: rho mean {sum(xs) / len(xs):.2f}, median {xs[len(xs) // 2]:.2f}")
for rho in (0.0, 0.67):
    for d in (5.0, 7.5):
        print(f"rho {rho:.2f}, rival {d} m off: loses {exit_before_end(d, 0, rho) * dps:5.0f} HP if on the old-centre side, {exit_before_end(d, math.pi, rho) * dps:5.0f} HP if on the far side")

print('\n== 3. HP pools and death times after 415 s (no fire, no regen outside) ==')
hp0 = cfg['mech']['hp']; per = cfg['cubes']['hp_per_cube']; cap = cfg['cubes']['stat_cap']
for c in (0, 10):
    H = hp0 * (1 + per * min(c, cap)); print(f"{c} cubes: {H:.0f} HP, on the point dies at {last[2] + H / dps:.1f} s")
for H, d in ((1512, 5), (2518, 5)):
    print(f"rival {H} HP, {d} m off (rho 0): dies at {last[2] - d + H / dps:.1f} s")
print(f"body radius {cfg['mech']['radius']} m (x{1 + cfg['cubes']['size_per_cube'] * 10:.2f} at 10 cubes): two centres are at least {2 * cfg['mech']['radius']:.1f} to {2 * cfg['mech']['radius'] * (1 + cfg['cubes']['size_per_cube'] * 10):.1f} m apart")

print('\n== 4. sound discs against the zone ==')
for kind in ('gun', 'laser', 'death'):
    rr = cfg['sound']['range'][kind]
    print(kind, rr, 'm:', ', '.join(f"{min(1, (rr / R) ** 2) * 100:.0f}% of the {R} m circle" for R in (560, 380, 240, 140)))

print('\n== 5. truel and duel thresholds ==')
print('three equal mechs all shooting:', (15 + 14 + 13) / 3, '; hold fire then beat the survivor 9 times in 10:', 0.9 * 15 + 0.1 * 14)
for Pw in (1.0, 1.25, 1.35, 1.4, 1.5, 1.6, 1.85, 2.4):
    print(f"P {Pw}: win chance P^3/(1+P^3) = {Pw ** 3 / (1 + Pw ** 3):.2f}")
V = {'hunter': {16: 8.0, 12: 9.9, 8: 11.6, 6: 12.6, 4: 13.6, 3: 14.0, 2: 14.4}}
ns = [16, 12, 8, 6, 4, 3, 2]
print('p*(n) needs V(n-1); the memo printed V only at', ns, '-> adjacent values exist for n = 4 and 3:')
for n in (4, 3):
    v, vprev = V['hunter'][n], V['hunter'][n - 1]
    p = (v - (16 - n)) / (vprev - (16 - n)); print(f"  hunter-like field value, n={n}: p* = ({v} - {16 - n}) / ({vprev} - {16 - n}) = {p:.2f} -> P* = {(p / (1 - p)) ** (1 / 3):.2f}")
print('standard error of a 64-match mean with per-match sd 1.4:', round(1.4 / 8, 3))

print('\n== 6. replay (house-bot FFA, older balance): gun retention and death clock ==')
lines = [json.loads(l) for l in gzip.open(os.path.join(P, 'replay', 'mech16.jsonl.gz'), 'rt') if l.strip()]
hdr, res, frames = lines[0], lines[-1], lines[1:-1]
kinds = hdr['weapon_kinds']; gi = kinds.index('gun')
tot = nogun = 0; nogun_ids = set()
for fr in frames:
    for row in fr['m']:
        if row[6] <= 0: continue
        tot += 1
        if row[11] != gi and row[12] != gi: nogun += 1; nogun_ids.add(row[0])
print(f"weapon kinds {kinds}; live mech-frames {tot}, without a gun in either slot {nogun} ({100 * nogun / tot:.2f}%), mechs ever gunless {sorted(nogun_ids)}")
print('final loadouts:', sorted(tuple(m['loadout']) for m in res['mechs']))
deaths = sorted(m['death_t'] for m in res['mechs'] if m.get('death_t') is not None)
print('death times (s):', [round(x, 1) for x in deaths])
print(f"2nd death {deaths[1]:.0f} s, 3rd death {deaths[2]:.0f} s, 4th {deaths[3]:.0f} s (an observer's own kills would be subtracted)")
kb = {}
for m in res['mechs']: kb[str(m.get('killed_with'))] = kb.get(str(m.get('killed_with')), 0) + 1
print('killed_with:', kb)

print('\n== 7. belief-lite: marginal HP per engagement in practice (model, replay priors) ==')
p_untracked, hp_unseen, hp_seen = 24 / 64, 189.0, 61.0
for base, new, label in ((6 / 32, 22 / 32, 'house torso -> belief wedge'), (0.33, 22 / 32, 'chance -> belief wedge'), (18 / 32, 22 / 32, 'last-sound wedge -> belief wedge')):
    print(f"{label}: {p_untracked * (new - base) * (hp_unseen - hp_seen):.0f} HP per engagement")

print('\n== 8. latch rule: expected practice cost of a looser rule ==')
for fp, cost in ((0.04, 5.0), (0.0, 5.0)):
    print(f"false-latch rate {fp:.0%} x about {cost} points lost in that match = {fp * cost:.2f} points of practice mean")
print('roof A/Bs on the official scorer (measured_deltas C02-C07, E06):', [-0.37, +0.73, -0.93, -0.18, +0.06, -0.21], '-> C03 is the roof-off test read as +0.73 for roofs (confounded); mean of the other five', round(sum([-0.37, -0.93, -0.18, 0.06, -0.21]) / 5, 2))
hide = [-0.50, -0.69, -1.33, -0.71, -0.94, -0.33, -0.64, -1.75, -0.83, -0.36]
print('hide-first A/Bs (A01 A13 A15 A17 A18 A19 A20 A22 A24 A31):', len(hide), 'tests, all negative, mean', round(sum(hide) / len(hide), 2), 'range', max(hide), min(hide))
