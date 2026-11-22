import json,glob,os,sys
F=os.path.dirname(os.path.abspath(__file__))+'/sim'
base={}
for f in glob.glob(F+'/base/*.meta.json'):
    d=json.load(open(f)); base[d['a1']]=d
print('%-10s %3s %6s %6s %5s %5s %5s  modes'%('tag','n','kills','alive','diff','up','down'))
for tag in sorted(os.listdir(F)):
    ks=[];al=[];diff=up=dn=0;net=0;modes={};nb=0;kb=0
    for f in glob.glob(F+'/'+tag+'/*.meta.json'):
        d=json.load(open(f)); ks.append(d['kills']); al.append(d['alive'])
        for m,v in d['modes'].items(): modes[m]=modes.get(m,0)+v
        b=base.get(d['a1'])
        if b:
            nb+=1;kb+=b['kills']
            if b['hash']!=d['hash']: diff+=1
            if d['kills']>b['kills']: up+=1
            if d['kills']<b['kills']: dn+=1
            net+=d['kills']-b['kills']
    if not ks: continue
    tot=sum(modes.values())
    print('%-10s %3d %6.2f %6.1f %5d %5d %5d net%+d (base same seeds %.2f) '%(tag,len(ks),sum(ks)/len(ks),sum(al)/len(al),diff,up,dn,net,kb/max(1,nb))+' '.join('%s %.0f%%'%(m,100*v/tot) for m,v in sorted(modes.items())))
