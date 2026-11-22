#!/usr/bin/env python3
"""Find commit subjects that state a number equal to a leaderboard score, and list the teams
holding that score (any track) at a submission time before the commit.
usage: score_mentions.py <subtimes.json> <commits.tsv[,more]> [--max-min 240]"""
import json, sys, re, datetime, collections
sub = json.load(open(sys.argv[1]))
maxmin = int(sys.argv[sys.argv.index('--max-min') + 1]) if '--max-min' in sys.argv else 240
ep = lambda s: datetime.datetime.fromisoformat(s).timestamp()
hm = lambda t: datetime.datetime.utcfromtimestamp(t).strftime('%H:%M:%S')
by_score = collections.defaultdict(list)
for k, teams in sub['tracks'].items():
    for team, lst in teams.items():
        for x in lst: by_score[(k, round(x['score'], 2))].append((team, ep(x['at'])))
NUM = re.compile(r'(?<![\w.])(\d{1,3}\.\d{1,2})(?![\w.]*\d)')
def track_of(repo, subj):
    b = (repo + ' ' + subj).lower()
    if re.search('shopping|databricks|session', b): return ['shopping']
    if re.search('blast|rwx', b): return ['blast']
    if re.search('cad|deid|de-id|machina', b): return ['cad']
    return ['mech', 'shopping', 'blast', 'cad']
rows = []
for fn in sys.argv[2].split(','):
    for line in open(fn, encoding='utf-8'):
        p = line.rstrip('\n').split('\t')
        if len(p) < 8: continue
        repo, ct, subj = p[0], int(p[2]), p[7]
        if re.search(r'\bv?\d+\.\d+\.\d+', subj): pass
        for m in NUM.finditer(subj):
            val = round(float(m.group(1)), 2)
            pre = subj[max(0, m.start() - 2):m.start()].lower()
            if pre.endswith('v') or pre.endswith('v.'): continue
            for k in track_of(repo, subj):
                for team, T in by_score.get((k, val), []):
                    dt = (ct - T) / 60
                    if -3 <= dt <= maxmin:
                        rows.append((repo, hm(ct), k, val, team, hm(T), round(dt, 1), subj[:120]))
for r in sorted(set(rows)): print('%-44s commit %s | %-8s %-6s = %-26s (submitted %s, %5.1f min before) | %s' % r)
