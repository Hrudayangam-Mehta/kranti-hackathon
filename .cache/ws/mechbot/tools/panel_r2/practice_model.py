"""Panel R2: fluid model of a PRACTICE match (us vs a 15-bot squad). Run: python3 -I practice_model.py
score = 16 - place = number of house bots dead when we die (15 if we are last).
Stated assumptions (every one is a parameter):
  b      our dps on one hunter from a corner at stand-off      64  (107 x 0.6, panel 1)
  a      one hunter's dps on us at stand-off through a peek    31  (107 x 0.5 x 0.57 exposure, panel 1)
  a_c    one hunter's dps on us inside 50 m without cover      100 (house guns hit 98% under 40 m)
  hide   share of a that still lands on a mech that only hides 0.35
  m      most hunters that hold a line on us at once (cover)   2 before 375 s, all of them in the 25 m circle
  n(K,t) hunters: 1 + K//esc before T_late, all 15-K after ("one early, more as you thin them out, all late")
  gap    seconds without any hunter after a kill at n=1         15 (the next one has to walk over)
  cubes  +3 per kill (2 dropped + part of the victim's), cap 10: +4% hp and damage each
"""
import itertools
HP, REGEN, DELAY, ZT = 1400.0, 45.0, 5.0, 415.0
def sim(policy, T_late=265, esc=2, m_cap=2, b=64.0, a=31.0, a_c=100.0, hide=0.35, gap=15.0, bot_hp=1512.0, dt=0.25):
    t, K, hp, c = 20.0, 0, HP, 0          # first contact at 20 s
    tgt, quiet, since = bot_hp, 0.0, 99.0  # target hp, seconds of no-hunter gap left, seconds since last damage dealt/taken
    while t < ZT + 30:
        N = 15 - K
        if N == 0: return 15, t, K
        mx = HP * (1 + 0.04 * min(c, 10)); mul = 1 + 0.04 * min(c, 10)
        late = t >= T_late
        n = N if late else min(N, 1 + K // esc)
        final = t >= 375                       # everyone inside a 25 m circle: no stand-off, no cover
        lines = n if final else min(n, m_cap)
        if quiet > 0 and not late: lines = 0; quiet -= dt
        fight = policy == 'duel' or (policy == 'duel1' and (n <= 1 or final)) or final
        dmg_in = lines * (a_c if final else a) * (1.0 if fight else hide)
        if t >= ZT: dmg_in += 260.0            # radius 0: everyone is outside
        if fight and lines > 0:
            tgt -= (b * 2.2 if final else b) * mul * dt      # 142 dps at point-blank
            since = 0.0
        if dmg_in > 0: since = 0.0
        hp -= dmg_in * dt
        if t >= ZT: tgt -= 260.0 * dt * 5.0     # house bots stand >= 5 m off the centre point we hold: each has already lost 1300
        if tgt <= 0:
            K += 1; c += 3; hp += HP * 0.04 * 3; tgt = bot_hp
            if n <= 1: quiet = gap
        if hp <= 0: return K, t, K
        since += dt
        if since >= DELAY and t < ZT: hp = min(mx, hp + REGEN * dt)
        t += dt
    return 15, t, K
print(__doc__)
print('policy  : (a) hide = never fire;  (b) duel = fight whoever has a line;  (c) duel1 = fight only while one hunter, else hide')
print(f"{'T_late':>6} {'esc':>3} {'m':>2} | {'(a) hide':>16} | {'(b) duel':>16} | {'(c) duel1':>16}")
for T_late, esc, m in itertools.product([200, 265, 325], [2, 3], [1, 2, 3]):
    r = [sim(p, T_late=T_late, esc=esc, m_cap=m) for p in ('hide', 'duel', 'duel1')]
    print(f"{T_late:>6} {esc:>3} {m:>2} | " + ' | '.join(f"score {s:>2} dies {t:5.0f}s" for s, t, _ in r))
print('\nwith a laser (b = 64 + 92 = 156, panel 1) and m = 2:')
for T_late in (200, 265, 325):
    r = [sim(p, T_late=T_late, b=156.0) for p in ('hide', 'duel', 'duel1')]
    print(f"T_late {T_late}: " + ' | '.join(f"score {s:>2} dies {t:5.0f}s" for s, t, _ in r))
# collapse arithmetic
print('\n== final collapse (radius = 415 - t for 390..415 s, 260 hp/s outside, no regen outside) ==')
for cubes, plating in [(0, 0), (10, 0), (10, 1), (10, 3)]:
    H = HP * (1 + 0.04 * cubes) * 1.15 ** plating
    print(f"us at the centre point, {cubes} cubes, {plating} plating: hp {H:.0f}, dies at {ZT + H / 260:.1f} s if nobody shoots")
for h, d in [(1400, 5), (1512, 5), (1512, 6.25), (2518, 5), (1960, 0), (1960, 10)]:
    print(f"house bot hp {h} standing {d} m off the centre: leaves the zone at {ZT - d:.1f} s, dies at {ZT - d + h / 260:.1f} s")
H = 1960.0
for A in (0, 31, 58, 100, 200):
    # we hold the centre from 390 s; rivals at >= 5 m with 1512 hp die at 415.8 s; we need hp left at 415.8 s
    need = A * (415.8 - 390) + 260 * 0.8
    print(f"incoming fire {A:>3} dps from 390 s: we lose {need:.0f} of {H:.0f} hp by 415.8 s -> {'outlive them: place 1' if need < H else 'die first'}")
