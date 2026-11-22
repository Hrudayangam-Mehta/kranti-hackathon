#!/usr/bin/env python3
"""Print the best candidates per team from score_pairs.py output.
usage: report.py <subtimes.json> <pairs.json> [--top N] [--teams 'A|B|C' | --first 16] [--scope mech|owner] [--brief]
p_f   = Fisher combination over all the team's times;  E_f = p_f * number of candidates compared
p_all = (largest u)^n : chance that an unrelated candidate is at least this close on EVERY time"""
import json, sys, collections
sub = json.load(open(sys.argv[1])); res = json.load(open(sys.argv[2]))
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
top = int(arg('--top', 3)); scope = arg('--scope', 'mech'); brief = '--brief' in sys.argv
order = sub['rank_now']
teams = arg('--teams', None)
teams = teams.split('|') if teams else sorted(order, key=lambda t: order[t])[:int(arg('--first', 16))]
ncmp = res['n_mech_repos'] if scope == 'mech' else res['n_owners']
by = collections.defaultdict(list)
for p in res[scope]: by[p['team']].append(p)
for t in teams:
    print('\n#%s %s (score now %s)' % (order.get(t, '-'), t, sub.get('score_now', {}).get(t, '?')))
    for p in sorted(by.get(t, []), key=lambda x: x['p'])[:top]:
        us = [d.get('u', 1.0) if d['gap'] is not None else 1.0 for d in p['detail']]
        pall = max(us) ** len(us)
        print('  %-46s p_f=%.1e E_f=%.2g | p_all=%.1e E_all=%.2g | hits6=%d/%d' % (p['cand'], p['p'], p['E'], pall, pall * ncmp, p['hits6'], p['n']))
        if brief: continue
        for d in p['detail']:
            if d['gap'] is None: print('      %-8s %s %-6s  (no commit before)' % (d['track'], d['at'], d['score'])); continue
            print('      %-8s %s %-6s gap %6.0fs u=%.4f  %s [%s] %s%s' % (d['track'], d['at'], d['score'], d['gap'], d['u'], d['commit'],
                  d['author'][:12], d['subject'][:72], ('  (+next commit %ss after)' % d['post']) if d.get('post') is not None else ''))
