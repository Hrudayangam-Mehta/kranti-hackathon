"""Statistics behind notes/rules_audit.md section 4. Standard library only. Deterministic (seeded)."""
import math, random, statistics as st
rng = random.Random(20261121)

print("== A. standard error of a 48-match practice mean, by per-match SD")
for sd in (2.0, 2.5, 3.0, 3.5, 4.0):
    se = sd / math.sqrt(48)
    print(f"sd {sd:.1f}: SE {se:.3f}  two-run diff SE {se*math.sqrt(2):.3f}  95% diff {1.96*se*math.sqrt(2):.2f}"
          f"  paired rho=.3 SE {sd*math.sqrt(2*0.7/48):.3f}  rho=.5 SE {sd*math.sqrt(2*0.5/48):.3f}")

print("== B. expected maximum of N equal-strength variants (units of run SE)")
def emax(n, trials=20000):
    return sum(max(rng.gauss(0, 1) for _ in range(n)) for _ in range(trials)) / trials
for n in (2, 4, 8, 16, 24, 32, 48, 64, 96, 128):
    m = emax(n, 6000)
    print(f"N {n:3d}: +{m:.2f} SE   (sd 3.0 -> +{m*3/math.sqrt(48):.2f} points; sd 2.5 -> +{m*2.5/math.sqrt(48):.2f})")

print("== C. replicates per arm needed to detect a true difference d (two-sided 5%, 80% power), unpaired")
for sd in (2.5, 3.0, 3.5):
    for d in (0.25, 0.5, 0.75, 1.0):
        se1 = sd / math.sqrt(48)
        k = 2 * ((1.96 + 0.84) * se1 / d) ** 2
        print(f"sd {sd}: d {d:.2f} -> {math.ceil(k)} submissions per arm")

# FFA model: performance = skill + Gumbel noise, rank by performance (Plackett-Luce). Score = 16 - place.
def gumbel():
    return -math.log(-math.log(rng.random()))
def ffa_match(skills):
    perf = [(s + gumbel(), i) for i, s in enumerate(skills)]
    perf.sort(reverse=True)
    sc = [0] * len(skills)
    for place, (_, i) in enumerate(perf, 1):
        sc[i] = 16 - place
    return sc

print("== D. skill (logit units) -> expected FFA score against 15 average bots")
table = {}
for sk in (0.0, 0.25, 0.5, 0.75, 1.0, 1.5):
    tot = 0; n = 20000; sq = 0
    for _ in range(n):
        s = ffa_match([sk] + [0.0] * 15)[0]; tot += s; sq += s * s
    mean = tot / n; sd = math.sqrt(sq / n - mean * mean)
    table[sk] = mean
    print(f"skill {sk:.2f}: mean {mean:.2f} sd {sd:.2f}  SE16 {sd/4:.2f}  SE64 {sd/8:.2f}")

print("== E. qualifying: 32 teams, 16 matches each (32 matches of 16), top 16 advance; field skills ~ N(0, 0.35)")
def qualify(my_skill, trials=3000):
    adv = 0
    for _ in range(trials):
        skills = [my_skill] + [rng.gauss(0, 0.35) for _ in range(31)]
        tot = [0] * 32
        for rnd in range(16):
            order = list(range(32)); rng.shuffle(order)
            for half in (order[:16], order[16:]):
                sc = ffa_match([skills[i] for i in half])
                for i, s in zip(half, sc): tot[i] += s
        mine = tot[0]
        better = sum(1 for t in tot[1:] if t > mine) + 0.5 * sum(1 for t in tot[1:] if t == mine)
        if better < 16: adv += 1
    return adv / trials
for sk in (0.0, 0.25, 0.5, 0.75, 1.0):
    print(f"skill {sk:.2f} (FFA mean ~{table[sk]:.1f}): P(advance) {qualify(sk):.2f}")

print("== F. final: 16 finalists, 64 matches together; rivals ~ N(0.3, 0.3); P(we finish 1st)")
def final(my_skill, trials=1500):
    win = 0
    for _ in range(trials):
        skills = [my_skill] + [rng.gauss(0.3, 0.3) for _ in range(15)]
        tot = [0] * 16
        for _m in range(64):
            sc = ffa_match(skills)
            for i, s in enumerate(sc): tot[i] += s
        if tot[0] == max(tot) and tot.count(tot[0]) == 1: win += 1
    return win / trials
for sk in (0.3, 0.6, 0.9, 1.2, 1.5):
    print(f"skill {sk:.1f}: P(win) {final(sk):.2f}")
