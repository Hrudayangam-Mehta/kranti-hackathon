# panel R4: hunt50 burst arithmetic (3 s window). Numbers from hello config / mechanics_deep.md; q = our qOut prior.
def q(d): return 0.95 if d < 40 else 0.9 if d < 90 else 0.75 if d < 160 else 0.5
def burst(d, laser, light, cubes=0, rear=False, ammo=12, energy=100, mortar=False):
    k = 1 + 0.04 * min(cubes, 10); rm = 1.5 if rear else 1.0
    g = 0.0
    if d <= 223 and (d <= 139):  # flight gate 0.55 s unless steady; assume not steady beyond 139 m
        g = min(ammo, 12) * 45 * k * q(d) * rm
    l = 315 * k * rm * (1.6 if mortar else 1.0) if laser and d <= 260 else 0.0
    z = min(10, max(0, (energy - 15) // 3)) * 60 * k * rm * 0.8 if light and d <= 60 else 0.0
    return g + l + z
rows = [("gun", False, False), ("gun+laser", True, False), ("gun+lightning", False, True)]
print("loadout        cubes  " + "  ".join(f"{d:>5}m" for d in (30, 60, 100, 130, 160)))
for name, la, li in rows:
    for c in (0, 5):
        print(f"{name:14} {c:>5}  " + "  ".join(f"{burst(d, la, li, c):6.0f}" for d in (30, 60, 100, 130, 160)))
print("\nlargest target hp the gate accepts (2 x burst), not rear / rear:")
for name, la, li in rows:
    print(f"{name:14} " + "  ".join(f"{2*burst(d, la, li):5.0f}/{2*burst(d, la, li, rear=True):5.0f}" for d in (30, 60, 100, 130, 160)))
print("\nhp of a fresh mech with c cubes (1400 x (1 + 0.04 c)):", {c: round(1400 * (1 + 0.04 * min(c, 10))) for c in (0, 3, 5, 10)})
