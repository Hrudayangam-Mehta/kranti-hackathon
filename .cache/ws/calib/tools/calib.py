#!/usr/bin/env python3
"""Calibration driver for the dev simulator (runs roster bots only through their sandboxed proc command)."""
import json, os, subprocess, sys, time, hashlib, argparse
S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/calib'
P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
T = S + '/tree'
BUN = P + '/bun'
ARENA = '/srv/mech-sparring/_arena'
ROSTER = json.load(open(P + '/notes/sparring_roster.json'))
BYNAME = {r['name']: r for r in ROSTER}

def spec(name):
    if name.startswith('ours:') or name.startswith('/') or name == 'ours':
        return name
    r = BYNAME[name]
    assert r['status'] == 'runnable'
    return 'proc:' + r['proc']

def run(bot, seeds, out, params=None, mode='squad', opponents=None, jobs=2, tree=T, extra=()):
    cmd = ['taskset', '-c', '2,3', BUN, 'sim/run.js', '--bot', spec(bot) if bot != 'ours' else 'ours', '--mode', mode,
           '--seeds', ','.join(map(str, seeds)), '--jobs', str(jobs), '--map-dir', ARENA,
           '--log-dir', tree + '/runs/simlogs', '--json', out, '--quiet']
    if params: cmd += ['--params', params]
    if opponents: cmd += ['--opponents', opponents]
    cmd += list(extra)
    t0 = time.time()
    p = subprocess.run(cmd, cwd=tree, capture_output=True, text=True)
    if p.returncode != 0:
        return {'error': (p.stderr or p.stdout)[-800:], 'wall': time.time() - t0}
    d = json.load(open(out))
    d['summary']['wall'] = round(time.time() - t0, 1)
    return d

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd'); ap.add_argument('--bots', default=''); ap.add_argument('--seeds', default='1,2')
    ap.add_argument('--outdir', required=True); ap.add_argument('--params', default=None)
    a = ap.parse_args()
    seeds = [int(x) for x in a.seeds.split(',')]
    os.makedirs(a.outdir, exist_ok=True)
    if a.cmd == 'smoke':
        names = a.bots.split(',') if a.bots else [r['name'] for r in ROSTER if r['status'] == 'runnable']
        res = {}
        resf = a.outdir + '/smoke_summary.json'
        if os.path.exists(resf): res = json.load(open(resf))
        for n in names:
            if n in res and 'error' not in res[n]: continue
            d = run(n, seeds, a.outdir + '/' + n + '.json', params=a.params)
            if 'error' in d:
                res[n] = {'error': d['error']}
            else:
                s = d['summary']; m = d['matches']
                res[n] = {'official': BYNAME[n].get('official_score'), 'conf': BYNAME[n].get('score_link_confidence'), 'mean': s['meanScore'], 'scores': [x['score'] for x in m],
                          'alive': s['meanTimeAlive'], 'lates': s['lates'], 'errors': s['errors'], 'fallback': any(x.get('fallback') for x in m), 'maxMs': max(x.get('maxMs', 0) for x in m), 'wall': s['wall'], 'causes': s['causes']}
            print(n, res[n] if 'error' not in res[n] else 'ERROR ' + res[n]['error'][-200:], flush=True)
            json.dump(res, open(resf, 'w'), indent=1)
