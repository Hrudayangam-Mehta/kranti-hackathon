# Summarise recorded showdown results for the tiger teams (data read only; nothing executed from the repo).
import gzip, json, sys, collections
path = sys.argv[1]
with gzip.open(path, 'rt') as f:
    data = json.load(f)
print('matches', len(data))
names = collections.Counter()
for mi, m in enumerate(data):
    res = m.get('result', {}).get('mechs', [])
    hdr = m.get('hdr', {})
    for r in res:
        names[r.get('name')] += 1
    print('--- match', mi, 'seed', m.get('seed'), 'ours', m.get('ours'), 'frames', len(m.get('frames', [])), 'tick_hz', hdr.get('tick_hz'))
    for r in sorted(res, key=lambda r: r.get('place', 99)):
        nm = str(r.get('name'))
        if 'iger' in nm or 'paw' in nm.lower() or r.get('place', 99) <= 3:
            print('   place', r.get('place'), nm, 'kills', r.get('kills'), 'dealt', round(r.get('damage_dealt', 0)), 'taken', round(r.get('damage_taken', 0)), 'cubes', r.get('cubes_max'), 'loadout', r.get('loadout'), 'first_w', r.get('first_weapon_t'), 'death_t', r.get('death_t'), 'killed_by', r.get('killed_by'), r.get('killed_with'), r.get('killer_loadout'), 'upg', r.get('upgrades'))
print(names.most_common())
