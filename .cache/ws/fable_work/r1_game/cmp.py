import json,glob,os,sys
for tag in sys.argv[1:]:
    diff=up=dn=net=n=0; lk=0; det=[]
    for f in sorted(glob.glob('out/%s/*.meta.json'%tag)):
        b='out/base/'+os.path.basename(f)
        if not os.path.exists(b): continue
        d=json.load(open(f)); e=json.load(open(b)); n+=1; lk+=d['counters'].get('lkPick',0)
        if d['hash']!=e['hash']: diff+=1; det.append('%s:%d->%d'%(d['a1'],e['kills'],d['kills']))
        up+=d['kills']>e['kills']; dn+=d['kills']<e['kills']; net+=d['kills']-e['kills']
    print(tag,'n',n,'differ',diff,'up',up,'down',dn,'net',net,'lkPick ticks',lk,det)
