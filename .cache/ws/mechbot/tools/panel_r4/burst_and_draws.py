import math, statistics, random

LASER = 315.0; CHARGE = 0.75; LCD = 1.65; GUN = 45.0; GCD = 0.24; MAG = 12; RELOAD = 2.4
HP0 = 1400.0; DPC = 0.04; HPC = 0.04; CAP = 10

def burst(window, cubes_us, p_gun, mag_left, laser_ready, dual_fire, laser_dmg_upg=0, rear=False):
    m = 1 + DPC * min(cubes_us, CAP)
    las = 0.0
    t_las = CHARGE if laser_ready else None
    if t_las is not None and t_las <= window:
        las = LASER * (1.18 ** laser_dmg_upg) * m * (1.5 if rear else 1.0)
    gun_time = window if dual_fire or not laser_ready else max(0.0, window - CHARGE)
    shots = min(mag_left, int(gun_time / GCD) + 1) if gun_time > 0 else 0
    gun = shots * GUN * m * p_gun * (1.5 if rear else 1.0)
    return las + gun, las, gun, shots

def frac(b, cubes_t, hpf):
    return b / (HP0 * (1 + HPC * min(cubes_t, CAP)) * hpf)

print("Burst in a 2.4 s window (one laser cycle) as a fraction of a FULL-hp hunter's current hp")
print("cubes_us cubes_t p_gun mag laser dual -> burst  frac")
for cu in (0, 3, 6, 10):
    for ct in (0, 3):
        for pg in (0.5, 0.7, 0.9):
            for mag in (12, 6):
                for lr in (True, False):
                    for dual in (True, False):
                        b, l, g, s = burst(2.4, cu, pg, mag, lr, dual)
                        f = frac(b, ct, 1.0)
                        if pg == 0.7 or (cu == 0 and ct == 0):
                            print(f"{cu:3d} {ct:3d} {pg:.1f} {mag:3d} {str(lr):5s} {str(dual):5s} -> {b:6.0f} {f:5.2f}")

print()
print("Expected max of k independent draws, in units of the per-draw sd (Monte Carlo, 200k)")
random.seed(1)
for k in (1, 2, 4, 8, 12, 16, 24, 32, 48, 64):
    n = 20000
    s = 0.0
    for _ in range(n):
        s += max(random.gauss(0, 1) for _ in range(k))
    print(f"k={k:3d}: +{s/n:.2f} sd   (sd 0.10 -> +{0.10*s/n:.2f}, 0.15 -> +{0.15*s/n:.2f}, 0.20 -> +{0.20*s/n:.2f})")

print()
print("Regen gifted to damaged hunters by a retreat of length T (45 HP/s after 5 s without dealing/taking damage)")
for T in (1.5, 3, 4.5, 6, 8, 13):
    print(f"T={T:4.1f} s: each hunter that lost its line regains {max(0.0, T-5)*45:5.0f} HP; we regain {max(0.0, T-5)*45:5.0f}")
