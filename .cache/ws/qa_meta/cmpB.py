import json,glob,os
O='out/'
tot={}
for f in sorted(glob.glob(O+'B_*_meta.meta.json')):
    b=f.replace('_meta.meta.json','_base.meta.json')
    if not os.path.exists(b): continue
    name=os.path.basename(f)[2:-len('_meta.meta.json')]
    la=open(f.replace('.meta.json','.jsonl')).read().split('\n'); lb=open(b.replace('.meta.json','.jsonl')).read().split('\n')
    sd=open(f.replace('.meta.json','.side')).read().split('\n')
    diffs=[i for i,(x,y) in enumerate(zip(la,lb)) if x!=y]
    m=json.load(open(f)); mb=json.load(open(b))
    ch=m['salt'][m['slot']]
    first=diffs[0] if diffs else -1
    # first decision with meta on
    on=[i for i,s in enumerate(sd) if s.startswith('1')]
    firstOn=on[0] if on else -1
    ffaOnDiff=sum(1 for i in diffs if sd[i].split(' ')[1:2]==['FFA']) if False else 0
    verdict='ok'
    if ch!='m':
        if diffs or m['hasMeta']: verdict='BAD digit slot differs'
    else:
        if not m['hasMeta']: verdict='BAD no meta'
        if '_ffa_' in name and (diffs or m['onN']): verdict='BAD ffa differs'
        if diffs and (firstOn<0 or first<firstOn): verdict='BAD differs before meta on'
        if m['ffaOn'] or m['offCntChange']: verdict='BAD on in FFA / counters while off'
    if m['errors'] or mb['errors']: verdict+=' ERRORS %d/%d'%(m['errors'],mb['errors'])
    print(name, ch, 'n',m['n'],'differ',len(diffs),'first',first,'on',m['onN'],'firstOn',firstOn,'env',m['finalEnv'], verdict, json.dumps(m['cnt'],separators=(',',':')) if (m['cnt'] and m['onN'] and 'l48_squad' in name) else '')
