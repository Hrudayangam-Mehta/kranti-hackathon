#!/usr/bin/env python3
"""Brute-force tactics search on the local simulator (Fable panel, target 9). Standard library only.

  python3 -I search.py check-space
  python3 -I search.py run --name NAME [--gen oat|random|file] [--n N] [--file cands.json] [--rng 1]
                           [--stages 12,24,48] [--keep 0.3334] [--chunk 12] [--seed0 101] [--jobs 3] [--kmax 3] [--fuse off|keep] [--no-stop]
  python3 -I search.py report --name NAME

Candidates are brain-parameter overrides evaluated with `sim/run.js --overrides` on the 5.38 variant (wb/bot ->
variants6/FNV_s1/bot), paired by match seed against the base (overrides {}). Successive halving: every candidate
gets the first stage's seeds, the best `keep` fraction go on to the next stage, and so on. A candidate stops early
when its paired mean delta is more than 2 standard errors below the base, or when it is inert (every match identical
to the base). A batch with a fuse trip, a brain error, a fallback or a late answer is discarded and rerun.
Everything is appended to runs/NAME/log.jsonl. The simulator ranks nothing officially: see search_engine.md.
"""
import argparse, json, math, os, random, subprocess, sys, threading, time
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED

HERE = os.path.dirname(os.path.abspath(__file__))
SCRATCH = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BUN = os.path.join(SCRATCH, 'mechbot', 'bun')
WB = os.path.join(HERE, 'wb')
JSC = dict(BUN_JSC_useFTLJIT='0', BUN_JSC_useConcurrentJIT='1', BUN_JSC_useConcurrentGC='0', BUN_JSC_numberOfGCMarkers='1',
           BUN_JSC_numberOfBaselineCompilerThreads='1', BUN_JSC_numberOfDFGCompilerThreads='1', BUN_JSC_numberOfFTLCompilerThreads='1',
           BUN_JSC_minNumberOfWorklistThreads='1', BUN_JSC_maxNumberOfWorklistThreads='1')
MAX_JOBS = 3
LOCK = threading.Lock()


def load_space():
    return json.load(open(os.path.join(HERE, 'space.json')))


def canon(ov):
    return json.dumps(ov, sort_keys=True, separators=(',', ':'))


def fingerprint(m):
    return (m['place'], m['kills'], m['timeAlive'], m['dmgDealt'], m['dmgTaken'], m.get('cause'))


class Log:
    def __init__(self, path):
        self.f = open(path, 'a')

    def write(self, ev, **kw):
        rec = dict(ev=ev, t=round(time.time(), 2), **kw)
        with LOCK:
            self.f.write(json.dumps(rec, separators=(',', ':')) + '\n')
            self.f.flush()


class Runner:
    """Runs one simulator batch (one candidate, a list of seeds) and validates it."""

    def __init__(self, rundir, log, retries=2, fuse='off'):
        self.rundir, self.log, self.retries, self.fuse = rundir, log, retries, fuse
        self.n_batches = self.n_matches = self.n_discarded = 0
        self.cpu_wall = 0.0
        os.makedirs(os.path.join(rundir, 'ov'), exist_ok=True)
        os.makedirs(os.path.join(rundir, 'out'), exist_ok=True)

    def batch(self, cid, ov, seeds, real_fuse=False, retries=None):
        if self.fuse == 'off' and not real_fuse:
            ov = {**ov, 'fuseMs': 1e9}   # the fuse is the brain's only wall-clock branch: off = the trajectory of a run without a trip
        strict = self.fuse == 'keep' or real_fuse
        ovp = os.path.join(self.rundir, 'ov', cid + '.json')
        with LOCK:
            if not os.path.exists(ovp):
                json.dump(ov, open(ovp, 'w'))
        last = None
        for attempt in range((self.retries if retries is None else retries) + 1):
            outp = os.path.join(self.rundir, 'out', '%s_s%d_n%d_a%d.json' % (cid, seeds[0], len(seeds), attempt))
            cmd = ['nice', '-n', '19', BUN, 'sim/run.js', '--bot', 'ours', '--mode', 'squad', '--seeds', ','.join(map(str, seeds)),
                   '--jobs', '1', '--overrides', ovp, '--json', outp, '--quiet']
            t0 = time.time()
            try:
                p = subprocess.run(cmd, cwd=WB, env={**os.environ, **JSC}, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120 + 30 * len(seeds))
                rc, err = p.returncode, p.stderr.decode('utf8', 'replace')[-400:]
            except subprocess.TimeoutExpired:
                rc, err = -9, 'timeout'
            wall = time.time() - t0
            ms, why = [], []
            if rc != 0:
                why.append('rc %s %s' % (rc, err))
            else:
                try:
                    ms = json.load(open(outp))['matches']
                except Exception as e:  # noqa
                    why.append('no json %s' % e)
            if not why:
                got = sorted(m['seed'] for m in ms)
                if got != sorted(seeds):
                    why.append('seeds missing')
                for k in (('fuse', 'errors', 'brainErrors', 'lates') if strict else ('fuse', 'errors', 'brainErrors')):
                    n = sum(int(m.get(k) or 0) for m in ms)
                    if n:
                        why.append('%s %d' % (k, n))
                if any(m.get('fallback') for m in ms):
                    why.append('fallback')
            with LOCK:
                self.n_batches += 1
                self.cpu_wall += wall
            if not why:
                with LOCK:
                    self.n_matches += len(ms)
                recs = [dict(seed=m['seed'], score=m['score'], kills=m['kills'], alive=m['timeAlive'], dealt=m['dmgDealt'], taken=m['dmgTaken'],
                             cause='%s/%s' % (m.get('cause'), m.get('killerRole')), maxMs=m.get('maxMs'), fp=fingerprint(m)) for m in ms]
                self.log.write('batch', cand=cid, seeds=seeds, attempt=attempt, wall_s=round(wall, 2), lates=sum(int(m.get('lates') or 0) for m in ms), matches=recs)
                return recs
            with LOCK:
                self.n_discarded += 1
            self.log.write('discard', cand=cid, seeds=seeds, attempt=attempt, wall_s=round(wall, 2), why=why)
            last = why
        self.log.write('batch_failed', cand=cid, seeds=seeds, why=last)
        return None


def stats(deltas):
    n = len(deltas)
    if n == 0:
        return dict(n=0, mean=0.0, sd=0.0, se=0.0)
    mean = sum(deltas) / n
    sd = math.sqrt(sum((d - mean) ** 2 for d in deltas) / (n - 1)) if n > 1 else 0.0
    return dict(n=n, mean=mean, sd=sd, se=sd / math.sqrt(n) if n else 0.0)


class Cand:
    def __init__(self, cid, ov, desc):
        self.cid, self.ov, self.desc = cid, ov, desc
        self.m = {}           # seed -> match record
        self.status = 'run'   # run | inert | stopped | cut | failed | final
        self.stage = 0

    def summary(self, base):
        seeds = sorted(s for s in self.m if s in base)
        d = [self.m[s]['score'] - base[s]['score'] for s in seeds]
        st = stats(d)
        st['differ'] = sum(1 for s in seeds if tuple(self.m[s]['fp']) != tuple(base[s]['fp']))
        st['up'] = sum(1 for x in d if x > 0)
        st['down'] = sum(1 for x in d if x < 0)
        st['kills'] = sum(self.m[s]['kills'] - base[s]['kills'] for s in seeds) / max(1, len(seeds))
        st['alive'] = sum(self.m[s]['alive'] - base[s]['alive'] for s in seeds) / max(1, len(seeds))
        st['score'] = sum(self.m[s]['score'] for s in seeds) / max(1, len(seeds))
        st['base'] = sum(base[s]['score'] for s in seeds) / max(1, len(seeds))
        return {k: (round(v, 4) if isinstance(v, float) else v) for k, v in st.items()}


def gen_oat(space):
    out = []
    for e in space:
        for i, v in enumerate(e['values']):
            out.append((dict(v), '%s=%s' % (e['name'], json.dumps(v, separators=(',', ':')) if e['name'] != 'upgradeOrder' else 'order%d' % (i + 1))))
    return out


def gen_random(space, n, rng, kmax):
    out, seen = [], set()
    tries = 0
    while len(out) < n and tries < 100 * n:
        tries += 1
        k = rng.randint(1, kmax)
        ov, parts = {}, []
        for e in rng.sample(space, k):
            i = rng.randrange(len(e['values']))
            ov.update(e['values'][i])
            parts.append('%s#%d' % (e['name'], i + 1))
        c = canon(ov)
        if c in seen:
            continue
        seen.add(c)
        out.append((ov, ' + '.join(parts)))
    return out


def cmd_check_space(a):
    space = load_space()
    keys = sorted({k for e in space for k in e['base']})
    js = ("import { resolveParams, PARAMS } from './bot/lib/params.js'; const P = resolveParams({}); const keys = %s; const o = {}; "
          "for (const k of keys) o[k] = { v: P[k], known: Object.prototype.hasOwnProperty.call(PARAMS, k) }; o.__salt = { v: P.salt }; o.__sel = { v: P.selected }; console.log(JSON.stringify(o))") % json.dumps(keys)
    p = subprocess.run([BUN, '-e', js], cwd=WB, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode:
        print(p.stderr.decode()); return 1
    got = json.loads(p.stdout.decode().strip().splitlines()[-1])
    bad = 0
    for e in space:
        for k, v in e['base'].items():
            if not got[k]['known']:
                print('UNKNOWN KEY', e['name'], k); bad += 1
            elif got[k]['v'] != v:
                print('BASE MISMATCH', e['name'], k, 'space', v, 'variant', got[k]['v']); bad += 1
        for val in e['values']:
            for k in val:
                if k not in e['base']:
                    print('VALUE KEY NOT IN BASE', e['name'], k); bad += 1
            if all(e['base'][k] == val[k] for k in val if k in e['base']):
                print('VALUE EQUALS BASE', e['name'], val); bad += 1
    print('space: %d params, %d keys, %d one-change candidates; variant salt %s; mismatches %d' % (len(space), len(keys), sum(len(e['values']) for e in space), got['__salt']['v'], bad))
    sel = got['__sel']['v']
    print('variant SELECT:', {k: sel[k] for k in ('laserRange', 'farmHp', 'laserEcon', 'focus', 'retreat', 'upg', 'seek', 'aggr', 'fb', 'loseCover')})
    return 1 if bad else 0


def cmd_run(a):
    if a.jobs > MAX_JOBS:
        print('jobs capped at', MAX_JOBS); a.jobs = MAX_JOBS
    space = load_space()
    rng = random.Random(a.rng)
    if a.gen == 'oat':
        cl = gen_oat(space)
        if a.n and a.n < len(cl):
            cl = rng.sample(cl, a.n)
    elif a.gen == 'random':
        cl = gen_random(space, a.n or 30, rng, a.kmax)
    else:
        cl = [(c['ov'], c.get('desc', canon(c['ov'])[:80])) for c in json.load(open(a.file))]
        if a.n:
            cl = cl[:a.n]
    stages = [int(x) for x in a.stages.split(',')]
    rundir = os.path.join(HERE, 'runs', a.name)
    os.makedirs(rundir, exist_ok=True)
    log = Log(os.path.join(rundir, 'log.jsonl'))
    cands = [Cand('c%04d' % (i + 1), ov, desc) for i, (ov, desc) in enumerate(cl)]
    log.write('start', name=a.name, gen=a.gen, n=len(cands), stages=stages, keep=a.keep, chunk=a.chunk, seed0=a.seed0, jobs=a.jobs, rng=a.rng, fuse=a.fuse,
              variant=os.path.realpath(os.path.join(WB, 'bot')), load=os.getloadavg(), cands=[dict(id=c.cid, desc=c.desc, ov=c.ov) for c in cands])
    R = Runner(rundir, log, fuse=a.fuse)
    T0 = time.time()
    base = {}
    # base cache shared by every run of this variant
    cache_p = os.path.join(HERE, 'base_cache_fuse%s.json' % a.fuse)
    cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    variant = os.path.realpath(os.path.join(WB, 'bot'))
    cache = cache if cache.get('variant') == variant else dict(variant=variant, m={})
    ex = ThreadPoolExecutor(max_workers=a.jobs)

    def chunks(seeds):
        return [seeds[i:i + a.chunk] for i in range(0, len(seeds), a.chunk)]

    def ensure_base(seeds, check=False):
        need = [s for s in seeds if str(s) not in cache['m']]
        futs = [ex.submit(R.batch, 'base', {}, ch) for ch in chunks(need)]
        chk = ex.submit(R.batch, 'basechk', {}, seeds[:a.chunk]) if check else None
        chk2 = ex.submit(R.batch, 'basefuse', {}, seeds[:a.chunk], True, 0) if check and a.fuse == 'off' else None
        for f in futs:
            r = f.result()
            if r is None:
                raise SystemExit('base batch failed three times: stop (machine too loaded?)')
            for m in r:
                cache['m'][str(m['seed'])] = m
        json.dump(cache, open(cache_p, 'w'))
        for s in seeds:
            base[s] = cache['m'][str(s)]
        if chk is not None:
            r = chk.result()
            same = r is not None and all(tuple(m['fp']) == tuple(base[m['seed']]['fp']) for m in r)
            log.write('determinism', seeds=seeds[:a.chunk], identical=bool(same))
            print('determinism check (base twice on %d seeds): %s' % (min(a.chunk, len(seeds)), 'identical' if same else 'DIFFERENT - results are not reproducible'))
        if chk2 is not None:
            r = chk2.result()
            res = 'not testable now (the real fuse tripped under load)' if r is None else ('identical' if all(tuple(m['fp']) == tuple(base[m['seed']]['fp']) for m in r) else 'DIFFERENT')
            log.write('fuse_equivalence', seeds=seeds[:a.chunk], result=res)
            print('fuse-off equals a trip-free run with the real fuse (%d seeds): %s' % (min(a.chunk, len(seeds)), res))

    def judge(c):
        """Early-stop rules after a chunk. Returns the summary."""
        s = c.summary(base)
        if not a.no_stop and s['n'] >= min(12, stages[0]):
            if s['differ'] == 0:
                c.status = 'inert'
            elif s['mean'] < 0 and s['mean'] < -2 * s['se']:
                c.status = 'stopped'
        return s

    seed_next = a.seed0
    alive = list(cands)
    for si, nseeds in enumerate(stages):
        seeds = list(range(seed_next, seed_next + nseeds)); seed_next += nseeds
        ts = time.time()
        ensure_base(seeds, check=(si == 0))
        queue = {c.cid: chunks(seeds) for c in alive}
        byid = {c.cid: c for c in alive}
        futs = {}
        for c in alive:
            c.stage = si + 1
            futs[ex.submit(R.batch, c.cid, c.ov, queue[c.cid].pop(0))] = c.cid
        while futs:
            done, _ = wait(list(futs), return_when=FIRST_COMPLETED)
            for f in done:
                c = byid[futs.pop(f)]
                r = f.result()
                if r is None:
                    c.status = 'failed'
                else:
                    for m in r:
                        c.m[m['seed']] = m
                    s = judge(c)
                    log.write('cand', id=c.cid, stage=si + 1, status=c.status, **s)
                if c.status == 'run' and queue[c.cid]:
                    futs[ex.submit(R.batch, c.cid, c.ov, queue[c.cid].pop(0))] = c.cid
        ok = [c for c in alive if c.status == 'run']
        ok.sort(key=lambda c: -c.summary(base)['mean'])
        last = si == len(stages) - 1
        nkeep = len(ok) if last else max(1, math.ceil(len(alive) * a.keep))
        for c in ok[nkeep:]:
            c.status = 'cut'
        keep = ok[:nkeep]
        if last:
            for c in keep:
                c.status = 'final'
        log.write('stage_end', stage=si + 1, seeds=[seeds[0], seeds[-1]], entered=len(alive), kept=[c.cid for c in keep], wall_s=round(time.time() - ts, 1),
                  status={k: sum(1 for c in alive if c.status == k) for k in ('run', 'final', 'cut', 'stopped', 'inert', 'failed')})
        print('stage %d: seeds %d-%d, entered %d, kept %d, %.0f s' % (si + 1, seeds[0], seeds[-1], len(alive), len(keep), time.time() - ts))
        alive = keep
        if not alive:
            break
    wall = time.time() - T0
    thr = dict(wall_s=round(wall, 1), matches=R.n_matches, batches=R.n_batches, discarded_batches=R.n_discarded, matches_per_s=round(R.n_matches / wall, 3),
               batch_wall_sum_s=round(R.cpu_wall, 1), jobs=a.jobs, load=os.getloadavg())
    rank = sorted(cands, key=lambda c: (-c.stage, -c.summary(base)['mean']))
    log.write('final', throughput=thr, ranking=[dict(id=c.cid, desc=c.desc, ov=c.ov, status=c.status, stage=c.stage, **c.summary(base)) for c in rank])
    print_table(rank, base, thr)
    ex.shutdown()
    return 0


def print_table(rank, base, thr):
    print('%-6s %-8s %2s %4s %7s %6s %6s %4s %3s %3s %7s  %s' % ('id', 'status', 'st', 'n', 'dScore', 'se', 't', 'dif', 'up', 'dn', 'dKills', 'change'))
    for c in rank:
        s = c.summary(base) if not isinstance(c, dict) else c
        desc = c.desc if not isinstance(c, dict) else c['desc']
        cid = c.cid if not isinstance(c, dict) else c['id']
        status = c.status if not isinstance(c, dict) else c['status']
        stage = c.stage if not isinstance(c, dict) else c['stage']
        t = s['mean'] / s['se'] if s['se'] > 0 else 0.0
        print('%-6s %-8s %2d %4d %+7.3f %6.3f %+6.2f %4d %3d %3d %+7.3f  %s' % (cid, status, stage, s['n'], s['mean'], s['se'], t, s['differ'], s['up'], s['down'], s['kills'], desc[:90]))
    if thr:
        print('throughput:', json.dumps(thr))


def cmd_report(a):
    fin = None
    for line in open(os.path.join(HERE, 'runs', a.name, 'log.jsonl')):
        r = json.loads(line)
        if r['ev'] == 'final':
            fin = r
    if not fin:
        print('no final record yet'); return 1
    print_table(fin['ranking'], None, fin['throughput'])
    return 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('check-space')
    r = sub.add_parser('run')
    r.add_argument('--name', required=True); r.add_argument('--gen', default='oat', choices=['oat', 'random', 'file'])
    r.add_argument('--n', type=int, default=0); r.add_argument('--file'); r.add_argument('--rng', type=int, default=1)
    r.add_argument('--stages', default='12,24,48'); r.add_argument('--keep', type=float, default=1 / 3); r.add_argument('--chunk', type=int, default=12)
    r.add_argument('--seed0', type=int, default=101); r.add_argument('--jobs', type=int, default=3); r.add_argument('--kmax', type=int, default=3)
    r.add_argument('--fuse', default='off', choices=['off', 'keep']); r.add_argument('--no-stop', action='store_true')
    p = sub.add_parser('report'); p.add_argument('--name', required=True)
    a = ap.parse_args()
    sys.exit({'check-space': cmd_check_space, 'run': cmd_run, 'report': cmd_report}[a.cmd](a))


if __name__ == '__main__':
    main()
