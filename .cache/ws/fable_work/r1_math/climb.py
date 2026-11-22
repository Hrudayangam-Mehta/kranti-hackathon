import math, random, statistics as st
random.seed(7)
phi=lambda z: math.exp(-z*z/2)/math.sqrt(2*math.pi)
Phi=lambda z: 0.5*(1+math.erf(z/math.sqrt(2)))
S=1.4  # per-match sd of kills over salts (0.2*sqrt48); 0.17 -> 1.18
def G(m,e,th=0.0,s=S):
    # touched m of 48 fully re-drawn; base luck e kills/match; th true effect kills per touched match
    mu=m*(th-e); sd=s*math.sqrt(m*(2-m/48.0))
    z=mu/sd
    return mu, sd, sd*(phi(z)+z*Phi(z)), 1-Phi((0.5-mu)/sd)  # E[max(0,D)] kills, P(D>=+1 kill) cont.corr
print("A. analytic: m, e -> mean, sd, E[gain] (kills), E[gain] score, P(strictly higher)")
for e in (0.0,0.15,0.27,0.40,0.55,0.75):
    row=[]
    for m in (1,2,4,8,16,24,48):
        mu,sd,g,p=G(m,e); row.append(f"m{m}:{g:.2f}k/{g/48:.3f}/{p:.2f}")
    print(f"e={e:.2f} "+"  ".join(row))
print("A2. same with a real effect th=+0.3 kills per touched match")
for e in (0.27,0.55):
    print(f"e={e:.2f} "+"  ".join(f"m{m}:{G(m,e,0.3)[2]:.2f}k/{G(m,e,0.3)[3]:.2f}" for m in (1,2,4,8,16,24,48)))
print("A3. sd 1.18 (per-draw 0.17)"); 
for e in (0.27,0.55):
    print(f"e={e:.2f} "+"  ".join(f"m{m}:{G(m,e,0,1.18)[2]:.2f}k/{G(m,e,0,1.18)[3]:.2f}" for m in (1,2,4,8,16,24,48)))
# B. official deltas in kills
base={'FIN':(251,246),'LG':(251,242),'LC':(251,254),'LX':(251,249),'healDoc':(251,241),'cover2.0':(254,253),'low15':(254,255),
 'oneHit':(255,254),'low10':(255,257),'low15+cover1.0':(255,256),'fin30':(255,255),'FT3':(255,256),'LS35':(255,252)}
print("B. deltas (kills):",{k:b-a for k,(a,b) in base.items()})
small=[-1,1,-1,2,1,0,1,-3]; big=[-5,-9,3,-2,-10]
rms=lambda x: math.sqrt(sum(v*v for v in x)/len(x))
print("small: mean %.2f rms %.2f E[pos part] %.3f P(up) %.2f | big: mean %.2f rms %.2f sd %.2f"%(st.mean(small),rms(small),sum(max(v,0) for v in small)/8,sum(v>0 for v in small)/8,st.mean(big),rms(big),st.stdev(big)))
print("implied m for small steps (rms^2 = 2 S^2 m): %.2f ; big (var=S^2 m(2-m/48), sd 5.3): m~%.1f"%(rms(small)**2/(2*S*S), 28.3/(2*S*S)))
# C. Monte Carlo climb, per-match model with integer kills
def draw(mu): return max(0,round(random.gauss(mu,S)))
def start(target=257,mu=5.08):
    while True:
        x=[draw(mu) for _ in range(48)]
        if abs(sum(x)-target)<=1: return x
def climb(n,mdist,th=0.0,p_inert=0.15,mu=5.08,batch=False):
    x=start(); t0=sum(x)
    for _ in range(n):
        if random.random()<p_inert: continue
        m=mdist()
        idx=random.sample(range(48),m)
        new=[draw(mu+th) for _ in idx]
        if sum(new)>sum(x[i] for i in idx):
            for i,v in zip(idx,new): x[i]=v
    return sum(x)-t0
def rep(name,n,mdist,th=0.0,p_inert=0.15,N=3000):
    r=sorted(climb(n,mdist,th,p_inert) for _ in range(N))
    q=lambda p:r[int(p*N)]
    f=lambda k:(257+k)/48
    print(f"{name:34s} n={n:2d}: mean +{st.mean(r):5.1f}k -> {f(st.mean(r)):.2f}; 10/50/90%: {f(q(.1)):.2f}/{f(q(.5)):.2f}/{f(q(.9)):.2f}; P(>=5.6) {sum(v>=12 for v in r)/N:.2f} P(>=5.8) {sum(v>=22 for v in r)/N:.2f}")
sm=lambda: random.choices((1,2,3),(0.6,0.3,0.1))[0]
print("C. Monte Carlo (start 257 kills = 5.35, config mean 5.08, keep iff strictly higher)")
for n in (6,18,35,70):
    rep("small steps (m 1-3), neutral",n,sm)
    rep("small steps, th=+0.3/match",n,sm,0.3)
    rep("small steps, th=-0.3/match",n,sm,-0.3)
    rep("small, 40% inert",n,sm,0.0,0.40)
    rep("medium m=8, neutral",n,lambda:8)
    rep("large m=20, neutral",n,lambda:20)
    rep("large m=20, th=-0.2 (new code)",n,lambda:20,-0.2)
    rep("fresh salt m=48",n,lambda:48,0.0,0.0)
    print()
# adaptive: choose m by current luck (large first, then small)
def climb_sched(n,k_large,mu=5.08):
    x=start(); t0=sum(x)
    for j in range(n):
        if random.random()<0.15: continue
        m=12 if j<k_large else sm()
        idx=random.sample(range(48),m); new=[draw(mu) for _ in idx]
        if sum(new)>sum(x[i] for i in idx):
            for i,v in zip(idx,new): x[i]=v
    return sum(x)-t0
for k in (0,10,20,35):
    r=[climb_sched(70,k) for _ in range(3000)]
    print(f"D. 70 slots, first {k} at m=12 then small: mean +{st.mean(r):.1f}k -> {(257+st.mean(r))/48:.2f}, P(>=5.6) {sum(v>=12 for v in r)/3000:.2f}")
# E. threshold scan: prefix-max of a walk vs single far value
def scan(k,e=0.27,N=20000):
    best=0;far=0
    for _ in range(N):
        s=0;mx=0
        for _ in range(k):
            if random.random()<0.15: d=0
            else: d=draw(5.08)-draw(5.08+e)
            s+=d; mx=max(mx,s)
        best+=mx; far+=max(s,0)
    return best/N, far/N
for k in (1,2,3,4): print("E. scan of %d nested threshold values: E[best prefix] %.2fk using %d slots; one far value (1 slot, m~%d): %.2fk"%(k,*[scan(k)[0]],k,k,scan(k)[1]))
