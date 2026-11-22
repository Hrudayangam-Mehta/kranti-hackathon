import numpy as np, sys
from math import erf, sqrt, pi, exp
rng=np.random.default_rng(7)
S=16; SIG=1.2*sqrt(3); TOT={1:258,2:248,3:240,4:238,5:243}; MEAN=sum(TOT.values())/5
def phi(z): return np.exp(-z*z/2)/sqrt(2*pi)
def Phi(z): return 0.5*(1+np.vectorize(erf)(z/sqrt(2)))
def EI(m,s,b):
    z=(m-b)/s; return s*(phi(z)+z*Phi(z))
def world(het=0.0):
    sig=SIG*np.exp(het*rng.standard_normal(S)); sig*=SIG/np.sqrt((sig**2).mean())
    a=rng.standard_normal((5,S))*sig            # salts1..5 slot noise
    # condition on totals: project (exact for equal sig; approx for het) weights prop to var
    w=sig**2/ (sig**2).sum()
    for i,k in enumerate([1,2,3,4,5]):
        a[i]+= (TOT[k]-MEAN - a[i].sum())*w
    return sig,a   # values relative to family mean per slot
def run(N=60,het=0.0,policy='ei',rb=None,rb_at=20,eta=1.5,round_salts=(2,),bank_every=6):
    sig,a=world(het)
    base=a[0].copy(); cur=base.copy()         # true slot values of current predicted-best table
    banked=TOT[1]; out={}
    obs=[[0.0] for _ in range(S)]             # old family obs relative to salt1
    n=0
    def submit(val):
        nonlocal banked,n
        n+=1; banked=max(banked,MEAN+val); out[n]=banked
    def flip(s,x):  # x = true value of new variant in slot s (abs), submit cur with flip
        submit(cur.sum()-cur[s]+x)
        if x>cur[s]: cur[s]=x
    # round(s): full one-slot rounds on known-total salts (15 flips from all-1 base + inferred 16th) then bank
    for k in round_salts:
        col=a[k-1]
        if k==round_salts[0]:
            for s in range(15):
                if n>=N: break
                submit(base.sum()-base[s]+col[s]); obs[s].append(col[s]-base[s])
            obs[15].append(col[15]-base[15])
            for s in range(S): cur[s]=max(cur[s],col[s])
            if n<N: submit(cur.sum())
        else:
            for s in range(15):
                if n>=N: break
                obs[s].append(col[s]-base[s]); flip(s,col[s])
            obs[15].append(col[15]-base[15])
            if col[15]>cur[15]:
                cur[15]=col[15]
    # adaptive phase
    robs=[[] for _ in range(S)]; rtrue=None; unb=0
    while n<N:
        if rb is not None and rtrue is None and n>=rb_at:
            rtrue=rb/16+eta*rng.standard_normal(S)   # rebuild family slot mean rel. old family mean
        # periodic bank
        if MEAN+cur.sum()>banked+2.5 and (n%bank_every==0 or n==N-1):
            submit(cur.sum()); continue
        best=cur-base
        cand=[]
        for s in range(S):
            x=np.array(obs[s]); k=len(x)
            v=(4*SIG**2+((x-x.mean())**2).sum())/(4+k-1)
            # slot mean theta: prior N(-0.79,v), k obs
            m=( -0.79 + x.sum())/(1+k); pv=v/(1+k)
            cand.append((EI(m,sqrt(pv+v),best[s]),s,'o'))
            if rtrue is not None:
                allr=[y for t in robs for y in t]
                mF=np.mean(allr) if len(allr)>=2 else 1.0   # optimistic prior until 2 obs
                tau2=eta**2+SIG**2; y=np.array(robs[s]); kk=len(y)
                prec=1/tau2+kk/SIG**2; mm=(mF/tau2+y.sum()/SIG**2)/prec
                cand.append((EI(mm,sqrt(1/prec+SIG**2),best[s]),s,'r'))
        if policy=='uniform':
            s=(n)%S; fam='o'
        else:
            _,s,fam=max(cand)
        if fam=='o':
            x=sig[s]*rng.standard_normal(); obs[s].append(x-base[s]); flip(s,x)
        else:
            x=rtrue[s]+sig[s]*rng.standard_normal(); robs[s].append(x-base[s]); flip(s,x)
    return out
def stats(label,**kw):
    R=np.array([[run(**kw).get(n,np.nan) for n in (15,16,30,45,60)] for _ in range(1500)])
    print(label)
    for i,n in enumerate((15,16,30,45,60)):
        c=R[:,i]; print('  N=%2d mean %.1f kills (%.2f)  sd %.1f  10-90%% %.0f-%.0f  P(>=298)=%.2f P(>=302)=%.2f'%(n,c.mean(),c.mean()/48,c.std(),np.percentile(c,10),np.percentile(c,90),(c>=298).mean(),(c>=302).mean()))
stats('A  round salt2 then adaptive EI fresh salts')
stats('A-het  slot sd heterogeneous 0.4',het=0.4)
stats('B  full rounds salt 2,5,3,4 (one-slot)',round_salts=(2,5,3,4))
stats('C  round salt2 then uniform fresh',policy='uniform')
for d in (0,10,20,30):
    stats('R rebuild at sub 20, true mean shift %+d kills, eta 1.5'%d,rb=d)
stats('R rebuild +20, eta 3 (strong slot interaction)',rb=20,eta=3.0)
stats('R rebuild +0, eta 3',rb=0,eta=3.0)
