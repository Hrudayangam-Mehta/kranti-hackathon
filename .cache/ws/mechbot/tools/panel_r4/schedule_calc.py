import math, random

random.seed(20261121)
Phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))

print("1. Per-draw sd from measured re-roll pairs (D04, D05, D06, D07, D08, F01; kyoto neutral change)")
pairs = [0.06, 0.27, 0.02, 0.15, 0.33, 0.15, 0.25]
m = sum(pairs) / len(pairs)
sig = m * math.sqrt(math.pi) / 2
print(f"   mean |d| = {m:.3f} -> sigma per draw = mean|d| * sqrt(pi)/2 = {sig:.3f}  (D09 simulator sd 0.15)")
S = 0.17

print("\n2. Expected max of k draws above the build mean, sigma 0.17 (and 0.13 / 0.22)")
def emax(k, n=40000):
    return sum(max(random.gauss(0, 1) for _ in range(k)) for _ in range(n)) / n
E = {}
for k in (1, 2, 4, 8, 12, 16, 24, 32, 48, 64):
    E[k] = emax(k, 20000)
    print(f"   k={k:2d}: +{E[k]:.2f} sd = +{0.17*E[k]:.2f}  (+{0.13*E[k]:.2f} / +{0.22*E[k]:.2f})")

print("\n3. P(at least one of n draws > line), sigma 0.17")
for L in (5.70, 5.80, 5.90):
    print(f"   line {L:.2f}:")
    for mu in (5.40, 5.50, 5.60, 5.70, 5.80):
        row = []
        for n in (5, 10, 20, 40, 60):
            p = 1 - Phi((L - mu) / S) ** n
            row.append(f"n={n:2d} {p:4.2f}")
        print(f"     mean {mu:.2f}: " + "  ".join(row))

print("\n4. sd of comparisons (sigma 0.17)")
for a, b in ((1, 1), (2, 2), (3, 3), (4, 4), (1, 8), (2, 4), (2, 8), (3, 8), (2, 12)):
    print(f"   {a} draws vs {b} draws: sd of mean difference {S*math.sqrt(1/a+1/b):.3f}")
print(f"   2^3 factorial, 8 cells x 1 draw: each main effect / interaction sd {S*math.sqrt(1/4+1/4):.3f}")
print(f"   one-at-a-time from V1, V1-V4 x 2 draws (8 slots): each effect sd {S*math.sqrt(1/2+1/2):.3f}")

print("\n5. Sequential arm rule: screen 1 draw (reject at d1 <= -0.25), 2nd draw, adopt at mean d >= c,")
print("   3rd draw when c-0.10 <= d2 < c, then adopt at d3 >= c. Leader mean known from nL draws.")
def rule(delta, c, nL, sigma=S, n=40000):
    adopt = 0; slots = 0
    for _ in range(n):
        lead_err = random.gauss(0, sigma / math.sqrt(nL))
        x = [delta + random.gauss(0, sigma)]
        slots += 1
        d1 = x[0] - lead_err
        if d1 <= -0.25:
            continue
        x.append(delta + random.gauss(0, sigma)); slots += 1
        d2 = sum(x) / 2 - lead_err
        if d2 >= c:
            adopt += 1; continue
        if d2 < c - 0.10:
            continue
        x.append(delta + random.gauss(0, sigma)); slots += 1
        if sum(x) / 3 - lead_err >= c:
            adopt += 1
    return adopt / n, slots / n
for c in (-0.05, 0.0, 0.05):
    print(f"   c = {c:+.2f}, leader known from 8 draws:")
    for delta in (-0.20, -0.10, 0.0, 0.10, 0.20, 0.30):
        p, s = rule(delta, c, 8)
        print(f"     true effect {delta:+.2f}: P(adopt) {p:.2f}, slots used {s:.2f}")

print("\n6. Expected gain in leader mean per arm, prior effect ~ N(mu0, 0.15^2), sd of the decision statistic s")
def egain(mu0, tau, s, c):
    v = math.sqrt(tau * tau + s * s)
    z = (c - mu0) / v
    pdf = math.exp(-z * z / 2) / math.sqrt(2 * math.pi)
    return mu0 * (1 - Phi(z)) + tau * tau / v * pdf
for draws, s in ((1, S*math.sqrt(1+1/8)), (2, S*math.sqrt(1/2+1/8)), (3, S*math.sqrt(1/3+1/8))):
    g = egain(0.03, 0.15, s, 0.0)
    print(f"   {draws} draw(s) per arm (s={s:.3f}): +{g:.3f} per arm, +{g/draws:.3f} per slot")
print(f"   compare: 2 extra salts of the final build at k=40 add about +{0.17*(emax(42,20000)-emax(40,20000)):.3f} to the expected max")

print("\n7. L32 (32nd place) data and projection to 16:00 Sun (t=0 at 16:37 Sat)")
pts = [(-12.2, 4.23), (-11.3, 4.44), (-9.33, 4.92), (-8.77, 4.96), (0.0, 5.33)]
for t, v in pts:
    print(f"   t={t:6.2f} h  L32={v:.2f}")
r = (5.33 - 4.96) / 8.77
print(f"   rise 07:51 -> 16:37: {r:.3f}/h")
H = 23.4
for A in (5.9, 6.0, 6.2):
    k = r / (A - 5.33)
    print(f"   asymptote {A:.1f}: k={k:.3f}/h -> L32 at close {A - (A-5.33)*math.exp(-k*H):.2f}")
print(f"   linear: {5.33 + r*H:.2f}")
