import numpy as np, math, sys
rng=np.random.default_rng(7)
S=0.24; N=100; R=3000
def Phi(z): return 0.5*(1+math.erf(z/math.sqrt(2)))
# analytic tables
print("E[max of n] offset (sd 0.24):", {n: round(S*np.mean(np.max(rng.standard_normal((40000,n)),axis=1)),3) for n in (1,2,4,8,16,32,64,100)})
for mu in (5.03,5.1,5.2,5.3,5.4,5.5):
    row=[]
    for c in (5.4,5.6,5.8,5.9):
        p=1-Phi((c-mu)/S); row.append((c, round(p,5), {n: round(1-(1-p)**n,3) for n in (20,50,100)}))
    print("mean",mu,row)
print("slot multiplier of +d mean at target z: exp-ish ratio p(mu+d)/p(mu)")
for z in (2.0,2.5,3.0,3.5):
    print(z,[ (d, round((1-Phi(z-d/S))/(1-Phi(z)),2)) for d in (0.05,0.1,0.15,0.2,0.3)])

def sim(policy, K, tau, m0, lead0=5.03, cuts=(5.6,5.8,5.9)):
    # leader true mean ~ N(lead0, 0.09); has one draw recorded 5.19 (current best on board 5.19)
    out=np.zeros((R,3))
    for r in range(R):
        mu=np.empty(K+1); mu[0]=rng.normal(lead0,0.09)
        mu[1:]=mu[0]+rng.normal(m0,tau,K)   # new arms = leader + change effect
        sums=np.zeros(K+1); cnt=np.zeros(K+1); best=5.19; sums[0]=lead0; cnt[0]=1  # shrunk pseudo-obs
        left=N
        def pull(i,n=1):
            nonlocal best,left
            n=min(n,left)
            if n<=0: return
            x=rng.normal(mu[i],S,n); sums[i]+=x.sum(); cnt[i]+=n; left-=n; best=max(best,x.max())
        if policy=='leader':
            pull(0,N)
        elif policy.startswith('screen'):   # k draws per new arm, then commit to best posterior mean
            k=int(policy[6:])
            for i in range(1,K+1): pull(i,k)
            # posterior mean with prior N(leadhat+m0, tau^2)
            pm=np.empty(K+1); pm[0]=lead0
            w=tau**2/(tau**2+S**2/np.maximum(cnt[1:],1)); pm[1:]=(lead0+m0)+w*(sums[1:]/np.maximum(cnt[1:],1)-(lead0+m0))
            pull(int(np.argmax(pm)),left)
        elif policy=='halving':
            alive=list(range(0,K+1)); per=1
            while len(alive)>2 and left>0:
                for i in alive: pull(i,per)
                means=[sums[i]/cnt[i] for i in alive]
                order=np.argsort(means)[::-1]; alive=[alive[j] for j in order[:max(2,len(alive)//2)]]; per*=2
                if len(alive)==2: break
            while left>0:
                for i in alive: pull(i,min(4,left))
                # keep both; favour better
                if left>0:
                    j=alive[int(np.argmax([sums[i]/cnt[i] for i in alive]))]; pull(j,min(4,left))
        elif policy=='thompson':  # sample posterior mean per arm, pull argmax (prior N(lead0+m0,tau) for new, N(lead0,.09) for leader)
            while left>0:
                pr_m=np.full(K+1,lead0+m0); pr_v=np.full(K+1,tau**2+0.09**2); pr_m[0]=lead0; pr_v[0]=0.09**2
                n=cnt.copy(); n[0]-=1; s=sums.copy(); s[0]-=lead0
                pv=1/(1/pr_v+n/S**2); pmn=pv*(pr_m/pr_v+s/S**2)
                pull(int(np.argmax(rng.normal(pmn,np.sqrt(pv)))))
        for j,c in enumerate(cuts): out[r,j]=best>=c
        out[r,2]=out[r,2]
    return out.mean(axis=0)
for tau,m0 in ((0.10,-0.03),(0.15,-0.03),(0.25,-0.05),(0.15,-0.10)):
    print("\nchange effect ~ N(%.2f, %.2f^2); P(max>=5.6,5.8,5.9) after 100 slots"%(m0,tau))
    print(" leader only        ", sim('leader',1,tau,m0))
    for K in (8,16,30):
        for pol in ('screen1','screen2','halving','thompson'):
            if pol=='screen2' and K>30: continue
            print(" K=%2d %-9s"%(K,pol), sim(pol,K,tau,m0))
