# Panel 2: empirical kinematics of house bots from the official replay.
import gzip,json,math,collections,sys
f=gzip.open(sys.argv[1],'rt'); hdr=json.loads(f.readline())
bots=hdr['bots']
frames={}; evs=[]
for line in f:
    o=json.loads(line)
    if 'm' in o:
        frames[o['t']]={m[0]:m for m in o['m']}
    for e in o.get('ev',[]) or []: evs.append(e)
ticks=sorted(frames)
# --- 1. linear-lead prediction error vs lead time
def track(i):
    return {t:frames[t][i] for t in ticks if i in frames[t]}
lastdmg=collections.defaultdict(list)
for e in evs:
    if e['e']=='hit' and e.get('dst',99)<16: lastdmg[e['dst']].append(e['t'])
import bisect
def incombat(i,t):
    L=lastdmg[i]; k=bisect.bisect_right(L,t+20)-1   # hit within +-1..2 s
    return k>=0 and L[k]>=t-40
Ts=[0.2,0.3,0.4,0.5,0.6,0.8,1.0]
res=collections.defaultdict(lambda: [0,0,0.0])
speeds=collections.defaultdict(list)
for i in range(16):
    tr=track(i)
    for t in tr:
        if t-2 not in tr: continue
        a=tr[t-2]; b=tr[t]
        vx=(b[1]-a[1])/0.1; vy=(b[2]-a[2])/0.1; sp=math.hypot(vx,vy)
        comb=incombat(i,t); gr=(b[8]&1)==1
        speeds[('combat' if comb else 'calm')].append(sp)
        for T in Ts:
            tt=t+int(round(T*20))
            if tt not in tr: continue
            c=tr[tt]
            ex=c[1]-(b[1]+vx*T); ey=c[2]-(b[2]+vy*T)
            # lateral error relative to velocity direction (perp) and random axis: use both x and y comps
            for key in (('all',T),('combat' if comb else 'calm',T),(bots[i].split(':')[1]+('*' if comb else ''),T)):
                r=res[key]
                for e_ in (ex,ey):
                    r[0]+=1; r[1]+= (abs(e_)<2.8); r[2]+=e_*e_
print('P(|linear-lead lateral error|<2.8 m) by lead time T (pooled x,y components); rms error')
for grp in ['all','calm','combat']:
    print(grp.ljust(8),' '.join('T%.1f:%.2f(rms%.1f)'%(T,res[(grp,T)][1]/max(1,res[(grp,T)][0]),math.sqrt(res[(grp,T)][2]/max(1,res[(grp,T)][0]))) for T in Ts))
for typ in sorted(set(b.split(':')[1] for b in bots)):
    k=typ+'*'
    if res[(k,0.4)][0]>0:
        print((k).ljust(12),'n=%d'%res[(k,0.4)][0],' '.join('T%.1f:%.2f'%(T,res[(k,T)][1]/max(1,res[(k,T)][0])) for T in Ts))
for k,v in speeds.items():
    v.sort(); print('speed',k,'n',len(v),'median %.1f p25 %.1f p75 %.1f p90 %.1f mean %.1f frac<1: %.2f'%(v[len(v)//2],v[len(v)//4],v[3*len(v)//4],v[9*len(v)//10],sum(v)/len(v),sum(1 for s in v if s<1)/len(v)))
# reversal statistics in combat: lateral velocity sign changes / direction changes > 90 deg per second
chg=0; tot=0
for i in range(16):
    tr=track(i); prev=None
    for t in sorted(tr):
        if t-2 not in tr: prev=None; continue
        a=tr[t-2]; b=tr[t]; v=((b[1]-a[1])/0.1,(b[2]-a[2])/0.1)
        if incombat(i,t):
            tot+=1
            if prev and math.hypot(*v)>3 and math.hypot(*prev)>3 and (v[0]*prev[0]+v[1]*prev[1])<0: chg+=1
        prev=v
print('combat frames',tot,'velocity reversals(>90deg between consecutive 0.1s frames)',chg,'per second %.3f'%(chg/max(1,tot)*10))
# --- 2. gun fire: lead model + hit rate vs range
hits=collections.defaultdict(list)
for e in evs:
    if e['e']=='hit' and e.get('w')=='gun': hits[e['src']].append((e['t'],e['dst']))
def angdiff(a,b):
    d=(a-b+math.pi)%(2*math.pi)-math.pi; return d
rows=[]
for e in evs:
    if e['e']!='fire' or e.get('w')!='gun': continue
    t=e['t']; tf=t if t in frames else t-1
    if tf not in frames or tf-2 not in frames: continue
    s=frames[tf].get(e['id']); 
    if not s: continue
    best=None
    for j,m in frames[tf].items():
        if j==e['id'] or j not in frames[tf-2]: continue
        p=frames[tf-2][j]
        dx=m[1]-s[1]; dy=m[2]-s[2]; R=math.hypot(dx,dy)
        if R>260 or R<1: continue
        vx=(m[1]-p[1])/0.1; vy=(m[2]-p[2])/0.1
        T=R/252
        lx=dx+vx*T; ly=dy+vy*T
        cur=angdiff(s[4],math.atan2(dy,dx)); lead=angdiff(s[4],math.atan2(ly,lx))
        sc=min(abs(cur),abs(lead))
        if best is None or sc<best[0]: best=(sc,j,R,cur,lead,angdiff(math.atan2(ly,lx),math.atan2(dy,dx)),vx,vy)
    if best and best[0]<0.12:
        sc,j,R,cur,lead,leadang,vx,vy=best
        # did it hit? hit event src=shooter dst=j within arrival window
        ta=t+R/252*20
        hit=any(abs(ht-ta)<=3 and hd==j for ht,hd in hits[e['id']])
        hitany=any(abs(ht-ta)<=3 for ht,hd in hits[e['id']])
        rows.append((e['id'],j,R,cur,lead,leadang,hit,hitany,t))
print('gun fire events matched to a target:',len(rows),'of',sum(1 for e in evs if e['e']=='fire' and e.get('w')=='gun'))
# lead regression: aim offset from current LOS (-cur) vs linear lead angle
sxx=sxy=0
for r in rows:
    if abs(r[5])>0.01: sxx+=r[5]*r[5]; sxy+=(-r[3])*r[5]
print('lead fraction k (aim offset vs full linear lead), LSQ through origin: %.2f  (n=%d with lead>10mrad)'%(sxy/max(1e-9,sxx),sum(1 for r in rows if abs(r[5])>0.01)))
import statistics
print('median |aim-linear lead point| mrad: %.1f ; median |aim-current pos| mrad: %.1f'%(1000*statistics.median(abs(r[4]) for r in rows),1000*statistics.median(abs(r[3]) for r in rows)))
bins=[(0,30),(30,45),(45,60),(60,80),(80,100),(100,130),(130,170),(170,260)]
print('house-bot gun hit rate vs range (target = mech nearest the aim line):')
for lo,hi in bins:
    rr=[r for r in rows if lo<=r[2]<hi]
    if rr: print('%3d-%3d m  n=%4d  hit=%.2f'%(lo,hi,len(rr),sum(r[6] for r in rr)/len(rr)))
per=collections.defaultdict(list)
for r in rows: per[bots[r[0]].split(':')[1]].append(r)
for k,v in per.items():
    print(k.ljust(11),'n=%4d hit=%.2f medianR=%.0f  median|aim-lead|=%.1f mrad'%(len(v),sum(r[6] for r in v)/len(v),statistics.median(r[2] for r in v),1000*statistics.median(abs(r[4]) for r in v)))
