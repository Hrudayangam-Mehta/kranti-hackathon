#!/usr/bin/env python3
"""render_cands.py -> the ranked table rows of notes/tweak_candidates.md (stdout) from cands30.json, reach/reach_sum.json and
the 24-seed sim comparison (sim12.json from simcmp.mjs JSON_OUT). The prose around the table is written by hand."""
import json, sys
T = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch'
C = json.load(open(T + '/cands30.json'))
R = json.load(open(T + '/reach/reach_sum.json'))
S = {}
try:
    for r in json.load(open(T + '/sim12.json')): S[r['tag']] = r
except FileNotFoundError:
    pass
tags = {k: t for t, k, v in json.load(open(T + '/cands12.json'))}
def reach(k):
    e = R['keys'].get(k)
    return '0 (not read)' if not e else '%.1f%% / %d of %d' % (100 * e['share'], e['matches'], R['seeds'])
def fmt(v):
    return v if isinstance(v, str) else json.dumps(v)
print('| # | key | now | move | behaviour it changes | why it could add kills before death (SQUAD) | expected divergence | read (gate-open decisions / matches, 12 seeds) | FFA-final exposure |')
print('|---|---|---|---|---|---|---|---|---|')
for i, c in enumerate(C, 1):
    k = c['key']
    div = c['div']
    t = tags.get(k)
    if t and t in S:
        s = S[t]
        cls = 'few' if s['diff'] <= 5 else 'some' if s['diff'] <= 15 else 'many'
        div = '**%s** (sim: %d of %d differ)' % (cls, s['diff'], s['of'])
    else:
        div = c['div'] + ' (est.)'
    print('| %d | `%s` | %s | %s | %s | %s | %s | %s | %s |' % (i, k, fmt(c['cur']), fmt(c['new']), c['beh'], c['why'], div, reach(k), c['exp']))
if S:
    print()
    print('| # | override (sqOverrides) | matches differing of 24 | first differing decision (median) | sim kills vs base (behaviour only) | mean life s | layer on (share of decisions) | fuse / errors |')
    print('|---|---|---|---|---|---|---|---|')
    for t, k, v in json.load(open(T + '/cands12.json')):
        s = S.get(t)
        if not s: continue
        rank = [c['key'] for c in C].index(k) + 1
        vv = 'mechanics order' if k == 'upgradeOrder' else json.dumps(v)
        print('| %d | `%s: %s` | **%d** | %s | %+d (%d) | %.1f | %.1f%% | %d / %d |' % (rank, k, vv, s['diff'], s['medFirst'] if s['medFirst'] >= 0 else '-', s['dk'], s['kills'], s['life'], 100 * s['twShare'], s['fuse'], s['errs']))
