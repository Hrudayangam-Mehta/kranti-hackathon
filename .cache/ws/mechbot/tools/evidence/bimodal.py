#!/usr/bin/env python3
# Per-match point distributions in other teams' LOCAL SIMULATOR logs (not official data). Parses CSV only.
import csv, sys, collections
root = sys.argv[1]
def summ(name, pts):
    n = len(pts); c = collections.Counter(pts)
    lo = sum(v for k, v in c.items() if k <= 2); win = c.get(15, 0); mid = n - lo - win
    print(f"{name}: n={n} mean={sum(pts)/n:.3f} win15={win} ({win/n:.0%}) le2={lo} ({lo/n:.0%}) mid={mid} ({mid/n:.0%}) 15*P(win)={15*win/n:.2f}")
# moonriver results.csv: practice experiments have slot 0/0
rows = list(csv.DictReader(open(root + '/moonriver0922__wgsrobot/experiments/results.csv')))
for exp in ('inner-circle', 'roof-loot', 'ttun-v7-practice'):
    b = [int(r['baseline_points']) for r in rows if r['experiment'] == exp]
    c = [int(r['candidate_points']) for r in rows if r['experiment'] == exp]
    summ('moonriver sim ' + exp + ' baseline', b); summ('moonriver sim ' + exp + ' candidate', c)
cal = list(csv.DictReader(open(root + '/moonriver0922__wgsrobot/experiments/calibration-19551.csv')))
for k in cal[0]:
    if k != 'seed': summ('moonriver sim calibration ' + k, [int(r[k]) for r in cal])
ref = list(csv.DictReader(open(root + '/Borovail__builders-mech-royale/results/referee-calibration.csv')))
for k in ('starter_score', 'e10_score'):
    summ('Borovail sim ' + k, [int(r[k]) for r in ref])
