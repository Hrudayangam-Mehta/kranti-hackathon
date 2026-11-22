import json,glob,sys
tag=sys.argv[1]
ds=[json.load(open(f)) for f in sorted(glob.glob('out/%s/*.meta.json'%tag))]
tot=dict(n=0,k=0)
rows=[]
for d in ds:
    h=d['hist']; e=h[-1]; T=e['t']
    def first(th):
        for x in h:
            if x['hp']<th and all(y['hp']<th+0.15 for y in h[h.index(x):]): return x
        return None
    # last descent: last time hp >= 0.5
    i50=max([i for i,x in enumerate(h) if x['hp']>=0.5] or [0]); i25=max([i for i,x in enumerate(h) if x['hp']>=0.25] or [0])
    s50=h[i50]; s25=h[i25]
    seg=h[i50:]
    tgs=[x['tg'] for x in seg if x['tg'] not in (None,'npc')]
    sw=sum(1 for a,b in zip(tgs,tgs[1:]) if a!=b)
    modes={}
    for x in seg: modes[x['mode']]=modes.get(x['mode'],0)+1
    rows.append(dict(seed=d['a1'],k=d['kills'],T=T,cause=d['cause'],t50=round(T-s50['t'],1),t25=round(T-s25['t'],1),dmg50=round(e['dOut']-s50['dOut']),dmg25=round(e['dOut']-s25['dOut']),sw50=sw,w=e['w'],wHp=e['wHp'],minW=e['minW'],tgHp=e['tgHp'],tgD=e['tgD'],n1=e['n1'],a3=e['a3'],mode=e['mode'],leg=e['leg'],laser=e['laser'],ls=e['ls'],modes=modes,n1at50=s50['n1'],los=e['los']))
for r in rows: print(r)
n=len(rows); A=lambda k:sum(r[k] for r in rows if r[k] is not None)/n
print(tag,'n',n,'kills',sum(r['k'] for r in rows),'mean t50',A('t50'),'t25',A('t25'),'dmg50',A('dmg50'),'dmg25',A('dmg25'),'sw50',A('sw50'),'wounded at death',A('w'),'wHp(sum of missing frac)',A('wHp'),'tgHp',A('tgHp'),'n1',A('n1'),'a3',A('a3'))
