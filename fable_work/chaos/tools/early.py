#!/usr/bin/env python3
import json,glob,os
F=os.path.dirname(os.path.abspath(__file__))+'/../out/sim'
def load(tag): return {json.load(open(f))['a1']:json.load(open(f)) for f in glob.glob(F+'/'+tag+'/*.meta.json')}
b=load('early_base')
for tag in ('early_base','early_dropLife','early_dropIdle'):
    d=load(tag)
    if not d: continue
    s=[k for k in d if k in b]
    c={}
    for x in d.values():
        for k,v in x['counters'].items():
            if k[:2]=='dl': c[k]=c.get(k,0)+v
        for k in ('dropgo','dropcap','dropin','drop'):
            if x['legs'].get(k): c['leg.'+k]=c.get('leg.'+k,0)+x['legs'][k]
    print('%-15s n %2d kills %3d (base same seeds %3d) alive %5.0f s (base %5.0f) differ %d up %d down %d drops captured %d in %d matches | %s'%(tag,len(d),sum(x['kills'] for x in d.values()),sum(b[k]['kills'] for k in s),
      sum(x['alive'] for x in d.values()),sum(b[k]['alive'] for k in s),sum(1 for k in s if d[k]['hash']!=b[k]['hash']),sum(1 for k in s if d[k]['kills']>b[k]['kills']),sum(1 for k in s if d[k]['kills']<b[k]['kills']),
      sum(x.get('dropEv',0) for x in d.values()),sum(1 for x in d.values() if x.get('dropEv',0)>0),' '.join('%s=%d'%kv for kv in sorted(c.items()))))
    if tag!='early_base': print('   per seed (kills base->this, alive base->this, drops):',' '.join('%s:%d->%d,%.0f->%.0f,%d'%(k,b[k]['kills'],d[k]['kills'],b[k]['alive'],d[k]['alive'],d[k].get('dropEv',0)) for k in sorted(s,key=int)))
