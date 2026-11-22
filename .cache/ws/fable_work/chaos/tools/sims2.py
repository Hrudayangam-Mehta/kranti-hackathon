#!/usr/bin/env python3
"""sims2.py: per sim tag vs base: matches that differ, kills, up/down, alive, errors, fuse, worst decision ms, chaos counters, laser shots/hits."""
import json,glob,os
F=os.path.dirname(os.path.abspath(__file__))+'/../out/sim'
def load(tag): return {json.load(open(f))['a1']:json.load(open(f)) for f in glob.glob(F+'/'+tag+'/*.meta.json')}
base=load('base')
print('%-16s %3s %5s %5s %7s %4s %3s %4s %3s %4s %6s  counters'%('tag','n','kills','mean','alive_s','diff','up','down','err','fuse','maxMs'))
for tag in ['base']+sorted(t for t in os.listdir(F) if t!='base' and os.path.isdir(F+'/'+t)):
    d=load(tag)
    if not d: continue
    ks=sum(x['kills'] for x in d.values()); al=sum(x['alive'] for x in d.values())
    df=sum(1 for s,x in d.items() if s in base and base[s]['hash']!=x['hash']); up=sum(1 for s,x in d.items() if s in base and x['kills']>base[s]['kills']); dn=sum(1 for s,x in d.items() if s in base and x['kills']<base[s]['kills'])
    c={}
    for x in d.values():
        for k,v in x.get('counters',{}).items():
            if k[:2] in ('fk','lg','sn','al','pm','is','dl') or k in ('boostCharge','strafeFar','laserShots','laserHits','boostSpend'): c[k]=c.get(k,0)+v
    err=sum(x.get('errors',0) for x in d.values()); fu=sum(x.get('fuse',0) for x in d.values()); mx=max(x.get('maxMs',0) for x in d.values())
    print('%-16s %3d %5d %5.2f %7.0f %4d %3d %4d %3d %4d %6.1f  %s'%(tag,len(d),ks,ks/len(d),al,df,up,dn,err,fu,mx,' '.join('%s=%d'%kv for kv in sorted(c.items()))))
