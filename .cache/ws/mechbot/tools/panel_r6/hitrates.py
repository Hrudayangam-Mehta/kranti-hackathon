"""Panel R6 I/O: our gun hit rate by range and laser beam outcomes from sim traces. Usage: python3 -I hitrates.py DIR [DIR...]"""
import gzip, json, glob, sys, collections
for D in sys.argv[1:]:
    bins = [(0, 40), (40, 80), (80, 130), (130, 240)]
    c = collections.Counter(); lz = collections.Counter(); dealt = 0
    for f in sorted(glob.glob(D + '/*.json.gz')):
        d = json.load(gzip.open(f, 'rt')); s = d['slot']
        for sh in d['shots']:
            t, by, tg, rng, hit = sh[:5]
            if by != s or tg is None or tg >= 100: continue
            for lo, hi in bins:
                if lo <= rng < hi: c[(lo, 'n')] += 1; c[(lo, 'h')] += hit
            c['n'] += 1; c['h'] += hit
        for e in d['events']:
            if e['e'] == 'laser' and e.get('id') == s:
                lz['beams'] += 1; lz['mech'] += 1 if e['mh'] else 0; lz['other'] += 1 if (not e['mh'] and e['nh']) else 0
                lz['partial'] += 1 if e['frac'] < 0.99 else 0
        dealt += sum(x[3] for x in d['dmg'] if x[1] == s and x[2] is not None and x[2] < 100)
    row = ' '.join(f"{lo}-{hi}m {c[(lo,'h')]}/{c[(lo,'n')]}={c[(lo,'h')]/max(1,c[(lo,'n')]):.3f}" for lo, hi in bins)
    print(D.split('/')[-1], f"gun at mechs {c['h']}/{c['n']}={c['h']/max(1,c['n']):.3f} |", row, '| laser', dict(lz), f'| dmg to mechs {dealt:.0f}')
