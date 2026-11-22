import json,glob,os,sys
F=sys.argv[1]
def load(tag):
    r={}
    for f in glob.glob(F+'/'+tag+'/*.meta.json'):
        try: d=json.load(open(f))
        except Exception: continue
        r[int(d['a1'])]=d
    return r
base=load('base')
bf=[s for s,d in base.items() if d['fuse'] or d['errors']]
print('base n',len(base),'fuse/err seeds',bf,'kills',sum(d['kills'] for d in base.values()),'HEAL ticks',sum(d['modes'].get('HEAL',0) for d in base.values()),'DISENGAGE',sum(d['modes'].get('DISENGAGE',0) for d in base.values()),'ticks',sum(d['n'] for d in base.values()), 'heal seeds',sorted(s for s,d in base.items() if d['modes'].get('HEAL',0)))
for tag in sorted(os.listdir(F)):
    if tag=='base': continue
    v=load(tag); n=diff=up=dn=net=0; ch=[]; fz=[]; dh=dd=0
    for s,d in sorted(v.items()):
        b=base.get(s)
        if not b: continue
        if d['fuse'] or d['errors'] or b['fuse'] or b['errors']: fz.append(s); continue
        n+=1
        if b['hash']!=d['hash']:
            diff+=1; ch.append('%d:%d->%d'%(s,b['kills'],d['kills']))
        up+=d['kills']>b['kills']; dn+=d['kills']<b['kills']; net+=d['kills']-b['kills']
        dh+=d['modes'].get('HEAL',0)-b['modes'].get('HEAL',0); dd+=d['modes'].get('DISENGAGE',0)-b['modes'].get('DISENGAGE',0)
    print(tag,'n',n,'discarded(fuse)',fz,'differ',diff,'up',up,'down',dn,'net',net,'dHEALticks',dh,'dDISENGAGEticks',dd,'|',' '.join(ch))
