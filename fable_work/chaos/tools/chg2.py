#!/usr/bin/env python3
"""chg2.py: changed decisions of every chg_* / ffa_* set against id/old (FNV SELECT, salt 1): R3a2 set, FFA-inert set, forced-FFA sources."""
import json,glob,os
I=os.path.dirname(os.path.abspath(__file__))+'/../id'
R3=['kit_squad','kit_auto','l4800_squad','l4800_auto','l11_squad','l11_auto','l23p_squad','l23p_auto']+['sq%d'%i for i in range(1,7)]
FF=['kit_auto','kit_ffa']+['f%d_%s'%(i,e) for i in range(1,5) for e in ('auto','ffa')]+['ff%d'%i for i in range(411,415)]
FO=['kit_ffa']+['f%d_ffa'%i for i in range(1,5)]
def cmp(tag,names):
    dl=tl=src=n=miss=0
    for s in names:
        a='%s/old/FNV_%s.jsonl'%(I,s); b='%s/%s/FNV_%s.jsonl'%(I,tag,s)
        if not (os.path.exists(a) and os.path.exists(b)): miss+=1; continue
        la=open(a).read().split('\n'); lb=open(b).read().split('\n'); n+=1
        d=sum(1 for i in range(min(len(la),len(lb))) if la[i]!=lb[i])+abs(len(la)-len(lb))
        tl+=max(len(la),len(lb))-1; dl+=d; src+=1 if d else 0
    return '%d/%d lines, %d/%d src%s'%(dl,tl,src,n,(' (%d missing)'%miss) if miss else '')
for tag in sorted(os.listdir(I)):
    if not (tag.startswith('chg_') or tag.startswith('ffa_')): continue
    c={}; fu=er=0
    for f in glob.glob('%s/%s/*.meta.json'%(I,tag)):
        m=json.load(open(f)); fu+=m['fuse']; er+=m['errors']
        for k,v in m.get('counters',{}).items():
            if k[:2] in ('fk','lg','sn','al','pm','is','dl') or k in ('boostCharge','strafeFar'): c[k]=c.get(k,0)+v
    print('%-20s R3a2: %-28s FFA-inert: %-28s forced FFA: %-24s fuse %d err %d | %s'%(tag[4:],cmp(tag,R3),cmp(tag,FF),cmp(tag,FO),fu,er,' '.join('%s=%d'%kv for kv in sorted(c.items()))))
