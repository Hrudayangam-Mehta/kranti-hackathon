import json,glob,os,sys
R1='../r1_game/out/base/'
for tag in sys.argv[1:]:
    tot={}; n=fuse=0; kills=0; nz={}; alive=[]; ticks=0
    for f in sorted(glob.glob('out/%s/*.meta.json'%tag)):
        d=json.load(open(f)); n+=1; fuse+=d['fuse']+d['errors']; kills+=d['kills']; alive.append(d['alive']); ticks+=d['n']
        for k,v in d['counters'].items():
            if k.startswith('r2') or k in('lcFight','losing'):
                tot[k]=tot.get(k,0)+v; nz[k]=nz.get(k,0)+(v>0)
    print(tag,'n',n,'fuse+err',fuse,'kills',kills,'ticks',ticks,'alive mean %.1f max %.1f'%(sum(alive)/max(1,n),max(alive or [0])))
    for k in sorted(tot): print('   %-12s %6d  in %d matches'%(k,tot[k],nz[k]))
if len(sys.argv)>2:
    a,b=sys.argv[1],sys.argv[2]; diff=[];net=0
    for f in sorted(glob.glob('out/%s/*.meta.json'%b)):
        g='out/%s/%s'%(a,os.path.basename(f))
        if not os.path.exists(g): continue
        d=json.load(open(f)); e=json.load(open(g))
        if d['hash']!=e['hash']: diff.append('%s:%d->%d'%(d['a1'],e['kills'],d['kills'])); net+=d['kills']-e['kills']
    print(b,'vs',a,'differ',len(diff),'net',net,diff)
# identity with r1 base
same=n=0
for f in sorted(glob.glob('out/B/*.meta.json')):
    g=R1+os.path.basename(f)
    if os.path.exists(g): n+=1; same+=json.load(open(f))['hash']==json.load(open(g))['hash']
print('B vs r1 base (uninstrumented lib): same hash',same,'of',n)
