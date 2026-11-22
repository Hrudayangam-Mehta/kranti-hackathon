import json,glob,os
F=os.path.dirname(os.path.abspath(__file__))+'/sim'
base={}
for f in glob.glob(F+'/base/*.meta.json'):
    d=json.load(open(f)); base[d['a1']]=d
for tag in sorted(os.listdir(F)):
    n=diff=up=dn=net=0; ch=[]
    for f in glob.glob(F+'/'+tag+'/*.meta.json'):
        d=json.load(open(f)); b=base.get(d['a1'])
        if not b: continue
        n+=1
        if b['hash']!=d['hash']: diff+=1
        if d['kills']!=b['kills']: ch.append('%s:%d->%d'%(d['a1'],b['kills'],d['kills']))
        up+=d['kills']>b['kills']; dn+=d['kills']<b['kills']; net+=d['kills']-b['kills']
    print(tag,'n',n,'differ',diff,'up',up,'down',dn,'net',net,' '.join(sorted(ch)))
