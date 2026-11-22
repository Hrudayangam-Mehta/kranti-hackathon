import json,sys,os
F=os.path.dirname(os.path.abspath(__file__))+'/sim24'
def load(n):
    d={}
    for k in [f'sq{i}' for i in range(1,25)]+['kit_squad','kit_auto','kit_ffa']:
        p=f'{F}/{n}/{k}.meta.json'
        if os.path.exists(p): d[k]=json.load(open(p))
    return d
def cmp(n,b):
    A,B=load(n),load(b)
    ks=[f'sq{i}' for i in range(1,25)]
    miss=[k for k in ks if k not in A or k not in B]
    ks=[k for k in ks if k in A and k in B]
    diff=[k for k in ks if A[k]['hash']!=B[k]['hash']]
    up=[k for k in ks if A[k]['kills']>B[k]['kills']]; dn=[k for k in ks if A[k]['kills']<B[k]['kills']]
    net=sum(A[k]['kills']-B[k]['kills'] for k in ks)
    ch=' '.join(f"{k[2:]}:{B[k]['kills']}->{A[k]['kills']}" for k in ks if A[k]['kills']!=B[k]['kills'])
    h=dict(fuse=sum(A[k].get('fuse',0) for k in A),err=sum(A[k].get('errors',0) for k in A),stuck=sum(A[k].get('stuck',0) for k in A))
    zone=sum(1 for k in ks if str(A[k].get('cause','')).lower().startswith('zone'))
    kit=' '.join(f"{e}:{'same' if A['kit_'+e]['hash']==B['kit_'+e]['hash'] else 'DIFF'}" for e in ['squad','auto','ffa'] if 'kit_'+e in A and 'kit_'+e in B)
    print(f"{n} vs {b}: n {len(ks)} missing {len(miss)} | differ {len(diff)} ({','.join(k[2:] for k in diff)}) | up {len(up)} down {len(dn)} net {net:+d} [{ch}] | mean {sum(A[k]['kills'] for k in ks)/max(1,len(ks)):.3f} vs {sum(B[k]['kills'] for k in ks)/max(1,len(ks)):.3f} | fuse {h['fuse']} errors {h['err']} stuck {h['stuck']} zone deaths {zone} | kit stream {kit}")
for a in sys.argv[1:]:
    n,b=a.split(':'); cmp(n,b)
