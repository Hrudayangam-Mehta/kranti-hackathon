#!/usr/bin/env python3
"""Per-scenario summary of force.mjs output (jsonl). usage: python3 -I summ.py <force_*.jsonl> ..."""
import json, sys, collections
for fn in sys.argv[1:]:
    R = [json.loads(l) for l in open(fn) if l.startswith('{')]
    by = collections.OrderedDict()
    for r in R: by.setdefault(r['sc'], []).append(r)
    print(fn.split('/')[-1])
    print('  scen        n  rank  win  zoneD zoneDmg outZ_max stuckEp maxStk  escT(max) err fb maxMs fuse ovr env   causes')
    for sc, L in by.items():
        n = len(L)
        zd = sum(1 for r in L if r['cause'] == 'zone')
        esc = [r['escT'] for r in L if r.get('escT') is not None]
        causes = collections.Counter(('alive' if r['alive'] else r['cause']) for r in L)
        envs = collections.Counter(r['env'] for r in L)
        print('  %-10s %2d %5.2f %4d %6d %7.0f %8.1f %7d %6.1f %10s %3d %2d %5.1f %4d %3d %s %s' % (
            sc, n, sum(r['rank'] for r in L) / n, sum(1 for r in L if r['rank'] == 1), zd, sum(r['zoneDmg'] for r in L) / n,
            max(r['outZoneS'] for r in L), sum(r['stuckEp'] for r in L), max(r['maxStuck'] for r in L),
            ('%.1f' % max(esc)) if esc else '-', sum(r['errors'] for r in L), sum(1 for r in L if r['fallback']), max(r['maxMs'] for r in L),
            sum(r['fuse'] for r in L), sum(r['overruns'] for r in L), dict(envs), dict(causes)))
