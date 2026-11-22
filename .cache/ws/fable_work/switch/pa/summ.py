import json,glob,sys,collections
tag=sys.argv[1]
F=[json.load(open(f)) for f in sorted(glob.glob(f'sim/{tag}/sq*.json'))]
n=len(F); C=collections.Counter
tot=lambda k:sum(f[k] for f in F)
print(tag,'matches',n,'kills',tot('kills'),'mean',round(tot('kills')/n,2),'alive',round(tot('alive')/n,1),'fuse',tot('fuse'),'err',tot('errors'))
N=tot('n'); nt=tot('noTgt')
print('decisions',N,'noTgt',nt,round(nt/N,3),'s/match',round(nt/n/10,1),'moving',tot('noTgtMove'),'still',tot('noTgtStill'),'hp>=60%',tot('hpNoTgtHi'))
lg=C(); [lg.update(f['legsNoTgt']) for f in F]; print('legs no target',dict(lg.most_common()))
al=C(); [al.update(f['legs']) for f in F]; print('legs all',dict(al.most_common()))
md=C(); [md.update(f['modes']) for f in F]; print('modes',dict(md))
print('fight dec',tot('fightN'),'moving',tot('fightMove'),'standoff',tot('standoffN'))
nl=C(); [nl.update(f['nLosHist']) for f in F]; dm=C(); [dm.update(f['dmgByLos']) for f in F]
for k in sorted(nl): print(' nLos',k,'dec',nl[k],'s/match',round(nl[k]/n/10,1),'dmg in',round(dm.get(k,0)),'dps',round(dm.get(k,0)/max(1,nl[k])*10,1))
L=[e for f in F for e in f['newLines']]
print('new lines',len(L),'per match',round(len(L)/n,1))
def grp(name,sel):
    S=[e for e in L if sel(e)]
    if not S: print(name,0); return
    fi=[e for e in S if e['fIn'] is not None]; fo=[e for e in S if e['fOut'] is not None]
    we=[e for e in S if e['fOut'] is not None and (e['fIn'] is None or e['fOut']<=e['fIn'])]
    they=[e for e in S if e['fIn'] is not None and (e['fOut'] is None or e['fIn']<e['fOut'])]
    med=lambda a:sorted(a)[len(a)//2] if a else None
    print(f"{name}: n={len(S)} ours={sum(1 for e in S if e['ours'])} theirs={sum(1 for e in S if e['ours'] is False)} weFirst={len(we)} theyFirst={len(they)} noDmg={len(S)-len(we)-len(they)} med fIn={med([e['fIn'] for e in fi])} med fOut={med([e['fOut'] for e in fo])} med d={med([e['d'] for e in S])}")
grp('all',lambda e:1)
grp('no target before (opening of a fight)',lambda e:not e['hadTgt'])
for k in ['hunt','huntsnd','huntlast','huntring','roam','hold','loot','zone']:
    grp('  leg '+k,lambda e:not e['hadTgt'] and e['leg']==k)
grp('  moving>3',lambda e:not e['hadTgt'] and e['sp']>3)
grp('  still<=3',lambda e:not e['hadTgt'] and e['sp']<=3)
grp('in fight, new non-target line',lambda e:e['hadTgt'] and not e['isTgt'])
grp('  opened by our motion',lambda e:e['hadTgt'] and not e['isTgt'] and e['ours'])
grp('  opened by theirs',lambda e:e['hadTgt'] and not e['isTgt'] and e['ours'] is False)
for k in ['standoff','regain','isolate','grab','ambush','zone','loot']:
    grp('  in-fight leg '+k,lambda e:e['hadTgt'] and not e['isTgt'] and e['leg']==k)
for b in [(0,60),(60,120),(120,400)]:
    grp(f'  in-fight d {b}',lambda e:e['hadTgt'] and not e['isTgt'] and b[0]<=e['d']<b[1])
for k in range(0,4): grp(f'  in-fight nLosBefore={k}',lambda e:e['hadTgt'] and not e['isTgt'] and e['nLosBefore']==k)
fh=[f['firstHurtT'] for f in F if f['firstHurtT']>=0]; print('first hurt median',sorted(fh)[len(fh)//2])
