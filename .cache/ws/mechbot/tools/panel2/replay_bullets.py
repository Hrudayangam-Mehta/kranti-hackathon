import gzip,json,math,collections,sys,statistics
f=gzip.open(sys.argv[1],'rt'); hdr=json.loads(f.readline()); bots=[b.split(':')[1] for b in hdr['bots']]
frames={}; proj=collections.defaultdict(list); evs=[]
for line in f:
    o=json.loads(line)
    if 'm' in o:
        frames[o['t']]={m[0]:m for m in o['m']}
        for p in o.get('p',[]) or []: proj[p[0]].append((o['t'],p[1],p[2],p[3],p[4]))
    for e in o.get('ev',[]) or []: evs.append(e)
imp={e['p']:e for e in evs if e['e']=='impact'}
fires=collections.defaultdict(list)
for e in evs:
    if e['e']=='fire' and e.get('w')=='gun': fires[e['t']].append(e['id'])
print('impact sample',[json.dumps(e) for e in list(imp.values())[:3]], 'n impacts',len(imp),'n proj ids',len(proj))
hitkinds=collections.Counter()
rows=[]
for pid,tr in proj.items():
    if tr[0][1]!=0: continue
    e=imp.get(pid)
    t0,_,x0,y0,z0=tr[0]
    # direction: from second sample or from impact point
    if len(tr)>=2: t1,_,x1,y1,z1=tr[1]
    elif e: t1=e['t']; x1,y1,z1=e['at']
    else: continue
    d=math.dist((x0,y0,z0),(x1,y1,z1))
    if d<1e-6: continue
    ux,uy,uz=(x1-x0)/d,(y1-y0)/d,(z1-z0)/d
    # shooter = mech whose muzzle is closest to back-projected line at frame t0 (or t0-2)
    fr=frames.get(t0) or frames.get(t0-1)
    best=None
    for i,m in fr.items():
        # distance from muzzle point to line
        px,py,pz=m[1]-x0,m[2]-y0,m[3]+7-z0
        s=px*ux+py*uy+pz*uz
        if s>5: continue
        perp=math.sqrt(max(0,px*px+py*py+pz*pz-s*s))
        if best is None or perp<best[0]: best=(perp,i,-s)
    if not best or best[0]>4 or best[2]>80: continue
    S=best[1]
    hit=e.get('hit') if e else None
    hitkinds['mech' if (hit is not None and hit<16) else 'npc' if (hit is not None and hit<1000) else 'crate' if hit is not None else 'none']+=1
    # intended target: mech with min lateral miss along the path
    cand=None
    sm=fr[S]
    for j,m in fr.items():
        if j==S: continue
        # simulate closest approach using target track
        bestd=None
        R0=math.dist((m[1],m[2]),(sm[1],sm[2]))
        if R0>260: continue
        for kk in range(0,22):
            tt=t0+kk*2
            if tt not in frames or j not in frames[tt]: break
            mm=frames[tt][j]; s=(tt-t0)/20*252
            bx,by,bz=x0+ux*s,y0+uy*s,z0+uz*s
            # refine: closest point on bullet segment of this frame to target centre (horizontal)
            px,py=mm[1]-bx,mm[2]-by
            al=px*ux+py*uy
            al=max(-12.6,min(12.6,al))
            dd=math.hypot(px-ux*al,py-uy*al)
            if bestd is None or dd<bestd[0]: bestd=(dd,tt,math.dist((mm[1],mm[2]),(sm[1],sm[2])))
        if bestd and (cand is None or bestd[0]<cand[0]): cand=(bestd[0],j,bestd[2],bestd[1])
    if hit is not None and hit<16:
        tgt=hit; R=math.dist((fr[S][1],fr[S][2]),(frames.get(e['t']-e['t']%2,fr).get(hit,fr.get(hit,[0,x1,y1]))[1],frames.get(e['t']-e['t']%2,fr).get(hit,fr.get(hit,[0,x1,y1]))[2]))
        rows.append((S,tgt,R,True,0.0,t0))
    elif hit is None and cand and cand[0]<12:
        rows.append((S,cand[1],cand[2],False,cand[0],t0))
print('bullet outcomes',dict(hitkinds))
print('bullets attributed (hit a mech, or missed within 12 m lateral of a mech):',len(rows))
for lo,hi in [(0,30),(30,45),(45,60),(60,80),(80,100),(100,130),(130,170),(170,260)]:
    rr=[r for r in rows if lo<=r[2]<hi]
    if rr:
        ms=[r[4] for r in rr if not r[3]]
        print(' %3d-%3d n=%4d hit=%.2f  median miss(lateral, misses) %.1f m'%(lo,hi,len(rr),sum(r[3] for r in rr)/len(rr),statistics.median(ms) if ms else 0))
per=collections.defaultdict(list)
for r in rows: per[bots[r[0]]].append(r)
for k,v in sorted(per.items()):
    hr=[r[2] for r in v if r[3]]
    print(k.ljust(11),'n=%4d hit=%.2f medR(all)=%.0f medR(hits)=%.0f'%(len(v),sum(r[3] for r in v)/len(v),statistics.median(r[2] for r in v),statistics.median(hr) if hr else 0))
    for lo,hi in [(0,45),(45,70),(70,100),(100,150),(150,260)]:
        rr=[r for r in v if lo<=r[2]<hi]
        if len(rr)>=8: print('      %3d-%3d n=%3d hit=%.2f'%(lo,hi,len(rr),sum(r[3] for r in rr)/len(rr)))
