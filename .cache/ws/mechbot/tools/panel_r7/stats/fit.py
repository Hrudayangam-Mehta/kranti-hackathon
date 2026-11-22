#!/usr/bin/env python3
"""Hierarchical (ridge / empirical-Bayes) fit of the official practice draws.  Standard library only.

Model: score = mu_V4 + sum_j x_j * beta_j + eps,  beta_j ~ N(0, tau^2),  eps ~ N(0, sigma^2) per 48-seed draw.
(sigma, tau) get a grid posterior from the marginal likelihood (Bayesian model averaging); optionally sigma also
uses the external re-roll pairs (other teams, notes/measured_deltas.md D04-D08 + R4's list) as extra evidence.

usage: python3 -I fit.py [draws.csv] [--no-external] [--builds NAME=f1+f2,...]
"""
import csv, math, random, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
EXTERNAL_PAIRS = [0.06, 0.27, 0.02, 0.15, 0.33, 0.15, 0.25]   # |d| of same-build re-rolls (panel_r4_schedule 1.1)

def read(path):
    rows = []
    with open(path) as f:
        lines = [l for l in f if l.strip() and not l.lstrip().startswith('#')]
    rd = csv.DictReader(lines)
    facs = [c for c in rd.fieldnames if c not in ('id', 'salt', 'score')]
    for r in rd:
        rows.append((r['id'], int(r['salt']), float(r['score']), [float(r[c] or 0) for c in facs]))
    return facs, rows

# ---------- tiny dense linear algebra ----------
def chol(A):
    n = len(A); L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = A[i][j] - sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                if s <= 0: raise ValueError('not PD')
                L[i][i] = math.sqrt(s)
            else:
                L[i][j] = s / L[j][j]
    return L

def chol_solve(L, b):
    n = len(L); y = [0.0] * n
    for i in range(n): y[i] = (b[i] - sum(L[i][k] * y[k] for k in range(i))) / L[i][i]
    x = [0.0] * n
    for i in reversed(range(n)): x[i] = (y[i] - sum(L[k][i] * x[k] for k in range(i + 1, n))) / L[i][i]
    return x

def inv_from_chol(L):
    n = len(L); cols = []
    for j in range(n):
        e = [0.0] * n; e[j] = 1.0; cols.append(chol_solve(L, e))
    return [[cols[j][i] for j in range(n)] for i in range(n)]

def fit_grid(facs, rows, use_external=True, sig_grid=None, tau_grid=None, m0=5.0, v_mu=1.0):
    X = [[1.0] + r[3] for r in rows]; y = [r[2] for r in rows]; n = len(y); p = len(X[0])
    sig_grid = sig_grid or [0.08 + 0.01 * i for i in range(33)]          # 0.08 .. 0.40
    tau_grid = tau_grid or [0.005] + [0.02 * i for i in range(1, 21)]   # ~0 .. 0.40
    out = []
    for s in sig_grid:
        for t in tau_grid:
            V0 = [v_mu] + [t * t] * (p - 1)
            S = [[(s * s if i == j else 0.0) + sum(X[i][k] * V0[k] * X[j][k] for k in range(p)) for j in range(n)] for i in range(n)]
            L = chol(S); r = [y[i] - m0 for i in range(n)]
            a = chol_solve(L, r)
            logdet = 2 * sum(math.log(L[i][i]) for i in range(n))
            ll = -0.5 * (n * math.log(2 * math.pi) + logdet + sum(r[i] * a[i] for i in range(n)))
            if use_external:   # each pair: d ~ N(0, 2 s^2)
                ll += sum(-0.5 * math.log(2 * math.pi * 2 * s * s) - d * d / (4 * s * s) for d in EXTERNAL_PAIRS)
            # posterior of b given (s, t)
            P = [[sum(X[i][a_] * X[i][b_] for i in range(n)) / (s * s) + (1.0 / V0[a_] if a_ == b_ else 0.0) for b_ in range(p)] for a_ in range(p)]
            rhs = [sum(X[i][a_] * y[i] for i in range(n)) / (s * s) + (m0 / V0[a_] if a_ == 0 else 0.0) for a_ in range(p)]
            LP = chol(P); mean = chol_solve(LP, rhs); cov = inv_from_chol(LP)
            out.append((s, t, ll, mean, cov))
    mx = max(o[2] for o in out)
    w = [math.exp(o[2] - mx) for o in out]; Z = sum(w); w = [x / Z for x in w]
    return out, w

def summarise(facs, rows, out, w, builds, nsamp=20000, seed=7):
    p = len(facs) + 1
    # marginal posteriors of sigma, tau
    sig = {}; tau = {}
    for (s, t, _, _, _), wi in zip(out, w):
        sig[round(s, 3)] = sig.get(round(s, 3), 0) + wi; tau[round(t, 3)] = tau.get(round(t, 3), 0) + wi
    def q(d, qs):
        ks = sorted(d); c = 0; res = []; qi = 0
        for k in ks:
            c += d[k]
            while qi < len(qs) and c >= qs[qi]: res.append(k); qi += 1
        return res
    es = sum(k * v for k, v in sig.items()); et = sum(k * v for k, v in tau.items())
    print('sigma per draw: posterior mean %.3f, median %.3f, 80%% interval %s' % (es, q(sig, [0.5])[0], q(sig, [0.1, 0.9])))
    print('tau (true effect sd of one preset item): posterior mean %.3f, median %.3f, 80%% interval %s' % (et, q(tau, [0.5])[0], q(tau, [0.1, 0.9])))
    # BMA effect summaries
    names = ['mu_V4'] + facs
    print('\nEffects against V4 (BMA posterior; raw single-draw readings are in draws.csv):')
    for j, nm in enumerate(names):
        m = sum(wi * o[3][j] for o, wi in zip(out, w))
        v = sum(wi * (o[4][j][j] + o[3][j] ** 2) for o, wi in zip(out, w)) - m * m
        # P(effect > 0)
        print('  %-7s %+.3f  sd %.3f' % (nm, m, math.sqrt(max(v, 0))) if j else '  %-7s %.3f  sd %.3f' % (nm, m, math.sqrt(max(v, 0))))
    # build means by Monte Carlo from the mixture
    rng = random.Random(seed)
    cum = []; c = 0
    for wi in w: c += wi; cum.append(c)
    chols = {}
    bnames = list(builds)
    samples = {b: [] for b in bnames}
    best = {b: 0 for b in bnames}
    import bisect
    for _ in range(nsamp):
        k = min(bisect.bisect_left(cum, rng.random()), len(out) - 1)
        if k not in chols: chols[k] = chol(out[k][4])
        L = chols[k]; z = [rng.gauss(0, 1) for _ in range(p)]
        b = [out[k][3][i] + sum(L[i][j] * z[j] for j in range(i + 1)) for i in range(p)]
        vals = {}
        for bn in bnames:
            x = builds[bn]; vals[bn] = b[0] + sum(b[1 + facs.index(f)] for f in x)
            samples[bn].append(vals[bn])
        best[max(vals, key=vals.get)] += 1
    print('\nBuild true means (posterior; P(best) among the listed builds):')
    for bn in bnames:
        s_ = sorted(samples[bn]); m = sum(s_) / len(s_)
        print('  %-10s %.3f  sd %.3f  80%% [%.2f, %.2f]  P(best) %.2f' % (bn, m, math.sqrt(sum((x - m) ** 2 for x in s_) / len(s_)),
              s_[int(0.1 * len(s_))], s_[int(0.9 * len(s_))], best[bn] / nsamp))
    return samples

def raw_checks(rows):
    y = [r[2] for r in rows]; n = len(y); m = sum(y) / n
    ss = sum((v - m) ** 2 for v in y)
    print('All %d draws: mean %.3f, sd %.3f (if every build had the same mean, this sd estimates sigma)' % (n, m, math.sqrt(ss / (n - 1))))
    for s in (0.15, 0.17, 0.20, 0.24):
        chi = ss / (s * s)
        # chi-square survival with n-1 df (series for upper tail via regularized gamma)
        k = (n - 1) / 2.0; x = chi / 2.0
        # lower regularized gamma by series
        term = 1.0 / k; tot = term
        for i in range(1, 300):
            term *= x / (k + i); tot += term
        P = tot * math.exp(-x + k * math.log(x) - math.lgamma(k))
        print('  homogeneity test at sigma %.2f: chi2 = %.1f on %d df, p = %.2f' % (s, chi, n - 1, 1 - P))
    v4 = [r[2] for r in rows if r[0] == 'V4']
    if len(v4) >= 2:
        mv = sum(v4) / len(v4); sv = math.sqrt(sum((a - mv) ** 2 for a in v4) / (len(v4) - 1))
        print('V4 salts %s: mean %.3f, sd %.3f (%d df)' % (v4, mv, sv, len(v4) - 1))

def main():
    args = sys.argv[1:]
    path = next((a for a in args if a.endswith('.csv')), os.path.join(HERE, 'draws.csv'))
    use_ext = '--no-external' not in args
    facs, rows = read(path)
    raw_checks(rows)
    builds = {'V4': [], 'S': ['seek'], 'K0': ['Aoff', 'Boff', 'Coff', 'Foff'], 'KS': ['Aoff', 'Boff', 'Coff', 'Foff', 'seek'],
              'H': ['h50'], 'HL': ['lite'], 'V1': ['Don'], 'S01full': ['P1off', 'Aoff', 'Boff', 'Coff', 'Eoff', 'Foff'],
              'V2': ['Don', 'P1off']}
    for a in args:
        if a.startswith('--builds='):
            for spec in a.split('=', 1)[1].split(','):
                nm, fs = spec.split(':'); builds[nm] = [f for f in fs.split('+') if f]
    builds = {k: v for k, v in builds.items() if all(f in facs for f in v)}
    print('\n=== BMA over (sigma, tau), external re-roll pairs %s ===' % ('ON' if use_ext else 'OFF'))
    out, w = fit_grid(facs, rows, use_external=use_ext)
    summarise(facs, rows, out, w, builds)
    for s_fix, t_fix in ((0.17, 0.10), (0.24, 0.15)):
        print('\n=== fixed sigma %.2f, tau %.2f ===' % (s_fix, t_fix))
        out2, w2 = fit_grid(facs, rows, use_external=False, sig_grid=[s_fix], tau_grid=[t_fix])
        summarise(facs, rows, out2, w2, builds, nsamp=8000)

if __name__ == '__main__':
    main()
