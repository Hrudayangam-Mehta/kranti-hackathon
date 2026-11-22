#!/usr/bin/env python3
"""Coordinate search over house parameters. Resumable: state in calib/out/search_state.json."""
import json, os, sys, copy, time, hashlib
sys.path.insert(0, os.path.dirname(__file__))
from calib import S
from evalset import evaluate
DEF = json.load(open(S + '/default_params.json'))
TIERS = ['easy', 'medium', 'hard', 'expert']

def build(x):
    """x: dict of calibration knobs -> override object for --params (house tiers + squad)."""
    o = {'house': {}, 'squad': {}}
    sq = o['squad']
    sq['huntersStart'] = x['hps']; sq['huntersPerKill'] = x['hpk']; sq['allFromS'] = x['allFrom']
    sq['passiveFactor'] = x['passive']; sq['defendRadius'] = x['defR']; sq['holdFireMult'] = x['holdFire']
    sq['fightBackS'] = x['fightBack']; sq['huntClose'] = x['huntClose']; sq['huntPrefTof'] = x['huntBand']
    sq['knows'] = x['knows']; sq['lostAfterS'] = x['lost']
    for t in TIERS:
        b = DEF['house'][t]; h = {}
        h['reactionS'] = round(b['reactionS'] * x['react'], 3)
        h['lootRadius'] = round(b['lootRadius'] * x['loot'], 1); h['cubeRadius'] = round(b['cubeRadius'] * x['loot'], 1)
        h['crateRange'] = round(b['crateRange'] * x['loot'], 1)
        if x['aimExact'] and t in ('easy', 'medium'):
            h['aimSigmaDeg'] = 0; h['lead'] = 1.0
        h['fireProb'] = round(min(1.0, b['fireProb'] * x['duty']), 3)
        o['house'][t] = h
    return o

X0 = {'hps': 1, 'hpk': 1, 'allFrom': 300, 'passive': 0.5, 'defR': 15, 'holdFire': 0.25, 'fightBack': 1.5, 'huntClose': 0.6,
      'huntBand': None, 'knows': 'vision', 'lost': 6, 'react': 1.0, 'loot': 1.0, 'aimExact': 0, 'duty': 1.0}

def key(x): return hashlib.sha1(json.dumps(x, sort_keys=True).encode()).hexdigest()[:10]

CAL = ['magic_53f6854', 'ttun_v8econ_b7e9a6d', 'th3r0n_expJ_7775214', 'bd_lancecharge_dfe5cdd', 'nullatom_7a3a25a', 'ourux_v4_2d700d7',
       'joek_v0_333fb36', 'gtgoats_03a8f93', 'achintya_734a0cf', 'dmcl_0ed6ffc', 'colton_hide_285afd7', 'kit_starter']
HOLD = ['r1ver_ts_af337d5', 'mauro_v14_b75320f', 'ourux_hide_e5fb3a9']
BOUNDS = {'hps': (1, 3), 'hpk': (0.5, 2), 'allFrom': (180, 420), 'passive': (0.25, 1), 'defR': (10, 150), 'holdFire': (0.1, 1),
          'fightBack': (1, 10), 'huntClose': (0.2, 1), 'lost': (3, 20), 'react': (0.3, 2), 'loot': (0.5, 2), 'duty': (0.6, 1.5)}
# candidate moves per knob (absolute values, filtered by bounds); a knob can move several others with it
MOVES = [
    ('hpk', [0.5, 1.5, 2]), ('allFrom', [200, 240, 360]), ('hps', [2, 3]), ('aimExact', [1]),
    ('defR', [40, 90]), ('holdFire', [0.6, 1.0]), ('fightBack', [5]), ('huntClose', [0.3, 0.9]), ('huntBand', [[0.4, 0.6], [0.25, 0.4]]),
    ('passive', [1.0, 0.25]), ('react', [0.5, 1.6]), ('loot', [0.6, 1.6]), ('duty', [0.75, 1.35]), ('knows', ['always']), ('lost', [15]),
]

def main():
    import argparse
    ap = argparse.ArgumentParser(); ap.add_argument('--seeds', default='1-12'); ap.add_argument('--sweeps', type=int, default=2)
    ap.add_argument('--margin', type=float, default=0.03); a = ap.parse_args()
    lo, hi = map(int, a.seeds.split('-')); seeds = list(range(lo, hi + 1))
    stf = S + '/out/search_state.json'
    st = json.load(open(stf)) if os.path.exists(stf) else {'best': X0, 'bestLoss': None, 'tried': {}, 'history': []}
    def ev(x):
        k = key(x)
        if k in st['tried']: return st['tried'][k]
        r = evaluate(build(x), CAL, seeds, 's_' + k)
        st['tried'][k] = {'loss': r['loss'], 'mae': r['mae'], 'rho': r['rho'], 'bias': r['bias'], 'x': x}
        json.dump(st, open(stf, 'w'), indent=1)
        print(time.strftime('%H:%M:%S'), 'eval', k, json.dumps(x), 'loss', r['loss'], 'mae', r['mae'], 'rho', r['rho'], 'bias', r['bias'], 'wall', r['wall'], flush=True)
        return st['tried'][k]
    if st['bestLoss'] is None:
        st['bestLoss'] = ev(st['best'])['loss']
    for sw in range(a.sweeps):
        improved = False
        for knob, vals in MOVES:
            for v in vals:
                x = copy.deepcopy(st['best'])
                if x[knob] == v: continue
                x[knob] = v
                r = ev(x)
                if r['loss'] < st['bestLoss'] - a.margin:
                    st['best'] = x; st['bestLoss'] = r['loss']; improved = True
                    st['history'].append({'sweep': sw, 'knob': knob, 'value': v, 'loss': r['loss'], 'mae': r['mae'], 'rho': r['rho']})
                    json.dump(st, open(stf, 'w'), indent=1)
                    print('  ACCEPT', knob, v, r['loss'], flush=True)
        if not improved: break
    print('BEST', json.dumps(st['best']), st['bestLoss'], flush=True)

if __name__ == '__main__':
    main()
