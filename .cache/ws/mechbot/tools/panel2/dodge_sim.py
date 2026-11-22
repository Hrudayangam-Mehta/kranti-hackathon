# Panel 2 (combat physics): Monte-Carlo of gun hit probability vs strafing targets.
# 1-D lateral model: target strafes perpendicular to line of sight, bang-bang accel.
import math, random, sys
A=58.5; VW=11.7; VB=19.5; VBUL=252.0; SIG=math.radians(0.6); W=2.8; DT=0.05
def traj(pattern, total=400.0, vmax=VW, seed=1):
    """pattern(k, rng) -> time between reversals (s, multiple of 0.1). returns lists x,v at tick times."""
    rng=random.Random(seed); n=int(total/DT); xs=[0.0]*(n+1); vs=[0.0]*(n+1)
    x=0.0; v=vmax; cmd=vmax; tnext=pattern(0,rng); k=0; t=0.0
    for i in range(n):
        if pattern is not None and t+1e-9>=tnext and (i%2==0):
            cmd=-cmd; k+=1; tnext=t+pattern(k,rng)
        dv=cmd-v; step=A*DT
        v+= max(-step,min(step,dv)); x+=v*DT; t+=DT
        xs[i+1]=x; vs[i+1]=v
    return xs,vs
def interp(arr,t):
    f=t/DT; i=int(f); 
    if i>=len(arr)-1: return arr[-1]
    return arr[i]+(arr[i+1]-arr[i])*(f-i)
def Drev(v,T,vmax):   # deviation if target reverses fully toward -vmax, from speed v>=0
    trev=(v+vmax)/A
    return 0.5*A*T*T if T<=trev else (v+vmax)*(T-trev/2)
def Dfwd(v,T,vmax):   # extra displacement if target accelerates toward +vmax
    ta=max(0.0,(vmax-v)/A)
    return 0.5*A*T*T if T<=ta else (vmax-v)*(T-ta/2)
def predict(kind,x,v,T,vmax=VW):
    if kind=='L': return x+v*T
    if kind=='H': return x+0.5*v*T
    if kind=='Z': return x
    if kind=='M':
        s=1 if v>=0 else -1; av=abs(v)
        up=av*T+Dfwd(av,T,vmax); lo=av*T-Drev(av,T,vmax)
        return x+s*0.5*(up+lo)
    raise ValueError
def hitrate(xs,vs,R,kind,lat=0.10,nshots=20000,seed=7,w=W,vbul=VBUL,vmax=VW):
    rng=random.Random(seed); tmax=(len(xs)-1)*DT-3.0; hits=0
    tf=max(0.0,(R-3.0))/vbul
    for _ in range(nshots):
        ts=rng.uniform(1.0,tmax)
        # information: last decision tick (0.1 s grid) at least `lat-0.05` old; fire happens within the window
        ti=math.floor((ts-(lat-0.05))/0.1)*0.1 if lat>0 else ts
        ti=min(ti,ts)
        T=ts-ti+tf
        p=predict(kind,interp(xs,ti),interp(vs,ti),T,vmax)
        miss=interp(xs,ts+tf)-p+rng.gauss(0,SIG*R)
        if abs(miss)<w: hits+=1
    return hits/nshots
def per(h): return lambda k,rng: h
def uni(a,b): return lambda k,rng: round(rng.uniform(a,b)/0.1)*0.1
if __name__=='__main__':
    Rs=[30,45,60,80,100,125,150,200]
    print('straight-line target, spread only (analytic):')
    for R in Rs+[230]:
        s=SIG*R; ph=math.erf(W/(s*math.sqrt(2))); pv=math.erf(4.8/(s*math.sqrt(2)))
        print(R, round(ph*pv,3), 'tol_yaw_mrad', round(1000*max(0.0,W/R-SIG),1),'tol_pitch_mrad',round(1000*max(0.0,4.8/R-SIG),1))
    pats={'per0.4':per(0.4),'per0.6':per(0.6),'per0.8':per(0.8),'per1.0':per(1.0),'per1.5':per(1.5),'uni.3-.9':uni(0.3,0.9),'uni.4-1.2':uni(0.4,1.2)}
    for name,pat in pats.items():
        xs,vs=traj(pat)
        print('\npattern',name)
        print('R   '+'  '.join(k.ljust(5) for k in 'LHZM'))
        for R in Rs:
            print(str(R).ljust(4)+'  '.join(('%.2f'%hitrate(xs,vs,R,k)).ljust(5) for k in 'LHZM'))
    print('\nDODGE OPTIMUM: hit rate of linear-lead shooter (L) and best-of(L,H,Z,M) vs period h')
    hs=[0.2,0.3,0.4,0.5,0.6,0.7,0.8,1.0,1.2,1.5,2.0]
    print('R    '+' '.join(('h%.1f'%h).ljust(9) for h in hs))
    for R in Rs:
        row=[]
        for h in hs:
            xs,vs=traj(per(h),total=200.0)
            l=hitrate(xs,vs,R,'L',nshots=6000); b=max(hitrate(xs,vs,R,k,nshots=6000) for k in 'LHZM')
            row.append('%.2f/%.2f'%(l,b))
        print(str(R).ljust(5)+' '.join(row))
    print('\nrandomised uniform[a,b] reversal: L / best-of')
    for a,b in [(0.3,0.6),(0.3,0.9),(0.4,0.8),(0.4,1.2),(0.5,1.0),(0.6,1.4)]:
        xs,vs=traj(uni(a,b),total=400.0)
        print((a,b),' '.join('%d:%.2f/%.2f'%(R,hitrate(xs,vs,R,'L',nshots=8000),max(hitrate(xs,vs,R,k,nshots=8000) for k in 'LHZM')) for R in Rs))
