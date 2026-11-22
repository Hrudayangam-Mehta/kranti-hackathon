import gzip, json, sys, math, collections
path=sys.argv[1]
f=gzip.open(path,'rt')
hdr=json.loads(f.readline())
names={m['id']:m['name'] for m in hdr['mechs']}
evkinds=collections.Counter()
deaths=[]; drops=[]; upgrades=collections.Counter(); cube_ev=collections.Counter()
last={}  # id -> last frame row
outzone=collections.Counter(); alive_t=collections.Counter()
hits=collections.defaultdict(list)
sample_ev={}
frames=0
res=None
cubes_t={}
for line in f:
    o=json.loads(line)
    if 'm' not in o:
        res=o; continue
    t=o.get('t', frames*0.1); frames+=1
    z=o.get('z')
    for r in o['m']:
        i=r[0]; last[i]=(t,r)
        alive_t[i]+=0.1
        if z and r[6]>0:
            if math.hypot(r[1]-z[0], r[2]-z[1])>z[2]: outzone[i]+=0.1
    if int(round(t*10))%500==0:
        cubes_t[round(t)]={r[0]:(r[9],r[10],round(r[6])) for r in o['m'] if r[6]>0}
    for e in o.get('ev',[]):
        k=e.get('k') or e.get('type') or (e[0] if isinstance(e,list) else '?')
        evkinds[k]+=1
        if k not in sample_ev: sample_ev[k]=e
        if k=='death': deaths.append((t,e))
        if k=='drop': drops.append((t,e))
        if k=='upgrade': upgrades[json.dumps(e)[:80]]+=0; upgrades[str(e)]+=1
print('frames',frames,'evkinds',dict(evkinds))
for k,e in sample_ev.items(): print(' sample',k,json.dumps(e)[:200])
print('deaths'); 
for t,e in deaths:
    print('  %.1f'%t, json.dumps(e)[:200])
print('drops', [(round(t,1),json.dumps(e)) for t,e in drops])
print('result', json.dumps(res)[:1500])
print('outzone seconds', {names[i]+str(i):round(v,1) for i,v in outzone.items()})
for t,d in sorted(cubes_t.items()):
    print('t',t, {names[i][:3]+str(i):v for i,v in d.items()})
