#!/usr/bin/env python3
"""Per-match summary rows for named teams in the recorded showdowns (data from sd_load).
usage: sd_summary.py TEAM [TEAM...]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sd_load
d = sd_load.load()
HOUR = {'2026-11-20T20-00': '8PM(01:00Z)', '2026-11-20T21-00': '9PM(02:00Z)', '2026-11-20T22-00': '10PM(03:00Z)', '2026-11-20T23-00': '11PM(04:00Z)'}
d.sort(key=lambda r: (r['hdr']['showdown']['id'], r['hdr']['showdown']['match']))
for team in sys.argv[1:]:
    print('=====', team)
    places = []
    for r in d:
        i = sd_load.idx(r, team)
        if i < 0: continue
        res = r['result']['mechs'][i]
        names = [m['name'] for m in r['hdr']['mechs']]
        img = r['hdr']['bots'][i][-6:]
        kb = res.get('killed_by')
        kbn = (names[kb] if isinstance(kb, int) and 0 <= kb < 16 else ('drone' if isinstance(kb, int) and kb >= 100 else str(kb)))
        places.append(res['place'])
        print('%-12s m%d seed %-10s img %s place %2d kills %d dealt %5d taken %5d cubes %2d life %6s first_w %5s loadout %-20s by_w %s' % (
            HOUR[r['hdr']['showdown']['id']], r['hdr']['showdown']['match'], r['seed'], img, res['place'], res['kills'], res['damage_dealt'],
            res['damage_taken'], res['cubes_max'], ('%.1f' % res['death_t']) if res.get('death_t') is not None else 'alive',
            res.get('first_weapon_t'), '+'.join(res['loadout']), {k: int(v) for k, v in res['damage_by_weapon'].items()}))
        print('              upgrades %s | killed_by %s with %s (killer loadout %s) drops %s spawn %s' % (
            res['upgrades'], kbn, res.get('killed_with'), res.get('killer_loadout'), res.get('drops_taken'), [round(x) for x in r['hdr']['mechs'][i]['spawn'][:2]]))
    if places:
        print('n=%d mean place %.2f mean points %.2f places %s' % (len(places), sum(places) / len(places), sum(16 - p for p in places) / len(places), places))
