import gzip,json,math,collections,sys,statistics
VB=140.0
f=gzip.open(sys.argv[1],'rt'); hdr=json.loads(f.readline()); bots=[b.split(':')[1] for b in hdr['bots']]
frames={}; proj=collections.defaultdict(list); evs=[]
for line in f:
    o=json.loads(line)
    if 'm' in o:
        frames[o['t']]={m[0]:m for m in o['m']}
        for p in o.get('p',[]) or []: proj[p[0]].append((o['t'],p[1],p[2],p[3],p[4]))
    for e in o.get('ev',[]) or []: evs.append(e)
imp={e['p']:e for e in evs if e['e']=='impact'}
rows=[]
for pid,tr in proj.items():
    if tr[0][1]!=0: continue
    e=imp.get(pid); t0,_,x0,y0,z0=tr[0]
    if len(tr)>=2: t1,_,x1,y1,z1=tr[1]
    elif e: t1=e['t']; x1,y1,z1=e['at']
    else: continue
    d=math.dist((x0,y0,z0),(x1,y1,z1))
    if d<1e-6: continue
    ux,uy,uz=(x1-x0)/d,(y1-y0)/d,(z1-z0)/d
    hn=math.hypot(ux,uy); hx,hy=ux/hn,uy/hn
    fr=frames.get(t0) or frames.get(t0-1)
    if t0-2 not in frames: continue
    best=None
    for i,m in fr.items():
        px,py,pz=m[1]-x0,m[2]-y0,m[3]+7-z0; s=px*ux+py*uy+pz*uz
        if s>5: continue
        perp=math.sqrt(max(0,px*px+py*py+pz*pz-s*s))
        if best is None or perp<best[0]: best=(perp,i,-s)
    if not best or best[0]>4 or best[2]>80: continue
    S=best[1]; sm=fr[S]; hit=e.get('hit') if e else None
    if hit is not None and hit>=16: continue
    cand=None
    for j,m in fr.items():
        if j==S or j not in frames[t0-2]: continue
        if math.dist((m[1],m[2]),(sm[1],sm[2]))>260: continue
        for kk in range(0,22):
            tt=t0+kk*2
            if tt not in frames or j not in frames[tt]: break
            mm=frames[tt][j]; s=(tt-t0)/20*VB
            bx,by=x0+ux*s,y0+uy*s
            px,py=bx-mm[1],by-mm[2]
            al=px*hx+py*hy
            if abs(al)>7.5: continue
            lat=-hy*px+hx*py      # signed lateral offset of bullet path from target centre (left +)
            if cand is None or abs(lat)<abs(cand[0]): cand=(lat,j,math.dist((mm[1],mm[2]),(sm[1],sm[2])),tt)
    if hit is not None: 
        if cand is None or cand[1]!=hit: 
            # use hit target
            j=hit
            if j not in fr or j not in frames[t0-2]: continue
            cand=(0.0,j,math.dist((fr[j][1],fr[j][2]),(sm[1],sm[2])),t0)
    if cand is None or abs(cand[0])>12: continue
    lat,j,R,tt=cand
    m=fr[j]; p=frames[t0-2][j]
    vx=(m[1]-p[1])/0.1; vy=(m[2]-p[2])/0.1
    vlat=-hy*vx+hx*vy
    # shooter velocity too
    ps=frames[t0-2].get(S); svlat=0
    if ps: svlat=-hy*((sm[1]-ps[1])/0.1)+hx*((sm[2]-ps[2])/0.1)
    rows.append(dict(S=S,j=j,R=R,hit=hit is not None,lat=lat,vlat=vlat,svlat=svlat,T=R/VB))
print(len(rows))
print('hit rate vs |target lateral speed| for R in bands')
for (lo,hi) in [(45,80),(80,130),(130,260)]:
    print(' R',lo,hi)
    for a,b in [(0,1.5),(1.5,4),(4,7),(7,9.5),(9.5,25)]:
        rr=[r for r in rows if lo<=r['R']<hi and a<=abs(r['vlat'])<b]
        if rr:
            sg=[r['lat']*(1 if r['vlat']>0 else -1) for r in rr if not r['hit']]
            print('   |vlat| %4.1f-%4.1f n=%3d hit=%.2f  misses: n=%d median signed miss (ahead +) %.1f m'%(a,b,len(rr),sum(r['hit'] for r in rr)/len(rr),len(sg),statistics.median(sg) if sg else 0))
# regression of signed miss on vlat*T for misses and hits (hits lat unknown -> use only bullets with measured lat incl. hits where cand matched)
mm=[r for r in rows if abs(r['vlat'])>3 and not r['hit']]
num=sum(r['lat']*r['vlat']*r['T'] for r in mm); den=sum((r['vlat']*r['T'])**2 for r in mm)
print('misses with |vlat|>3: n=%d  slope of signed miss vs vlat*T = %.2f (0 = perfect lead, +1 = lead twice too big, -1 = no lead)'%(len(mm),num/den))
num=sum(r['lat']*r['vlat'] for r in mm); den=sum((r['vlat'])**2 for r in mm)
print('  slope vs vlat alone (seconds of extra lead) = %.3f s'%(num/den))
# shooter moving vs still
for a,b in [(0,1.5),(1.5,6),(6,25)]:
    rr=[r for r in rows if 60<=r['R']<170 and a<=abs(r['svlat'])<b]
    if rr: print(' shooter |vlat| %4.1f-%4.1f n=%3d hit=%.2f (R 60-170)'%(a,b,len(rr),sum(r['hit'] for r in rr)/len(rr)))
print('--- hit rate vs range (bullet speed 140 in this replay); T=R/140')
for lo,hi in [(0,30),(30,45),(45,60),(60,80),(80,100),(100,130),(130,170),(170,260)]:
    rr=[r for r in rows if lo<=r['R']<hi]
    if rr: print(' %3d-%3d n=%4d hit=%.2f  T=%.2f-%.2f s'%(lo,hi,len(rr),sum(r['hit'] for r in rr)/len(rr),lo/VB,hi/VB))
print('--- by shooter type and range')
per=collections.defaultdict(list)
for r in rows: per[bots[r['S']]].append(r)
for k,v in sorted(per.items()):
    print(k.ljust(11),'n=%4d hit=%.2f'%(len(v),sum(r['hit'] for r in v)/len(v)),' '.join('%d-%d:%.2f(n%d)'%(lo,hi,sum(r['hit'] for r in v if lo<=r['R']<hi)/max(1,sum(1 for r in v if lo<=r['R']<hi)),sum(1 for r in v if lo<=r['R']<hi)) for lo,hi in [(0,45),(45,70),(70,100),(100,150),(150,260)]))
print('--- hit rate vs target speed*T product (lead distance, m)')
for a,b in [(0,1),(1,2),(2,3.5),(3.5,5),(5,8),(8,30)]:
    rr=[r for r in rows if a<=abs(r['vlat'])*r['T']<b]
    if rr: print(' lead %.1f-%.1f m n=%3d hit=%.2f medR=%.0f'%(a,b,len(rr),sum(r['hit'] for r in rr)/len(rr),statistics.median(r['R'] for r in rr)))
