"""DEV ONLY: shared statistics for the calibration scripts (standard library only)."""
import json, math, os
P = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def roster():
    return {r['name']: r for r in json.load(open(os.path.join(P, 'notes', 'sparring_roster.json'))) if r.get('status') == 'runnable'}

def load(path, tag=None):
    out = {}
    if not os.path.exists(path): return out
    for l in open(path):
        l = l.strip()
        if not l: continue
        try: r = json.loads(l)
        except Exception: continue
        if tag is not None and not str(r.get('id', '')).startswith(tag + '|'): continue
        out.setdefault(r['bot'], []).append(r)
    return out

def ranks(v):
    idx = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
    while i < len(idx):
        j = i
        while j + 1 < len(idx) and v[idx[j + 1]] == v[idx[i]]: j += 1
        for k in range(i, j + 1): r[idx[k]] = (i + j) / 2 + 1
        i = j + 1
    return r

def pearson(a, b):
    n = len(a)
    if n < 3: return float('nan')
    ma, mb = sum(a) / n, sum(b) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in a)); sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa > 0 and sb > 0 else float('nan')

def spearman(a, b): return pearson(ranks(a), ranks(b))

def bot_stats(recs):
    ok = [r for r in recs if not r.get('failed')]
    n = len(ok)
    if not n: return None
    sc = [r['score'] for r in ok]
    m = sum(sc) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in sc) / (n - 1)) if n > 1 else 0.0
    causes = {}
    for r in ok:
        c = 'alive' if r['alive'] else (r.get('cause') or 'unknown')
        causes[c] = causes.get(c, 0) + 1
    return {'n': n, 'mean': m, 'sd': sd, 'se': sd / math.sqrt(n), 'win': sum(1 for x in sc if x == 15) / n, 'low': sum(1 for x in sc if x <= 2) / n,
            'mid': sum(1 for x in sc if 2 < x < 15) / n, 'life': sum(r['timeAlive'] for r in ok) / n, 'kills': sum(r['kills'] for r in ok) / n,
            'causes': causes, 'failed': len(recs) - n, 'lates': sum(r.get('lates', 0) for r in ok), 'missed': sum(r.get('missed', 0) for r in ok),
            'dealt': sum(r['dmgDealt'] for r in ok) / n, 'taken': sum(r['dmgTaken'] for r in ok) / n, 'scores': sc}

def fit_metrics(by_bot, names, R=None):
    """Error of the simulated mean against the official score over `names` (those with results)."""
    R = R or roster()
    rows = []
    for nme in names:
        st = bot_stats(by_bot.get(nme, []))
        if not st or R[nme].get('official_score') is None: continue
        rows.append((nme, R[nme]['official_score'], st))
    if not rows: return None
    off = [r[1] for r in rows]; sim = [r[2]['mean'] for r in rows]; n = len(rows)
    err = [s - o for s, o in zip(sim, off)]
    allsc = [x for r in rows for x in r[2]['scores']]
    # least-squares line sim = a + b * official
    mo, ms = sum(off) / n, sum(sim) / n
    sxx = sum((o - mo) ** 2 for o in off)
    slope = sum((o - mo) * (s - ms) for o, s in zip(off, sim)) / sxx if sxx > 0 else float('nan')
    return {'n': n, 'mae': sum(abs(e) for e in err) / n, 'rmse': math.sqrt(sum(e * e for e in err) / n), 'bias': sum(err) / n,
            'spearman': spearman(off, sim), 'pearson': pearson(off, sim), 'slope': slope, 'intercept': ms - slope * mo,
            'mean_se': sum(r[2]['se'] for r in rows) / n,
            'win': sum(1 for x in allsc if x == 15) / len(allsc), 'low': sum(1 for x in allsc if x <= 2) / len(allsc), 'mid': sum(1 for x in allsc if 2 < x < 15) / len(allsc),
            'rows': rows}

def fmt(m):
    return (f"n={m['n']} MAE={m['mae']:.3f} RMSE={m['rmse']:.3f} bias={m['bias']:+.3f} spearman={m['spearman']:.3f} pearson={m['pearson']:.3f} "
            f"slope={m['slope']:.2f} mean_se={m['mean_se']:.2f} win={m['win']*100:.1f}% low(0-2)={m['low']*100:.1f}% mid={m['mid']*100:.1f}%")
