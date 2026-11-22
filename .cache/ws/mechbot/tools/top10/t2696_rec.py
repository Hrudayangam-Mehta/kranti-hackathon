# Team 2696 in the recorded showdowns (data only). Per match: image id, place, kills, loadout, cubes, upgrades,
# death; and whether its image id equals TigerTown27's image in the same match.
import gzip, json, sys, collections, math
data = json.load(gzip.open(sys.argv[1], 'rt'))
want = sys.argv[2] if len(sys.argv) > 2 else '2696'
for mi, m in enumerate(data):
    hdr = m['hdr']; res = {r['id']: r for r in m['result']['mechs']}
    names = {mm['id']: mm['name'] for mm in hdr['mechs']}
    ids = [i for i, n in names.items() if n == want]
    if not ids: continue
    i = ids[0]; r = res[i]
    img = hdr['bots'][i]
    tt = [j for j, n in names.items() if n == 'TigerTown27']
    ttimg = hdr['bots'][tt[0]] if tt else None
    print(f"match {mi} seed {m['seed']} frames {len(m['frames'])} | {want} id {i} img ..{str(img)[-8:]} | TT img ..{str(ttimg)[-8:] if ttimg else '-'} same={img==ttimg}")
    print(f"   place {r['place']} kills {r['kills']} dealt {round(r['damage_dealt'])} taken {round(r['damage_taken'])} cubes {r['cubes_max']} loadout {r['loadout']} first_w {r['first_weapon_t']} death_t {r['death_t']} killed_by {names.get(r['killed_by'], r['killed_by'])} with {r['killed_with']} ({r['killer_loadout']})")
    print(f"   upgrades {r['upgrades']}  dmg_by_weapon {r.get('damage_by_weapon')}")
