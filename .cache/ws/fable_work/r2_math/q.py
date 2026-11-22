import math, random
random.seed(11)
S=1.4; phi=lambda z: math.exp(-z*z/2)/math.sqrt(2*math.pi); Phi=lambda z:0.5*(1+math.erf(z/math.sqrt(2)))
def G(m,e,th=0.0):
    mu=m*(th-e); sd=S*math.sqrt(m*(2-m/48.0)); z=mu/sd
    return sd*(phi(z)+z*Phi(z)), 1-Phi((0.5-mu)/sd)
# Q1: classes. a = A-only matches, b = B-only, c = mixed (A and B, or C / after-retreat heal). never = a+b+c
def d(n,e,th):  # sum over n matches of (new - old), integer-ish
    return round(sum(random.gauss(th,S)-random.gauss(e,S) for _ in range(n))) if n else 0
def sim(a,b,c,e=0.27,th=0.0,N=200000,g_next=0.9):
    X=Y=pX=pY=0; X3=0; sX=sY=0; Xm=0
    for _ in range(N):
        DA=d(a,e,th); DB=d(b,e,th)
        nv=DA+DB+d(c,e,th); c0=DA+d(c,e,th) if c else DA; l0=DB+(d(c,e,th) if c else 0)
        # order X: never first; if it wins the second slot is a generic other ticket (worth g_next); else c0l10
        if nv>=1: gx=nv+g_next*0.8
        else: gx=max(0,c0)
        # order Y: c0l10 and LOW0 in parallel (two slots)
        gy=max(0,c0,l0)
        X+=gx; Y+=gy; pX+=(nv>=1 or c0>=1); pY+=(c0>=1 or l0>=1)
        # three slots: X: never, c0l10 (if never fails), then low0 if both fail else generic ; Y: singles then merge(never) only if both singles >=0 and one >=1
        x3 = nv+g_next*1.6 if nv>=1 else (c0+g_next*0.8 if c0>=1 else max(0,l0))
        y3 = max(gy, nv) if (c0>=0 and l0>=0 and max(c0,l0)>=1) else (gy+ (g_next*0.8 if True else 0))
        X3+=x3; sY+=y3
    return X/N,pX/N,Y/N,pY/N,X3/N,sY/N
print("Q1  (a,b,c) e th | 2 slots: X=never-first yield/P(any higher) ; Y=parallel singles yield/P | 3 slots X / Y")
for (a,b,c) in ((4,2,2),(6,3,3),(4,0,4),(8,2,2),(2,1,1)):
    for th in (0.0,0.3,-0.3):
        r=sim(a,b,c,th=th,N=60000)
        print(f"{(a,b,c)} m={a+b+c} th={th:+.1f}: X {r[0]:.2f}/{r[1]:.2f}  Y {r[2]:.2f}/{r[3]:.2f} | 3 slots X {r[4]:.2f} Y {r[5]:.2f}")
print("single-ticket check: never m=8 %.2f/%.2f  m=12 %.2f/%.2f ; c0l10 m=6 %.2f/%.2f ; low0 m=3 %.2f/%.2f"%(G(8,.27)+G(12,.27)+G(6,.27)+G(3,.27)))
# Q2: threshold th for a code ticket to beat filler
print("Q2 filler: m=1 %.2f/%.2f ; half-step values 0.19-0.25 (r1). bar = 0.66"%G(1,.27))
for hair,pg in ((1.0,0.8),(0.5,0.8)):
    row=[]
    for m in (2,4,8,12,16,24):
        th=-1.0
        while G(m,.27,th)[0]*hair*pg<0.66 and th<3: th+=0.01
        row.append(f"m{m}: th>={th:+.2f} (P {G(m,.27,th)[1]:.2f})")
    print(f"haircut {hair} gate-pass {pg}: "+"  ".join(row))
# Q3: Opus merges under additivity with overlap probability
for name,pred in (("G10C10",258),("G10FT3",258),("G10C10FT3",259)): print(name,pred)
# P(observed == predicted) if model right: 0.7 per pair (r1). If merges are fresh m=1-2 lotteries: P(exactly +1) ~
import collections
cnt=collections.Counter(d(1,0.27,0) for _ in range(200000)); print("fresh m=1 lottery: P(D=+1) %.2f P(D>=1) %.2f P(D=0) %.2f"%(cnt[1]/2e5,sum(v for k,v in cnt.items() if k>=1)/2e5,cnt[0]/2e5))
cnt=collections.Counter(d(2,0.27,0) for _ in range(200000)); print("fresh m=2 lottery: P(D=+2) %.2f P(D>=1) %.2f"%(cnt[2]/2e5,sum(v for k,v in cnt.items() if k>=1)/2e5))
