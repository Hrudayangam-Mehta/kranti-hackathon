import gzip,json,math,collections,sys,bisect
A=58.5;VW=11.7;VB=19.5;VBUL=252.0;SIG=math.radians(0.6)
# ---------- our gun vs house-bot motion (replay kinematics rescaled x1.3 to current walk/accel)
f=gzip.open(sys.argv[1],'rt'); hdr=json.loads(f.readline())
frames={}; evs=[]
for line in f:
    o=json.loads(line)
    if 'm' in o: frames[o['t']]={m[0]:m for m in o['m']}
    for e in o.get('ev',[]) or []: evs.append(e)
hits=collections.defaultdict(list)
for e in evs:
    if e['e']=='hit' and e.get('dst',99)<16: hits[e['dst']].append(e['t'])
def comb(i,t):
    L=hits[i]; k=bisect.bisect_right(L,t+20)-1
    return k>=0 and L[k]>=t-40
SC=1.3
def plin(T,w=2.8):
    n=0;h=0; k=int(round(T*20/2))*2
    for t,fr in frames.items():
        if t-2 not in frames or t+k not in frames: continue
        for i,m in fr.items():
            a=frames[t-2].get(i); c=frames[t+k].get(i)
            if not a or not c or not comb(i,t): continue
            TT=k/20
            ex=(c[1]-(m[1]+(m[1]-a[1])/0.1*TT))*SC; ey=(c[2]-(m[2]+(m[2]-a[2])/0.1*TT))*SC
            for e_ in (ex,ey): n+=1; h+= abs(e_)<w
    return h/max(1,n)
tab={T:plin(T) for T in [0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0]}
print('P(lin lead ok | T), scaled x1.3:',{k:round(v,2) for k,v in tab.items()})
def interp(T):
    ks=sorted(tab); 
    if T<=ks[0]: return tab[ks[0]]
    for a,b in zip(ks,ks[1:]):
        if T<=b: return tab[a]+(tab[b]-tab[a])*(T-a)/(b-a)
    return tab[ks[-1]]
print('R  T_tot  P_motion  P_spread  P_us   | with rail barrel x1 (315 m/s)')
for R in [30,50,75,100,125,150,175,200,230]:
    T=0.1+(R-3)/VBUL; s=SIG*R; ps=math.erf(2.8/(s*math.sqrt(2)))*math.erf(4.8/(s*math.sqrt(2)))
    T2=0.1+(R-3)/315
    print(R,round(T,2),round(interp(T),2),round(ps,3),round(interp(T)*ps,2),'|',round(interp(T2)*ps,2))
# ---------- dodge thresholds
for cubes in (0,5,10):
    w=2.5*(1+0.05*cubes)+0.3
    s=math.sqrt(2*w/A)
    print('cubes',cubes,'w',round(w,2),'s*=%.3f s'%s,'R_dodge(lat .10)=%.0f m (lat .05)=%.0f m'%(VBUL*(s-0.10)+3,VBUL*(s-0.05)+3),
          'guaranteed-hit T (full speed target)=%.3f -> R=%.0f ; (slow target) T=%.3f -> R=%.0f'%(0.2+w/VW,VBUL*(0.2+w/VW-0.1)+3,0.1+w/VW,VBUL*(w/VW)+3))
# ---------- DPS / TTK
def gun(dmg=45,cd=0.24,mag=12,rel=2.4,hp=1400,p=1.0,mult=1.0):
    need=math.ceil(hp/(dmg*mult)/p-1e-9)
    full=(need-1)//mag; rem=need-full*mag
    t=full*((mag-1)*cd+rel)+(rem-1)*cd
    sus=mag*dmg/((mag-1)*cd+rel)
    return sus,t,need
print('GUN base sustained %.1f ttk %.2f shots %d'%gun())
for name,kw in [('rear x1.5',dict(mult=1.5)),('p=0.85',dict(p=0.85)),('p=0.5',dict(p=0.5)),('gun_damage x1',dict(dmg=45*1.15)),('gun_rate x1',dict(cd=0.24*0.87)),('gun_mag x1',dict(mag=20,rel=1.92)),('gun_mag x2',dict(mag=28,rel=2.4*0.64)),('mag+dmg',dict(mag=20,rel=1.92,dmg=45*1.15)),('5 cubes self',dict(dmg=45*1.2)),('tgt 5 cubes',dict(hp=1680)),('tgt plating',dict(hp=1610))]:
    s,t,n=gun(**kw); print(' gun %-14s sustained %.1f dps  TTK %.2f s  shots %d'%(name,s,t,n))
def laser(dmg=315,ch=0.75,cd=1.65,hp=1400,mult=1.0):
    n=math.ceil(hp/(dmg*mult)-1e-9); return dmg*mult/(ch+cd), ch+(n-1)*(ch+cd), n
for name,kw in [('base',{}),('rear',dict(mult=1.5)),('vs mortar holder',dict(mult=1.6)),('rear+cookoff',dict(mult=2.4)),('laser_damage x1',dict(dmg=315*1.18)),('laser_charge x1',dict(ch=0.5625))]:
    s,t,n=laser(**kw); print(' laser %-16s %.0f dps TTK %.2f s shots %d'%(name,s,t,n))
print(' laser partial charge dmg: ',{c:round(315*(0.35+0.65*c/0.75)) for c in (0.15,0.3,0.45,0.6,0.75)})
# lightning
n=math.ceil(1400/60); print(' lightning: %d shots %.2f s energy %d ; rear: %d shots %.2f s energy %d ; full tank shots %d dmg %d in %.2f s'%(n,(n-1)*0.25,n*3,math.ceil(1400/90),(math.ceil(1400/90)-1)*0.25,math.ceil(1400/90)*3,33,33*60,32*0.25))
# gun + lightning
t=0;d=0;ev=[]
for k in range(12): ev.append((k*0.24,45))
for k in range(40): ev.append((k*0.25,60))
ev.sort(); 
for tt,dm in ev:
    d+=dm
    if d>=1400: print(' gun+lightning TTK %.2f s'%tt); break
t=0;d=0;ev=[(k*0.24,45) for k in range(12)]+[(0.75+k*2.4,315) for k in range(6)]+[(5.04+k*0.24,45) for k in range(12)]
ev.sort()
for tt,dm in ev:
    d+=dm
    if d>=1400: print(' gun+laser TTK %.2f s'%tt); break
# mortar
print(' mortar direct 360 per 2.6 s = %.0f dps ; splash at 3.5 m %.0f ; TTK direct %.1f s'%(360/2.6,160*(1-0.7*0.5),3*2.6))
# ---------- mortar solution table (flat) and with dz
V=72.0;G=22.0
def mort(d,dz):
    disc=V**4-G*(G*d*d+2*dz*V*V)
    if disc<0: return None
    th=math.atan((V*V-math.sqrt(disc))/(G*d)); return th,d/(V*math.cos(th))
print('mortar low arc: d, dz(target-launch) -> pitch rad, flight s')
for d in [15,20,30,40,60,80,100,130,160,200,230]:
    print(' d=%3d '%d+'  '.join('dz=%+d: %s'%(dz,('%.3f/%.2fs'%mort(d,dz)) if mort(d,dz) else 'none') for dz in (-9.5,0,10.5,20.5)))
print(' max flat range %.1f m'%(V*V/G))
# ---------- energy
print('boost: full tank %.2f s, %.0f m (walk same time %.0f m); sustained avg speed full cycle %.2f m/s'%(100/17,100/17*19.5,100/17*11.7,(100/17*19.5+ (0.6+100/18)*11.7)/(100/17+0.6+100/18)))
for H in (10,20,30,40,50,60):
    # jump 11 m/s then jet: net accel 34-22=12 capped at 10 m/s rise
    t=H/10.0; print(' climb %d m: ~%.1f s, energy %.0f (at 10 m/s, 15/s) ; conservative(60 m per 100): %.0f'%(H,t,15*t,H*100/60))
print('hover duty %.2f -> %.1f energy/s'%(22/34,15*22/34))
print('lightning sustain: 12 e/s -> %.1f s per 100 ; with boost 29 e/s -> %.1f s'%(100/12,100/29))
# ---------- laser peek timings
def tmove(d,vmax,v0=0):
    ta=(vmax-v0)/A; da=v0*ta+0.5*A*ta*ta
    return math.sqrt(2*d/A) if (v0==0 and d<=da) else ta+(d-da)/vmax
print('time to move d from rest: ',{d:(round(tmove(d,VW/2),2),round(tmove(d,VB/2),2),round(tmove(d,VW),2),round(tmove(d,VB),2)) for d in (2.5,3.0,3.5,5.0,6.0,9.5)},'(half-walk, half-boost, walk, boost)')
for R in (60,80,100,125,150,200):
    print(' gun-return-free exposure at R=%d: %.2f s (0.15 react + R/252)'%(R,0.15+R/252))
