import json, sys, os, math, random
from steps import *
W=os.path.dirname(os.path.abspath(__file__))
def load(ptag, path, lo=1, hi=10**9):
    f=f'{W}/out/{ptag}/{path.replace("/","__")}.json'
    if not os.path.exists(f): return None
    return {m['seed']:m for m in json.load(open(f)) if lo<=m['seed']<=hi}
def rank(x):
    o=sorted(range(len(x)),key=lambda i:x[i]); r=[0]*len(x); i=0
    while i<len(o):
        j=i
        while j+1<len(o) and x[o[j+1]]==x[o[i]]: j+=1
        for k in range(i,j+1): r[o[k]]=(i+j)/2+1
        i=j+1
    return r
def pear(a,b):
    n=len(a); ma=sum(a)/n; mb=sum(b)/n
    sa=math.sqrt(sum((x-ma)**2 for x in a)); sb=math.sqrt(sum((x-mb)**2 for x in b))
    return sum((x-ma)*(y-mb) for x,y in zip(a,b))/(sa*sb) if sa>0 and sb>0 else 0.0
def spear(a,b): return pear(rank(a),rank(b))
def permp(a,b,f=spear,n=20000,seed=7):
    R=random.Random(seed); obs=f(a,b); bb=list(b); c=0
    for _ in range(n):
        R.shuffle(bb)
        if f(a,bb)>=obs-1e-12: c+=1
    return obs,(c+1)/(n+1)
def binom_p(k,n): return sum(math.comb(n,i) for i in range(k,n+1))/2**n if n else 1.0
def stepstats(ptag, lo=1, hi=10**9):
    rows=[]
    for sid,a,b,fam,kind in STEPS:
        A=load(ptag,a,lo,hi); B=load(ptag,b,lo,hi)
        if not A or not B: continue
        seeds=sorted(set(A)&set(B))
        if len(seeds)<12: continue
        d=[B[s]['score']-A[s]['score'] for s in seeds]; n=len(d); m=sum(d)/n
        sd=math.sqrt(sum((x-m)**2 for x in d)/(n-1)) if n>1 else 0
        rows.append(dict(id=sid,fam=fam,kind=kind,off=K[b]-K[a],sim=m*48,se=sd/math.sqrt(n)*48,n=n,diff=sum(1 for x in d if x!=0),
                         simA=sum(A[s]['score'] for s in seeds)/n,simB=sum(B[s]['score'] for s in seeds)/n))
    return rows
def summary(rows,label=''):
    off=[r['off'] for r in rows]; sim=[r['sim'] for r in rows]
    nz=[r for r in rows if r['off']!=0 and r['sim']!=0]
    ag=sum(1 for r in nz if (r['off']>0)==(r['sim']>0))
    rho,p=permp(off,sim) if len(rows)>=4 else (float('nan'),1)
    r2,p2=permp(off,sim,pear) if len(rows)>=4 else (float('nan'),1)
    return dict(label=label,n=len(rows),sign=f'{ag}/{len(nz)}',sign_p=round(binom_p(ag,len(nz)),3),spearman=round(rho,3),p_perm=round(p,3),pearson=round(r2,3),p_pear=round(p2,3))
if __name__=='__main__':
    ptag=sys.argv[1]; lo=int(sys.argv[2]) if len(sys.argv)>2 else 1; hi=int(sys.argv[3]) if len(sys.argv)>3 else 10**9
    rows=stepstats(ptag,lo,hi)
    print(f'{"step":16s} {"fam":9s} k {"off":>4s} {"sim":>7s} {"se":>6s} {"z":>5s} n diff  simA  simB')
    for r in rows: print(f'{r["id"]:16s} {r["fam"]:9s} {r["kind"]} {r["off"]:4d} {r["sim"]:7.1f} {r["se"]:6.1f} {r["sim"]/r["se"] if r["se"] else 0:5.1f} {r["n"]} {r["diff"]:3d} {r["simA"]:5.2f} {r["simB"]:5.2f}')
    print(summary(rows,'all')); print(summary([r for r in rows if abs(r['off'])>=5],'|off|>=5')); print(summary([r for r in rows if r['kind']=='B'],'kind B')); print(summary([r for r in rows if r['kind']=='P'],'kind P'))
    lv=[]
    for path in OFF:
        A=load(ptag,path,lo,hi)
        if A: lv.append((OFF[path],sum(m['score'] for m in A.values())/len(A),sum(m['timeAlive'] for m in A.values())/len(A)))
    if lv: print('level: official mean %.2f sim mean %.2f  alive %.1fs  n=%d  level corr (pearson) %.2f'%(sum(x[0] for x in lv)/len(lv),sum(x[1] for x in lv)/len(lv),sum(x[2] for x in lv)/len(lv),len(lv),pear([x[0] for x in lv],[x[1] for x in lv])))
