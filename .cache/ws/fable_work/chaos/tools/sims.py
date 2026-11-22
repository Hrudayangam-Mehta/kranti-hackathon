#!/usr/bin/env python3
"""sims.py: per sim tag vs base: matches that differ, kills, up/down, time alive, drops captured, selected counters."""
import json,glob,os,sys
F=os.path.dirname(os.path.abspath(__file__))+'/../out/sim'
def load(tag): return {json.load(open(f))['a1']:json.load(open(f)) for f in glob.glob(F+'/'+tag+'/*.meta.json')}
base=load('base')
keys=sys.argv[1:] 
print('%-10s %3s %5s %6s %7s %4s %3s %4s %5s  counters'%('tag','n','kills','mean','alive_s','diff','up','down','drops'))
for tag in ['base']+sorted(t for t in os.listdir(F) if t!='base'):
    d=load(tag)
    if not d: continue
    ks=sum(x['kills'] for x in d.values()); al=sum(x['alive'] for x in d.values()); dr=sum(x.get('dropEv',0) for x in d.values())
    df=sum(1 for s,x in d.items() if s in base and base[s]['hash']!=x['hash']); up=sum(1 for s,x in d.items() if s in base and x['kills']>base[s]['kills']); dn=sum(1 for s,x in d.items() if s in base and x['kills']<base[s]['kills'])
    c={}
    for x in d.values():
        for k,v in x.get('counters',{}).items():
            if k[:2] in ('dl','pm','uH','uT','uW','uR','is','up','fu','pl') or k in('errors',): c[k]=c.get(k,0)+v
    err=sum(x.get('errors',0) for x in d.values())
    for x in d.values():
        for k in ('isolate','standoff','dropgo','dropcap','dropin','uwait'):
            if x.get('legs',{}).get(k): c['leg.'+k]=c.get('leg.'+k,0)+x['legs'][k]
    c['maxMs']=max(x.get('maxMs',0) for x in d.values())
    print('%-10s %3d %5d %6.2f %7.0f %4d %3d %4d %5d  err%d %s'%(tag,len(d),ks,ks/len(d),al,df,up,dn,dr,err,' '.join('%s=%d'%kv for kv in sorted(c.items()))))
