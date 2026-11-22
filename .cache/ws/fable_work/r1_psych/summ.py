import json,glob,os
F='sim'; base={}
for f in glob.glob(F+'/base/*.meta.json'):
    d=json.load(open(f)); base[d['a1']]=d
for tag in sorted(os.listdir(F)):
    n=diff=up=dn=net=0; c={}; fuse=0; ch=[]
    for f in glob.glob(F+'/'+tag+'/*.meta.json'):
        d=json.load(open(f)); b=base.get(d['a1']); fuse+=d['fuse']
        for k in ('vetoSilent','opCrowd','lcSilent','aimVetoes','losing','targetSwitches'): c[k]=c.get(k,0)+d.get('counters',{}).get(k,0)
        if not b: continue
        n+=1
        if b['hash']!=d['hash']: diff+=1; ch.append('%s:%d>%d'%(d['a1'],b['kills'],d['kills']))
        up+=d['kills']>b['kills']; dn+=d['kills']<b['kills']; net+=d['kills']-b['kills']
    print(tag,'n',n,'differ',diff,'up',up,'down',dn,'net',net,'fuse',fuse,c,' '.join(ch))
