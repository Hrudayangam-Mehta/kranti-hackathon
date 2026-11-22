# noise ceiling of the calibration set: how well could a PERFECT simulator of mean effects agree with official single-draw deltas?
import math, random, sys
from steps import *
import ana
ptag=sys.argv[1] if len(sys.argv)>1 else 'default'
# 1. official salt replicates (same config, different salt): kills
fam={'V4 (C3)':[K['variants/V4'],K['variants/V4salt1'],K['variants/V4salt2']],'KB':[K['variants6/KB_s0'],K['variants6/KB_s1'],K['variants6/KB_s2']],'KS':[K['variants6/KS'],K['variants6/KS_s1']],'S':[K['variants/S'],K['variants6/S_s1']]}
ss=0;df=0
for k,v in fam.items():
    m=sum(v)/len(v); q=sum((x-m)**2 for x in v); ss+=q; df+=len(v)-1; print(k,v,'sd %.1f'%math.sqrt(q/(len(v)-1)))
sd_draw=math.sqrt(ss/df); s=sd_draw/math.sqrt(48)
print('pooled official per-draw sd %.1f kills (%.3f score), df %d; per-match within-seed sd %.2f kills'%(sd_draw,sd_draw/48,df,s))
# sim within-seed sd across salts
for names in (['variants/V4','variants/V4salt1','variants/V4salt2'],['variants6/KB_s0','variants6/KB_s1','variants6/KB_s2'],['variants6/KS','variants6/KS_s1']):
    D=[ana.load(ptag,n) for n in names]
    if any(d is None for d in D): continue
    seeds=sorted(set.intersection(*[set(d) for d in D])); w=0
    tot=[sum(d[x]['score'] for x in seeds) for d in D]
    for x in seeds:
        v=[d[x]['score'] for d in D]; m=sum(v)/len(v); w+=sum((y-m)**2 for y in v)/(len(v)-1)
    print('sim',[n.split('/')[-1] for n in names],'totals',tot,'within-seed sd %.2f kills per match (n=%d seeds)'%(math.sqrt(w/len(seeds)),len(seeds)))
# 2. replicate deltas of the same change
rows=ana.stepstats(ptag); byid={r['id']:r for r in rows}
print('replicates: seek',[byid[i]['off'] for i in ('seek_s0a','seek_s0b','seek_s1') if i in byid],'K0items',[byid[i]['off'] for i in ('K0items_s0a','K0items_s0b','K0items_s1') if i in byid],'any70',[byid[i]['off'] for i in ('any70_s0','any70_s1') if i in byid])
# 3. expected noise of each official delta if the change had NO mean effect: m touched matches (sim estimate), each fully re-rolled
tot_obs=0; tot_null=0
for r in rows:
    m=max(1,round(r['diff']*48/r['n'])) if r['off']!=0 or r['diff']>0 else 0
    r['m']=m; r['nsd']=s*math.sqrt(m*(2-m/48))
    tot_obs+=r['off']**2; tot_null+=r['nsd']**2
print('official deltas: rms %.1f kills; null (pure re-roll, m from sim divergence) rms %.1f kills; ratio obs/null variance %.2f'%(math.sqrt(tot_obs/len(rows)),math.sqrt(tot_null/len(rows)),tot_obs/tot_null))
for kind in 'BP':
    rr=[r for r in rows if r['kind']==kind]
    if rr: print(' kind',kind,'n',len(rr),'obs rms %.1f null rms %.1f'%(math.sqrt(sum(r['off']**2 for r in rr)/len(rr)),math.sqrt(sum(r['nsd']**2 for r in rr)/len(rr))))
# 4. ceiling: suppose true effects theta_i = the sim's own estimates scaled so that var(theta)=rel*var(off). Monte Carlo sign agreement and Spearman of a PERFECT simulator
R=random.Random(3)
def ceiling(tsd, simse_scale=0.0, N=4000):
    ag=0;agn=0;rh=0
    for _ in range(N):
        th=[R.gauss(0,tsd) if r['kind']=='B' else R.gauss(0,tsd*0.25) for r in rows]
        off=[round(t+R.gauss(0,r['nsd'])) for t,r in zip(th,rows)]
        sim=[t+R.gauss(0,r['se']*simse_scale) for t,r in zip(th,rows)]
        for o,x in zip(off,sim):
            if o!=0: agn+=1; ag+=(o>0)==(x>0)
        rh+=ana.spear(off,sim)
    return ag/agn, rh/N
for tsd in (0,3,6,10):
    a,b=ceiling(tsd,0); c,d=ceiling(tsd,1)
    print('true effect sd %2d kills (behaviour steps): perfect simulator sign %.2f spearman %.2f | perfect model at this run\'s seed count: sign %.2f spearman %.2f'%(tsd,a,b,c,d))
