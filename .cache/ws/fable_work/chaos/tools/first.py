#!/usr/bin/env python3
"""first.py TAG [REF]: per differing source of the FFA-inert set: first differing tick, latch tick and first foreign death of the reference."""
import json,sys
I='/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos/id'
tag=sys.argv[1]; ref=sys.argv[2] if len(sys.argv)>2 else 'old'
FF=['kit_auto','kit_ffa']+['f%d_%s'%(i,e) for i in range(1,5) for e in ('auto','ffa')]+['ff%d'%i for i in range(411,415)]
out=[]
for s in FF:
    a='%s/%s/FNV_%s'%(I,ref,s); b='%s/%s/FNV_%s'%(I,tag,s)
    try: la=open(a+'.jsonl').read().split('\n'); lb=open(b+'.jsonl').read().split('\n')
    except FileNotFoundError: out.append(s+':missing'); continue
    m=json.load(open(a+'.meta.json'))
    fd=next((i for i in range(min(len(la),len(lb))) if la[i]!=lb[i]), None)
    if fd is None and len(la)==len(lb): continue
    tk=json.loads(la[fd])['tick'] if fd is not None else -1
    out.append('%s first tick %s latch %s foreign %s %s'%(s,tk,m['latchTick'],m['firstForeignTick'],'PRE-LATCH' if (m['latchTick']<0 or tk<m['latchTick']) else 'POST-LATCH'))
print(tag+': '+('; '.join(out) if out else 'FFA-inert set identical'))
