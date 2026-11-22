#!/usr/bin/env python3
"""Build the submission-time table (track -> team -> distinct 'at' times) from the
saved leaderboard snapshots.  Reads only local files; writes JSON.
usage: subtimes.py <web_dir>[,<more_dirs>] <out.json>
The current rank order is taken from the newest snapshot file (by modification time)."""
import json, re, sys, os, collections

webs, out = sys.argv[1].split(','), sys.argv[2]
ROW = re.compile(r'\{\\"at\\":\\"([^"\\]+)\\",\\"rank\\":(\d+),\\"team\\":\\"((?:[^"\\]|\\\\.)*?)\\",\\"score\\":([0-9.eE+-]+)\}')
TITLE = re.compile(r'\\"title\\":\\"([^"\\]+)\\"')
STAND = re.compile(r'\\"standings\\":\[')

def tracks(text):
    """yield (track_key, rows) for each standings array in a page"""
    for m in STAND.finditer(text):
        end = text.find(']', m.end())
        rows = [(r.group(1), int(r.group(2)), r.group(3), float(r.group(4))) for r in ROW.finditer(text, m.end(), end)]
        if not rows: continue
        titles = [t for t in TITLE.finditer(text, max(0, m.start() - 2500), m.start())]
        title = titles[-1].group(1) if titles else '?'
        yield title, rows

def key_of(title, rows):
    if any(t == 'A-bot LLC' for _, _, t, _ in rows) or 'Mech Royale' in title: return 'mech'
    if 'Shopping' in title: return 'shopping'
    if 'CAD' in title: return 'cad'
    return 'blast'      # RWX Blast Radius (title sits further back in the page)

table = collections.defaultdict(lambda: collections.defaultdict(dict))
snap = {}
pages = sorted((os.path.getmtime(os.path.join(w, fn)), fn, os.path.join(w, fn))
               for w in webs for fn in os.listdir(w) if fn.endswith('.html'))
latest_mech = None
for mt, fn, path in pages:
    text = open(path, encoding='utf-8', errors='replace').read()
    got = []
    for title, rows in tracks(text):
        if key_of(title, rows) == 'mech': latest_mech = (fn, rows)
        k = key_of(title, rows)
        got.append((k, title, len(rows)))
        for at, rank, team, score in rows:
            team = team.replace('\\\\u0026', '&')
            d = table[k][team].setdefault(at, {'score': score, 'src': []})
            if fn not in d['src']: d['src'].append(fn)
    if got: snap[fn] = got
now = [[rank, team.replace('\\\\u0026', '&'), score, at] for at, rank, team, score in latest_mech[1]]
order = {t: r for r, t, s, a in now}
res = {'snapshots': snap, 'rank_source': latest_mech[0], 'rank_now': order, 'score_now': {t: s for r, t, s, a in now}, 'tracks': {}}
for k in table:
    res['tracks'][k] = {}
    for team in sorted(table[k], key=lambda t: (order.get(t, 999), t)):
        res['tracks'][k][team] = [{'at': at, 'score': v['score'], 'src': v['src']} for at, v in sorted(table[k][team].items())]
json.dump(res, open(out, 'w'), indent=1)
for fn, g in snap.items(): print(fn, g)
for k in res['tracks']:
    print(k, 'teams', len(res['tracks'][k]), 'times', sum(len(v) for v in res['tracks'][k].values()))
top = [t for r, t, s, a in now[:16]]
print('\ntop16 across tracks:')
for t in top:
    print(' %-28s' % t, {k: [(x['at'][11:19], x['score']) for x in res['tracks'][k].get(t, [])] for k in res['tracks'] if t in res['tracks'][k]})
