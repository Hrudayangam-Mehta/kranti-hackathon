# QA compare: A-pairs (MX_meta vs MX_base2, same digit table) must be byte-identical; B (bundle lib at a slot) vs C (MX_base2,
# same table with m -> 1): digit slot => identical and no meta; m slot => forced FFA identical with 0 decisions on; otherwise
# differences only at or after the first decision with the meta on; counters never move while off; errors 0, fuse 0 everywhere.
import json, glob, os, sys
O = sys.argv[1] if len(sys.argv) > 1 else 'out/'
def meta(n):
    f = O + n + '.meta.json'
    return json.load(open(f)) if os.path.exists(f) else None
def lines(n): return open(O + n + '.jsonl').read().split('\n')
def side(n): return open(O + n + '.side').read().split('\n')
bad = 0; rows = []
# A pairs
tot = 0; pairs = 0
for f in sorted(glob.glob(O + 'A*_MX_meta.meta.json')):
    n = os.path.basename(f)[:-len('_MX_meta.meta.json')]
    a, b = meta(n + '_MX_meta'), meta(n + '_MX_base2')
    if not a or not b: rows.append(('A', n, 'MISSING')); continue
    la, lb = lines(n + '_MX_meta'), lines(n + '_MX_base2')
    d = sum(1 for x, y in zip(la, lb) if x != y) + abs(len(la) - len(lb))
    v = 'ok' if d == 0 and not a['hasMeta'] and a['errors'] == 0 and b['errors'] == 0 and a['fuse'] == 0 and b['fuse'] == 0 else 'BAD'
    if v != 'ok': bad += 1
    tot += d; pairs += 1
    rows.append(('A', n, repr(a['salt']), 'n', a['n'], 'differ', d, 'hasMeta', a['hasMeta'], 'env', a['finalEnv'], 'err', a['errors'], b['errors'], 'fuse', a['fuse'], b['fuse'], v))
# B vs C
tables = {'MT_A': 'mmmmmmmm11111111', 'MT_B': '12111111mmmmmmmm', 'MT_ALL': 'mmmmmmmmmmmmmmmm'}
totB = 0; pairsB = 0; mdiff = {}
for f in sorted(glob.glob(O + 'B_*_meta.meta.json')):
    n = os.path.basename(f)[:-len('_meta.meta.json')]          # B_MT_A_s0_kit_squad
    parts = n.split('_'); b = '_'.join(parts[1:-3]); sl = int(parts[-3][1:]); sn, e = parts[-2], parts[-1]
    tb = tables[b]; ch = tb[sl]; bt = tb.replace('m', '1')
    cn = f'C_{bt}_s{sl}_{sn}_{e}_base'
    m, c = meta(n + '_meta'), meta(cn)
    if not m or not c: rows.append(('B', n, 'MISSING')); continue
    lm, lc = lines(n + '_meta'), lines(cn)
    sd = side(n + '_meta')
    diffs = [i for i, (x, y) in enumerate(zip(lm, lc)) if x != y]
    if len(lm) != len(lc): diffs.append(-2)
    on = [i for i, s in enumerate(sd) if s.startswith('1')]
    firstOn = on[0] if on else -1
    first = diffs[0] if diffs else -1
    v = 'ok'
    if m['salt'] != tb or m['slot'] != sl: v = 'BAD table/slot'
    if ch != 'm':
        if m['hasMeta'] or diffs: v = 'BAD digit slot: meta or differences'
    else:
        if not m['hasMeta']: v = 'BAD m slot without meta'
        if e == 'ffa' and (diffs or m['onN']): v = 'BAD forced FFA differs or meta on'
        if diffs and (firstOn < 0 or first < firstOn): v = 'BAD differs before the meta is first on'
        if m['ffaOn'] or m['offCntChange']: v = 'BAD on in FFA / counters moved while off'
    if m['errors'] or c['errors'] or m['fuse'] or c['fuse']: v += ' ERR/FUSE %d/%d %d/%d' % (m['errors'], c['errors'], m['fuse'], c['fuse'])
    if not v.startswith('ok'): bad += 1
    totB += len(diffs); pairsB += 1
    key = (sn, e, ch); mdiff.setdefault(key, set()).add((len(diffs), first, m['onN'], json.dumps(m['cnt'], separators=(',', ':')) if m['cnt'] else None))
    rows.append(('B', n, ch, 'n', m['n'], 'differ', len(diffs), 'first', first, 'on', m['onN'], 'firstOn', firstOn, 'env', m['finalEnv'], 'maxMs', m['maxMs'], v))
for r in rows: print(*r)
print('A pairs', pairs, 'differing decisions', tot)
print('B pairs', pairsB, 'differing decisions', totB)
print('per (stream, env, slot char): distinct (differ, first, onN, counters)')
for k in sorted(mdiff): print(' ', k, sorted(mdiff[k]))
print('BAD rows', bad)
