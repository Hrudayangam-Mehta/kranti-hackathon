#!/usr/bin/env python3
"""DEV ONLY: writes a jobs file for tools/calib/pool.js.
  mkjobs.py --out jobs.jsonl --tag NAME --seeds 1-24 [--bots a,b,c | --all | --trusted] [--params FILE] [--ours]
Roster bots are run only through their recorded sandbox command (the "proc" field of notes/sparring_roster.json)."""
import argparse, json, os
P = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def roster():
    return [r for r in json.load(open(os.path.join(P, 'notes', 'sparring_roster.json'))) if r.get('status') == 'runnable']

def seeds(spec):
    out = []
    for part in spec.split(','):
        if '-' in part:
            a, b = part.split('-'); out += list(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True); ap.add_argument('--tag', required=True); ap.add_argument('--seeds', required=True)
    ap.add_argument('--bots', default=''); ap.add_argument('--all', action='store_true'); ap.add_argument('--trusted', action='store_true')
    ap.add_argument('--params', default=None); ap.add_argument('--ours', action='store_true'); ap.add_argument('--append', action='store_true')
    a = ap.parse_args()
    R = roster()
    by = {r['name']: r for r in R}
    if a.all: names = [r['name'] for r in R]
    elif a.trusted: names = [r['name'] for r in R if r.get('score_link_confidence') in ('high', 'medium') and r.get('official_score') is not None]
    else: names = [n for n in a.bots.split(',') if n]
    S = seeds(a.seeds)
    with open(a.out, 'a' if a.append else 'w') as f:
        # seeds outermost so that a partial run covers every bot evenly
        for s in S:
            for n in names:
                f.write(json.dumps({'id': f'{a.tag}|{n}|{s}', 'bot': 'proc:' + by[n]['proc'], 'tag': n, 'seed': s, 'mode': 'squad', 'paramsFile': a.params, 'timeout': 1000}) + '\n')
            if a.ours:
                f.write(json.dumps({'id': f'{a.tag}|ours|{s}', 'bot': 'ours', 'tag': 'ours', 'seed': s, 'mode': 'squad', 'paramsFile': a.params}) + '\n')
    print(len(names) * len(S) + (len(S) if a.ours else 0), 'jobs ->', a.out)

if __name__ == '__main__':
    main()
