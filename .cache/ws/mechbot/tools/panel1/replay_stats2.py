import gzip, json, sys, math, collections
path=sys.argv[1]
f=gzip.open(path,'rt')
hdr=json.loads(f.readline())
names={m['id']:m['name'] for m in hdr['mechs']}
ek=collections.Counter(); samples={}
deaths=[]; dropev=[]; res=None
dmg_by_dist=collections.defaultdict(list)
pos={}
for line in f:
    o=json.loads(line)
    if o.get('type')=='result': res=o; continue
    if 'm' not in o: continue
    for r in o['m']: pos[r[0]]=r
    for e in o.get('ev',[]):
        k=e.get('e'); ek[k]+=1
        samples.setdefault(k,e)
        if k=='death': deaths.append(e)
        if k=='drop': dropev.append(e)
print(dict(ek))
for k,e in samples.items(): print(' ',k,json.dumps(e)[:220])
print('DEATHS')
for e in deaths: print(' ', json.dumps(e)[:220])
print('DROPS', [json.dumps(e) for e in dropev])
print('RESULT')
for m in sorted(res['mechs'], key=lambda m:m['place']):
    print(' place',m['place'],m['name'],m['id'],'kills',m['kills'],'dealt',m['damage_dealt'],'taken',m['damage_taken'],'byW',m['damage_by_weapon'],'cubes',m['cubes_max'],'upg',m['upgrades'],'load',m['loadout'],'death_t',m['death_t'],'by',m.get('killed_by'),m.get('killed_with'),'drops',m.get('drops_taken'),'eff',m.get('effects'))
