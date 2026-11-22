#!/usr/bin/env python3
"""DEV ONLY: one calibration evaluation = the FIT bots x the fixed fit seeds under one house-parameter table.
  fit_eval.py --tag T [--params FILE] [--set fit|holdout] [--seeds 1-24] [--workers 3] [--table]
Appends a summary line to runs/calib/evals.jsonl and prints the loss."""
import argparse, json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import metrics as M
P = M.P

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tag', required=True); ap.add_argument('--params', default=None); ap.add_argument('--set', default='fit')
    ap.add_argument('--seeds', default=None); ap.add_argument('--workers', default='3'); ap.add_argument('--table', action='store_true')
    ap.add_argument('--bots', default=None)
    a = ap.parse_args()
    sets = json.load(open(os.path.join(P, 'tools', 'calib', 'sets.json')))
    names = a.bots.split(',') if a.bots else sets[a.set]
    seeds = a.seeds or sets['fit_seeds']
    d = os.path.join(P, 'runs', 'calib')
    jobs = os.path.join(d, f'{a.tag}.jobs.jsonl'); out = os.path.join(d, f'{a.tag}.jsonl')
    params = os.path.abspath(a.params) if a.params else None
    subprocess.check_call([sys.executable, '-I', os.path.join(P, 'tools', 'calib', 'mkjobs.py'), '--out', jobs, '--tag', a.tag, '--seeds', seeds, '--bots', ','.join(names)] + (['--params', params] if params else []), stdout=subprocess.DEVNULL)
    t0 = time.time()
    subprocess.check_call([os.path.join(P, 'bun'), os.path.join(P, 'tools', 'calib', 'pool.js'), '--jobs-file', jobs, '--out', out, '--workers', a.workers], stderr=subprocess.DEVNULL)
    by = M.load(out, a.tag)
    m = M.fit_metrics(by, names)
    print(f'[{a.tag}] {M.fmt(m)}  wall={time.time()-t0:.0f}s')
    if a.table:
        for nme, off, st in m['rows']:
            print(f"  {nme:30s} off {off:5.2f} sim {st['mean']:5.2f} +-{st['se']:.2f} err {st['mean']-off:+5.2f} win {st['win']*100:4.0f}% low {st['low']*100:4.0f}% life {st['life']:5.0f}s kills {st['kills']:.1f} {st['causes']}")
    rec = {k: v for k, v in m.items() if k != 'rows'}
    rec.update({'tag': a.tag, 'params': params, 'set': a.set if not a.bots else 'custom', 'seeds': seeds, 'per_bot': {r[0]: round(r[2]['mean'], 3) for r in m['rows']}})
    with open(os.path.join(d, 'evals.jsonl'), 'a') as f: f.write(json.dumps(rec) + '\n')

if __name__ == '__main__':
    main()
