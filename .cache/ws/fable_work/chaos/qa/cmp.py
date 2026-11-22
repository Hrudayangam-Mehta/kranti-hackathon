#!/usr/bin/env python3
"""cmp.py REF TAG...: per tag vs REF: sources identical / differing, changed lines, forced-FFA result, fuse, errors, maxMs, counters."""
import json,glob,os,sys
F=os.path.dirname(os.path.abspath(__file__))+'/id'
def load(tag):
    d={}
    for f in glob.glob(F+'/'+tag+'/*.meta.json'):
        d[os.path.basename(f)[:-10]]=json.load(open(f))
    return d
def lines(tag,src): return open(F+'/'+tag+'/'+src+'.jsonl').read().split('\n')
ref=sys.argv[1]; R=load(ref)
for tag in sys.argv[2:]:
    D=load(tag); same=[];diff=[];chg=0;tot=0;ffa_d=[];ffa_n=0;cnt={}
    for s,m in sorted(D.items()):
        if s not in R: continue
        a=lines(ref,s); b=lines(tag,s); tot+=len(b)-1
        if s.endswith('_ffa'): ffa_n+=1
        if m['hash']==R[s]['hash'] and a==b: same.append(s)
        else:
            n=sum(1 for x,y in zip(a,b) if x!=y)+abs(len(a)-len(b)); chg+=n; first=next((i for i,(x,y) in enumerate(zip(a,b)) if x!=y),-1)
            diff.append('%s(%d,first@%d,latch%s,fd%s)'%(s,n,first,m.get('latchTick'),m.get('firstForeignTick')))
            if s.endswith('_ffa'): ffa_d.append(s)
        for k,v in m.get('counters',{}).items():
            if k[:2] in ('fk','lg','sn','al','pm','dl') or k in('boostCharge','strafeFar','isoDwell'): cnt[k]=cnt.get(k,0)+v
    fuse=sum(m.get('fuse',0) for m in D.values()); err=sum(m.get('errors',0) for m in D.values()); mx=max([m.get('maxMs',0) for m in D.values()] or [0])
    fails=os.path.exists(F+'/'+tag+'/failures.txt')
    print('%-14s n=%d same=%d diff=%d changed=%d/%d forcedFFA: %d/%d differ | fuse=%d err=%d maxMs=%.0f%s'%(tag,len(D),len(same),len(diff),chg,tot,len(ffa_d),ffa_n,fuse,err,mx,' FAILURES' if fails else ''))
    if '-v' in os.environ.get('V',''): print('   diff:',' '.join(diff))
    if cnt: print('   counters:',' '.join('%s=%d'%kv for kv in sorted(cnt.items())))
