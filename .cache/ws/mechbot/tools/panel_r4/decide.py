import argparse, math, statistics, sys

SIG = 0.17
Phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))

CELLS = {
    'V1': (+1, +1, +1), 'V2': (-1, +1, +1), 'V3': (+1, +1, -1), 'V4': (+1, -1, +1),
    'V5': (-1, +1, -1), 'V6': (-1, -1, +1), 'V7': (+1, -1, -1), 'V8': (-1, -1, -1),
}
NAMES = ('P1 fightEarly', 'P4 pulse retreat', 'P5 boost spend')
KEEP_AT = (-0.05, 0.00, 0.00)


def factorial(scores, sig):
    y = dict(zip(CELLS, scores))
    def eff(f):
        plus = [y[c] for c, s in CELLS.items() if f(s) > 0]
        minus = [y[c] for c, s in CELLS.items() if f(s) < 0]
        return sum(plus) / 4 - sum(minus) / 4
    sd = sig * math.sqrt(0.5)
    mains = [eff(lambda s, i=i: s[i]) for i in range(3)]
    inter = {'P1xP4': eff(lambda s: s[0] * s[1]), 'P1xP5': eff(lambda s: s[0] * s[2]), 'P4xP5': eff(lambda s: s[1] * s[2])}
    grand = sum(scores) / 8
    print(f"grand mean {grand:.3f}; every effect has sd {sd:.3f}")
    keep = []
    for n, e, k in zip(NAMES, mains, KEEP_AT):
        on = e >= k
        keep.append(+1 if on else -1)
        print(f"  {n:18s} effect {e:+.3f}  keep at >= {k:+.2f}: {'KEEP (on)' if on else 'DROP (off)'}")
    big = {k: v for k, v in inter.items() if abs(v) >= 0.30}
    for k, v in inter.items():
        print(f"  interaction {k}: {v:+.3f}{'  <- |I| >= 0.30: use the full model' if k in big else ''}")
    def pred(s):
        p = grand + sum(mains[i] * s[i] / 2 for i in range(3))
        for k, v in big.items():
            a, b = {'P1xP4': (0, 1), 'P1xP5': (0, 2), 'P4xP5': (1, 2)}[k]
            p += v * s[a] * s[b] / 2
        return p
    if big:
        best = max(CELLS, key=lambda c: pred(CELLS[c]))
    else:
        best = [c for c, s in CELLS.items() if list(s) == keep][0]
    print("model prediction per cell (main effects" + (" + large interactions" if big else "") + "):")
    for c, s in CELLS.items():
        print(f"  {c} {s}: predicted {pred(s):.3f}  observed {y[c]:.2f}")
    print(f"LEADER L1 = {best} (predicted mean {pred(CELLS[best]):.3f} +- {sig*math.sqrt(4/8):.3f})")
    print(f"best single draw: {max(y, key=y.get)} {max(scores):.2f} (portable max; do not choose the leader by it)")


def arm(leader, draws, c, sig):
    mL = statistics.mean(leader)
    n = len(draws)
    d = statistics.mean(draws) - mL
    sd = sig * math.sqrt(1 / n + 1 / len(leader))
    print(f"leader mean {mL:.3f} from {len(leader)} draws; arm mean {statistics.mean(draws):.3f} from {n}; d = {d:+.3f} (sd {sd:.3f}); c = {c:+.2f}")
    if n == 1:
        verdict = 'REJECT (screen: d1 <= -0.25)' if d <= -0.25 else 'SECOND DRAW'
    elif n == 2:
        verdict = 'ADOPT' if d >= c else ('THIRD DRAW (grey zone)' if d >= c - 0.10 else 'REJECT')
    else:
        verdict = 'ADOPT' if d >= c else 'REJECT'
    print(f"VERDICT: {verdict}")


def qualify(mean, sd, n, line):
    p = 1 - Phi((line - mean) / sd) ** n
    print(f"P(max of {n} draws at mean {mean:.2f}, sd {sd:.2f} exceeds {line:.2f}) = {p:.3f}")


FACT = ('P2', 'P3', 'P6', 'P4', 'P5', 'P7')
OFF = {'P2': "laserEcon: 'off', laserRange: 'far'", 'P3': "focus: 'mult'", 'P6': "farmHp: '90'",
       'P4': "retreat: 'd3'", 'P5': "boost: 'off'", 'P7': "upg: 'std'"}


def design_runs():
    base = []
    for a in (1, -1):
        for b in (1, -1):
            for c in (1, -1):
                base.append((a, b, c, a * b, a * c, b * c))
    order = [base[i] for i in (0, 1, 2, 3, 4, 5, 6, 7)]
    fold = [tuple(-x for x in r) for r in order]
    return order + fold


def design():
    print("2^(6-2) resolution IV on V1 (P1 on in every run): base 2^(6-3) (D=AB, E=AC, F=BC) then its fold-over")
    print("factor order A=P2 laserEcon+mid, B=P3 focus, C=P6 farm50, D=P4 pulse, E=P5 boost, F=P7 speed3rd")
    for i, r in enumerate(design_runs(), 1):
        offs = [OFF[f] for f, v in zip(FACT, r) if v < 0]
        tag = 'V1 (done)' if all(v > 0 for v in r) else ''
        print(f"  F{i:02d} {''.join('+' if v > 0 else '-' for v in r)}  " + (', '.join(offs) if offs else 'none') + f"  {tag}")


def solve(A, b):
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[p][c]) < 1e-12:
            raise SystemExit('design is singular for these factors: add runs or drop a factor')
        M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1):
                    M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] for i in range(n)]


def inv(A):
    n = len(A)
    cols = []
    for j in range(n):
        e = [1.0 if i == j else 0.0 for i in range(n)]
        cols.append(solve(A, e))
    return [[cols[j][i] for j in range(n)] for i in range(n)]


def fit(path, sig):
    names = None; X = []; y = []
    for line in open(path):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = [t.strip() for t in line.split(',')]
        if names is None:
            names = parts[1:-1]; continue
        X.append([1.0] + [float(v) for v in parts[1:-1]]); y.append(float(parts[-1]))
    k = len(names) + 1
    XtX = [[sum(r[i] * r[j] for r in X) for j in range(k)] for i in range(k)]
    Xty = [sum(r[i] * yy for r, yy in zip(X, y)) for i in range(k)]
    beta = solve(XtX, Xty)
    V = inv(XtX)
    res = [yy - sum(b * x for b, x in zip(beta, r)) for r, yy in zip(X, y)]
    dof = len(y) - k
    s_res = math.sqrt(sum(e * e for e in res) / dof) if dof > 0 else float('nan')
    print(f"{len(y)} draws, {k} parameters, residual sd {s_res:.3f} on {dof} df (prior sigma {sig})")
    for i, n in enumerate(['mean'] + names):
        se = sig * math.sqrt(V[i][i])
        eff = beta[i] * (1 if i == 0 else 2)
        print(f"  {n:6s} {'level' if i == 0 else 'on-off'} {eff:+.3f}  (se {se * (1 if i == 0 else 2):.3f})")
    best = [1 if beta[i + 1] >= 0 else -1 for i in range(k - 1)]
    pred = beta[0] + sum(beta[i + 1] * best[i] for i in range(k - 1))
    print("best cell by the main-effects model: " + ', '.join(f"{n} {'on' if v > 0 else 'off'}" for n, v in zip(names, best)) + f"; predicted {pred:.3f}")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    f = sub.add_parser('factorial'); f.add_argument('scores', nargs=8, type=float); f.add_argument('--sig', type=float, default=SIG)
    a = sub.add_parser('arm'); a.add_argument('--leader', nargs='+', type=float, required=True); a.add_argument('--arm', nargs='+', type=float, required=True)
    a.add_argument('--c', type=float, default=0.0); a.add_argument('--sig', type=float, default=SIG)
    q = sub.add_parser('qualify'); q.add_argument('--mean', type=float, required=True); q.add_argument('--sd', type=float, default=SIG)
    q.add_argument('--n', type=int, required=True); q.add_argument('--line', type=float, required=True)
    s = sub.add_parser('sigma'); s.add_argument('scores', nargs='+', type=float)
    sub.add_parser('design')
    t = sub.add_parser('fit'); t.add_argument('csv'); t.add_argument('--sig', type=float, default=SIG)
    x = ap.parse_args()
    if x.cmd == 'factorial':
        factorial(x.scores, x.sig)
    elif x.cmd == 'arm':
        arm(x.leader, x.arm, x.c, x.sig)
    elif x.cmd == 'design':
        design()
    elif x.cmd == 'fit':
        fit(x.csv, x.sig)
    elif x.cmd == 'qualify':
        qualify(x.mean, x.sd, x.n, x.line)
    else:
        sd = statistics.stdev(x.scores)
        print(f"sample sd of {len(x.scores)} same-build draws: {sd:.3f}; scale every threshold by {max(1.0, sd / SIG):.2f}")
