#!/usr/bin/env python3
"""Panel R5 game-design arithmetic (stdlib only). Run: python3 -I -B tools/panel_r5/design_arith.py

Every number comes from notes/hello_example.json (config) or from the notes named in the comments.
Toy models: they rank options, they do not predict scores.
"""

# ---- config (hello_example.json) ----
GUN_DMG, GUN_CD_HELD, GUN_MAG, GUN_RELOAD = 45.0, 0.25, 12, 2.4
LAS_DMG, LAS_CHARGE, LAS_CD, LAS_MINF = 315.0, 0.75, 1.65, 0.35
HP0, REGEN, REGEN_DELAY = 1400.0, 45.0, 5.0
CUBE = 0.04

# ---- house script (intel_synthesis.md, mechanics_deep.md) ----
H_GUN_CYCLE = 12 * 0.30 + 2.5          # 12 shots at 0.30 s, then 2.5 s silent
H_GUN_DPS100 = 12 * GUN_DMG / H_GUN_CYCLE
H_LAS_CYCLE = 2.7                      # beam to beam, kit stream
H_LAS_HIT = 4 / 6                      # kit stream, 56-151 m


def h_gun_hit(d):                      # live hit rate on real bots (measured_deltas S05)
    return 0.94 if d < 40 else 0.58 if d < 80 else 0.31 if d < 130 else 0.12


def our_gun_hit(d):                    # kyoto's gun hits by band in the sim (top5_kyoto_max.md 3)
    return 0.92 if d < 75 else 0.78 if d < 100 else 0.71 if d < 130 else 0.36


OUR_LAS_HIT = 0.85                     # kyoto 81%, ours 12 of 13 in the sim


def our_dps(d, laser, cubes=0, flight_gate=True):
    k = 1 + CUBE * min(cubes, 10)
    g = 0.0
    if not (flight_gate and d / 252 > 0.55):
        g = GUN_MAG * GUN_DMG / (GUN_MAG * GUN_CD_HELD + GUN_RELOAD) * our_gun_hit(d)
    l = LAS_DMG / (LAS_CD + LAS_CHARGE) * OUR_LAS_HIT if laser else 0.0
    return k * (g + l), k * g, k * l


def house_dps(d, laser):
    g = H_GUN_DPS100 * h_gun_hit(d)
    l = LAS_DMG / H_LAS_CYCLE * H_LAS_HIT if laser else 0.0
    return g + l


print("1. Exchange by range and loadout (fresh 0-cube house hunter; toy, sustained rates)")
print("   d m | our gun | our gun+laser | hunter gun | hunter gun+laser | TTK gun | TTK g+l | ratio g+l vs g+l hunter")
for d in (40, 75, 100, 115, 130, 150):
    og = our_dps(d, False)[0]
    ol = our_dps(d, True)[0]
    hg = house_dps(d, False)
    hl = house_dps(d, True)
    print(f"   {d:4d} | {og:7.0f} | {ol:13.0f} | {hg:10.0f} | {hl:16.0f} | {HP0/og if og else 99:6.1f}s | {HP0/ol:6.1f}s | {ol/hl:5.2f}")

print("\n2. Threat of one hunter at 110 m (expected dps on us with a line): gun-only %.0f, gun+laser %.0f -> ratio %.1f"
      % (house_dps(110, False), house_dps(110, True), house_dps(110, True) / house_dps(110, False)))
print("   regen is %.0f hp/s: a lone gun-only hunter beyond 80 m deals less than our regen would return" % REGEN)

print("\n3. HP ledger: kills = (output per exposed s / intake per exposed s) x HP budget / HP per kill")
for name, out_pm, in_pm, kills, waste, alive in (("kyoto v43 (sim)", 5951, 1385, 6.0, 852, 96),
                                                  ("5.58 bot (sim)", 5147, 1281, 4.5, 1493, 97),
                                                  ("ours 5.02 (sim)", 3590, 1394, 3.0, 1349, 94)):
    taken = in_pm * alive / 60
    per_kill = (out_pm * alive / 60 - waste) / kills
    print(f"   {name:16s} out/in {out_pm/in_pm:4.2f}  hp taken {taken:5.0f}  hp of output per kill {per_kill:5.0f}  "
          f"waste {waste:5.0f} = {waste/per_kill:4.2f} kills")
print("   -> intake per minute alive is ~1300-1400 for all three styles: the squad sets it; the score lever is output")
print("      per exposed second and its conversion (waste), plus HP refunds taken while NOT exposed (regen, cubes, drops)")

# sensitivity on a V4-like profile: 5.15 kills, ~1.65 min alive, waste ~1100 (assumed)
K0, T0, W0, PK = 5.15, 1.65, 1100.0, 1430.0
O0 = (K0 * PK + W0) / T0
I0 = 1390.0
print(f"\n4. Sensitivity on a V4-like profile (5.15 kills, {T0*60:.0f} s alive, waste {W0:.0f}; output {O0:.0f}/min assumed)")
for label, dO, dW, dB in (("+10% output per exposed s", 0.10, 0, 0), ("waste -500 (kyoto-like)", 0, -500, 0),
                          ("+225 hp refund out of exposure (one 10 s lull)", 0, 0, 225),
                          ("+350 hp refund (a 45%->70% heal), before its output cost", 0, 0, 350),
                          ("-8% intake (armor 1 stack)", 0, 0, 0.087 * I0 * T0)):
    T = T0 + dB / I0
    K = (O0 * (1 + dO) * T - (W0 + dW)) / PK
    print(f"   {label:58s} kills {K - K0:+.2f}")
lost = O0 * 13 / 60 / PK
print(f"   (the 13 s heal also costs {lost:.2f} kills of output if a target was available: net "
      f"{(O0*(T0+350/I0) - W0)/PK - K0 - lost:+.2f}; zero cost when the lull had no target)")

print("\n5. Heal in the lull between token holders: hp back = 45 x (L - 5) (nanites: 72 x (L - 3.5))")
for L in (4, 6, 8, 10, 13, 16, 20):
    print(f"   lull {L:2d} s: {max(0, REGEN*(L-REGEN_DELAY)):4.0f} hp  (nanites {max(0, 72*(L-3.5)):4.0f})")

print("\n6. hunt50 pulse in practice: hide during our own dead time D (gun reload 2.4 s with the laser cooling)")
for lines_dps in (110, 160, 220):
    for tc in (0.3, 0.6, 1.0, 1.5):
        saved = lines_dps * max(0.0, 2.4 - 2 * tc)
        print(f"   lines {lines_dps:3d} dps, cover {tc:.1f} s away ({tc*11.7:4.1f} m): intake saved {saved:4.0f} hp per cycle")
print("   -> worth it only with cover <= ~0.6 s (7 m); at 1.5 s (the R4 spec) the walk out and back eats the saving")

print("\n7. Burst needed for the owner's 50% gate, by target state (3 s burst; burst_table.py values)")
for bname, burst in (("gun 0c at 100-130 m", 405), ("gun 0c at 60 m", 486), ("gun+laser 0c at 100-130 m", 720),
                     ("gun+laser 5c at 100-130 m", 864)):
    print(f"   {bname:26s} burst {burst:4d}: passes on targets up to {2*burst:5.0f} hp front, {3*burst:5.0f} hp from the rear")
print("   -> gun-only it refuses a fresh 1400 hp bot from the front: in practice it only filters non-hostile fresh bots")

print("\n8. Zone against regen (phase dps; regen 45 only inside)")
for i, (hold, shrink, r, dps) in enumerate(((60, 50, 380, 20), (45, 40, 240, 35), (35, 35, 140, 60), (30, 30, 70, 100),
                                            (25, 25, 25, 160), (15, 25, 0, 260))):
    print(f"   phase {i+1}: radius -> {r:3d} m, {dps:3d} hp/s outside: {'cheaper than one regen second' if dps < REGEN else 'exceeds regen'}")

print("\n9. Supply drop as an HP refund (full hp + 3 cubes): at 45%% of 1400 that is %.0f hp + %.0f max hp = %.0f s of squad intake"
      % (0.55 * HP0, 3 * CUBE * HP0, (0.55 * HP0 + 3 * CUBE * HP0) / (I0 / 60)))
print("   capture needs 4 s alone in an 8 m ring; damage does not interrupt it: with one line (~60 dps) it costs ~240 hp,")
print("   with three lines (~300 dps) ~1200 hp: a drop is a refund only at <= 1 line")

print("\n10. FFA crowding (Achintya recordings, measured_deltas S03/S04): deaths per minute 0.36 alone, 2.02 with one mech")
print("    within 60 m, 4.58 with two. Survival over a 60 s stretch: alone %.0f%%, one near %.0f%%, two near %.0f%%"
      % (100 * 2.718281828 ** (-0.36), 100 * 2.718281828 ** (-2.02), 100 * 2.718281828 ** (-4.58)))

print("\n11. Upgrade value for score = (output/intake) x budget (percent change of the product; toy)")
for loadout, gun_share in (("gun only", 1.0), ("gun+laser (gun 40% of damage)", 0.4)):
    las_share = 1 - gun_share
    vals = {
        "plating (max hp x1.15, heals)": 15.0 * 0.6,          # ~60% of the budget is max hp; the rest refunds
        "armor (-8% taken, weapons)": 8.7,
        "gun_mag (+8 rounds, reload x0.8)": 100 * gun_share * (((20 * 45) / (20 * 0.25 + 1.92)) / ((12 * 45) / (12 * 0.25 + 2.4)) - 1),
        "gun_damage (x1.15)": 15.0 * gun_share,
        "laser_damage (x1.18; 5 -> 4 beams on 1400 hp)": 18.0 * las_share,
        "laser_charge (cycle 2.40 -> 2.21 s)": 100 * las_share * (2.40 / 2.2125 - 1),
        "nanites (regen 72/s after 3.5 s)": 0.0,               # only through lulls (section 5)
    }
    print(f"   {loadout}:")
    for k, v in sorted(vals.items(), key=lambda kv: -kv[1]):
        print(f"     {k:46s} {v:+5.1f}%")
print("   nanites: +100-200 hp per 10 s lull (section 5), i.e. worth about one plating stack per two lulls")
