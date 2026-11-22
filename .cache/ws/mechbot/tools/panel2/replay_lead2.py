import gzip,json,math,collections,sys,statistics
f=gzip.open(sys.argv[1],'rt'); hdr=json.loads(f.readline()); bots=[b.split(':')[1] for b in hdr['bots']]
frames={}; evs=[]
for line in f:
    o=json.loads(line)
    if 'm' in o: frames[o['t']]={m[0]:m for m in o['m']}
    for e in o.get('ev',[]) or []: evs.append(e)
def angdiff(a,b): return (a-b+math.pi)%(2*math.pi)-math.pi
ghits=collections.defaultdict(list)
for e in evs:
    if e['e']=='hit' and e.get('w')=='gun' and e['dst']<16: ghits[e['src']].append((e['t'],e['dst']))
rows=[]
for e in evs:
    if e['e']!='fire' or e.get('w')!='gun': continue
    t=e['t']; S=e['id']
    near=[(abs(ht-t),hd) for ht,hd in ghits[S] if abs(ht-t)<=40]
    if not near: continue
    j=min(near)[1]
    tf=t if t in frames else t-1
    if tf not in frames or tf-2 not in frames: continue
    s=frames[tf].get(S); m=frames[tf].get(j); p=frames[tf-2].get(j)
    if not s or not m or not p: continue
    dx=m[1]-s[1]; dy=m[2]-s[2]; R=math.hypot(dx,dy)
    vx=(m[1]-p[1])/0.1; vy=(m[2]-p[2])/0.1; T=R/252
    los=math.atan2(dy,dx)
    lead=angdiff(math.atan2(dy+vy*T,dx+vx*T),los); aimoff=angdiff(s[4],los)
    ta=t+T*20
    hit=any(abs(ht-ta)<=2.5 and hd==j for ht,hd in ghits[S])
    # target's actual lateral deviation from linear prediction at arrival
    tA=int(round(ta/2))*2
    dev=None
    if tA in frames and j in frames[tA]:
        a=frames[tA][j]; TT=(tA-tf)/20
        ex=a[1]-(m[1]+vx*TT); ey=a[2]-(m[2]+vy*TT)
        dev=abs(-math.sin(los)*ex+math.cos(los)*ey)
    rows.append(dict(S=S,j=j,R=R,lead=lead,aimoff=aimoff,hit=hit,dev=dev,t=t,vlat=abs(-math.sin(los)*vx+math.cos(los)*vy)))
print('engaged gun shots:',len(rows))
sel=[r for r in rows if abs(r['lead'])>0.015]
k=sum(r['aimoff']*r['lead'] for r in sel)/sum(r['lead']**2 for r in sel)
print('lead fraction k=%.2f (n=%d)  median|aim-lead|=%.1f mrad  median|aim-cur|=%.1f mrad'%(k,len(sel),1000*statistics.median(abs(r['aimoff']-r['lead']) for r in sel),1000*statistics.median(abs(r['aimoff']) for r in sel)))
for typ in sorted(set(bots)):
    s2=[r for r in sel if bots[r['S']]==typ]
    if len(s2)>8:
        k=sum(r['aimoff']*r['lead'] for r in s2)/sum(r['lead']**2 for r in s2)
        allr=[r for r in rows if bots[r['S']]==typ]
        print(typ.ljust(11),'k=%.2f n=%d | engaged hit=%.2f n=%d medR=%.0f'%(k,len(s2),sum(r['hit'] for r in allr)/len(allr),len(allr),statistics.median(r['R'] for r in allr)))
print('engaged hit rate vs range:')
for lo,hi in [(0,30),(30,45),(45,60),(60,80),(80,100),(100,130),(130,170),(170,260)]:
    rr=[r for r in rows if lo<=r['R']<hi]
    if rr: print(' %3d-%3d n=%4d hit=%.2f'%(lo,hi,len(rr),sum(r['hit'] for r in rr)/len(rr)))
print('engaged hit rate vs target lateral deviation from linear prediction at arrival:')
for lo,hi in [(0,1),(1,2),(2,2.8),(2.8,4),(4,6),(6,99)]:
    rr=[r for r in rows if r['dev'] is not None and lo<=r['dev']<hi]
    if rr: print(' dev %.1f-%.1f n=%4d hit=%.2f medR=%.0f'%(lo,hi,len(rr),sum(r['hit'] for r in rr)/len(rr),statistics.median(r['R'] for r in rr)))
print('engaged hit rate vs target lateral speed:')
for lo,hi in [(0,2),(2,5),(5,8),(8,10),(10,13),(13,25)]:
    rr=[r for r in rows if lo<=r['vlat']<hi]
    if rr: print(' vlat %2d-%2d n=%4d hit=%.2f medR=%.0f'%(lo,hi,len(rr),sum(r['hit'] for r in rr)/len(rr),statistics.median(r['R'] for r in rr)))
# lasers
las=[e for e in evs if e['e']=='laser']; ch=[e for e in evs if e['e']=='charge']
print('laser shots',len(las),'with mech hits',sum(1 for e in las if any(h<16 for h in e.get('hits',[]))),'any hits',sum(1 for e in las if e.get('hits')))
print('laser ranges (hit):',sorted(round(math.dist(e['from'],e['to'])) for e in las if e.get('hits')))
print('charge dur:',sorted(e['dur'] for e in ch))
lh=[e for e in evs if e['e']=='hit' and e.get('w')=='laser']
print('laser hit amounts',sorted(e['amt'] for e in lh))
# mortar
booms=[e for e in evs if e['e']=='boom']; mh=[e for e in evs if e['e']=='hit' and e.get('w')=='mortar' and e['dst']<16]
mf=[e for e in evs if e['e']=='fire' and e.get('w')=='mortar']
print('mortar fires',len(mf),'booms',len(booms),'mortar mech-hit events',len(mh),'amounts',sorted(round(e['amt']) for e in mh))
zap=[e for e in evs if e['e']=='zap']; print('zaps',len(zap),'with hits',sum(1 for e in zap if e.get('hits')))
zf=[e for e in evs if e['e']=='fire' and e.get('w')=='lightning']; print('lightning fire events',len(zf))
# damage share by weapon
dm=collections.Counter()
for e in evs:
    if e['e']=='hit' and e['dst']<16: dm[e['w']]+=e['amt']
print('damage to mechs by weapon',{k:round(v) for k,v in dm.items()})
