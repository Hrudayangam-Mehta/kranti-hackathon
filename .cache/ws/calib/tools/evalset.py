#!/usr/bin/env python3
"""Evaluate one house-parameter table on a bot set: 2 worker slots (cores 2,3), run.js --jobs 1 per seed chunk."""
import json, os, subprocess, sys, time, threading, queue, hashlib, math, copy
sys.path.insert(0, os.path.dirname(__file__))
from calib import S, P, T, BUN, ARENA, BYNAME, spec

def spearman(a, b):
    def ranks(v):
        idx = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
        while i < len(v):
            j = i
            while j + 1 < len(v) and v[idx[j + 1]] == v[idx[i]]: j += 1
            for k in range(i, j + 1): r[idx[k]] = (i + j) / 2 + 1
            i = j + 1
        return r
    ra, rb = ranks(a), ranks(b); n = len(a)
    ma, mb = sum(ra) / n, sum(rb) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb)); va = sum((x - ma) ** 2 for x in ra); vb = sum((y - mb) ** 2 for y in rb)
    return cov / math.sqrt(va * vb) if va > 0 and vb > 0 else 0.0

def run_items(items, params_file, outdir, tree=T, mode='squad', opponents=None, slots=2, extra=()):
    q = queue.Queue()
    for it in items: q.put(it)
    results = {}; lock = threading.Lock()
    def worker():
        while True:
            try: bot, chunk, key = q.get_nowait()
            except queue.Empty: return
            out = f'{outdir}/{key}.json'
            if not os.path.exists(out):
                cmd = ['taskset', '-c', '2,3', BUN, 'sim/run.js', '--bot', spec(bot) if bot != 'ours' else 'ours', '--mode', mode,
                       '--seeds', ','.join(map(str, chunk)), '--jobs', '1', '--map-dir', ARENA, '--log-dir', tree + '/runs/simlogs',
                       '--json', out + '.tmp', '--quiet'] + list(extra)
                if params_file: cmd += ['--params', params_file]
                if opponents: cmd += ['--opponents', opponents]
                p = subprocess.run(cmd, cwd=tree, capture_output=True, text=True)
                if p.returncode != 0:
                    with lock: results[key] = {'error': (p.stderr or p.stdout)[-600:]}
                    continue
                os.replace(out + '.tmp', out)
            d = json.load(open(out))
            with lock: results[key] = d
    ths = [threading.Thread(target=worker) for _ in range(slots)]
    for t in ths: t.start()
    for t in ths: t.join()
    return results

def evaluate(params, bots, seeds, tag, chunk=6, tree=T, offset=None):
    """params: dict (full override object) or None. Returns per-bot means, mae, rho."""
    pdir = S + '/params'; os.makedirs(pdir, exist_ok=True)
    pf = None
    if params is not None:
        pf = f'{pdir}/{tag}.json'; json.dump(params, open(pf, 'w'), indent=1)
    outdir = f'{S}/out/evals/{tag}'; os.makedirs(outdir, exist_ok=True)
    items = []
    for b in bots:
        for i in range(0, len(seeds), chunk):
            c = seeds[i:i + chunk]; items.append((b, c, f'{b}__{c[0]}_{c[-1]}'))
    t0 = time.time()
    res = run_items(items, pf, outdir, tree=tree)
    per = {}
    for b in bots:
        recs = []
        for (bb, c, key) in items:
            if bb != b: continue
            r = res.get(key, {})
            if 'error' in r: per[b] = {'error': r['error']}; break
            recs += r['matches']
        if b in per: continue
        sc = [m['score'] for m in recs]; n = len(sc); mu = sum(sc) / n
        sd = math.sqrt(sum((x - mu) ** 2 for x in sc) / (n - 1)) if n > 1 else 0
        per[b] = {'mean': round(mu, 3), 'se': round(sd / math.sqrt(n), 3), 'n': n, 'official': BYNAME[b]['official_score'] if b in BYNAME else None,
                  'alive': round(sum(m['timeAlive'] for m in recs) / n, 1), 'kills': round(sum(m['kills'] for m in recs) / n, 2), 'lates': sum(m['lates'] for m in recs)}
    ok = [b for b in bots if 'error' not in per[b] and per[b]['official'] is not None]
    sim = [per[b]['mean'] for b in ok]; off = [per[b]['official'] for b in ok]
    mae = sum(abs(a - b) for a, b in zip(sim, off)) / len(ok) if ok else None
    bias = sum(a - b for a, b in zip(sim, off)) / len(ok) if ok else None
    rho = spearman(sim, off) if len(ok) > 2 else None
    summ = {'tag': tag, 'mae': round(mae, 3), 'bias': round(bias, 3), 'rho': round(rho, 3), 'loss': round(mae + 0.5 * (1 - rho), 3), 'per': per, 'wall': round(time.time() - t0, 1), 'seeds': [seeds[0], seeds[-1], len(seeds)]}
    json.dump(summ, open(f'{outdir}/summary.json', 'w'), indent=1)
    with open(S + '/out/evals/log.jsonl', 'a') as f: f.write(json.dumps({k: summ[k] for k in ('tag', 'mae', 'bias', 'rho', 'loss', 'wall', 'seeds')}) + '\n')
    return summ
