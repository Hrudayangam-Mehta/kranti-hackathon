#!/usr/bin/env python3
"""chg.py: changed decisions of every chg_<preset>_<value> recording set against the off recordings (FNV SELECT, salt 1)."""
import json,glob,os,sys
I=os.path.dirname(os.path.abspath(__file__))+'/../id'
ref=sys.argv[1] if len(sys.argv)>1 else 'final'
R3=['kit_squad','kit_auto','l4800_squad','l4800_auto','l11_squad','l11_auto','l23p_squad','l23p_auto']+['sq%d'%i for i in range(1,7)]
FF=['kit_auto','kit_ffa']+['f%d_%s'%(i,e) for i in range(1,5) for e in ('auto','ffa')]+['ff%d'%i for i in range(411,415)]
def cmp(tag,names):
    dl=tl=src=n=0; miss=0
    for s in names:
        a='%s/%s/FNV_%s.jsonl'%(I,ref,s); b='%s/%s/FNV_%s.jsonl'%(I,tag,s)
        if not (os.path.exists(a) and os.path.exists(b)): miss+=1; continue
        la=open(a).read().split('\n'); lb=open(b).read().split('\n'); n+=1
        d=sum(1 for i in range(min(len(la),len(lb))) if la[i]!=lb[i])+abs(len(la)-len(lb))
        tl+=max(len(la),len(lb))-1; dl+=d; src+=1 if d else 0
    return '%d of %d lines, %d of %d sources%s'%(dl,tl,src,n,(' (%d missing)'%miss) if miss else '')
for tag in sorted(os.listdir(I)):
    if not tag.startswith('chg_'): continue
    c={}
    for f in glob.glob('%s/%s/*.meta.json'%(I,tag)):
        for k,v in json.load(open(f)).get('counters',{}).items():
            if k[:2] in ('dl','pm','uH','uT','uW','uR','uG','uO','is') or k=='fuse' or k=='plansCached': c[k]=c.get(k,0)+v
    print('%-18s R3a2 set: %s | FFA-inert set: %s | %s'%(tag[4:],cmp(tag,R3),cmp(tag,FF),' '.join('%s=%d'%kv for kv in sorted(c.items()))))
