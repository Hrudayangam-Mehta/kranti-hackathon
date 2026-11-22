import json,glob
def load(tag):
    return {int(json.load(open(f))['a1']):json.load(open(f)) for f in glob.glob('sim/%s/*.meta.json'%tag)}
b=load('base'); h=load('H10')
def dl(d):
    hi=d['hist']; T=hi[-1]['t']; last3=[x for x in hi if x['t']>=T-3]
    return dict(lastleg=hi[-1]['l'], lastmode=hi[-1]['m'], reg3=any(x['l']=='regain' for x in last3), mem3=any(x['age'] is not None and 4<x['age']<=10 for x in last3), hp3=last3[0]['hp'])
for tag,D in (('base',b),('H10',h)):
    n=len(D); print(tag,'n',n,'fuse',sum(d['fuse'] for d in D.values()),'err',sum(d['errors'] for d in D.values()),'kills',sum(d['kills'] for d in D.values()),'alive',round(sum(d['alive'] for d in D.values())),
      'FIGHT',sum(d['modes'].get('FIGHT',0) for d in D.values()),'HEAL',sum(d['modes'].get('HEAL',0) for d in D.values()),'LOOT+HOLD',sum(d['modes'].get('LOOT',0)+d['modes'].get('HOLD',0) for d in D.values()),'DISENG',sum(d['modes'].get('DISENGAGE',0) for d in D.values()),
      'regain',sum(d['legs'].get('regain',0) for d in D.values()),'n',sum(d['n'] for d in D.values()),'memHold',sum(d['memHold'] for d in D.values()),'regLow',sum(d['regLow'] for d in D.values()),'null5570',sum(d['nullTgt5570'] for d in D.values()),
      'deaths lastleg regain',sum(dl(d)['lastleg']=='regain' for d in D.values()),'regain in last3s',sum(dl(d)['reg3'] for d in D.values()),'memtarget in last3s',sum(dl(d)['mem3'] for d in D.values()),
      'cause',{c:sum(d['cause']==c for d in D.values()) for c in set(d['cause'] for d in D.values())})
ch=[]
for s in sorted(h):
    if s in b and b[s]['hash']!=h[s]['hash']:
        x=dl(b[s]); y=dl(h[s]); ch.append(s)
        print(s,'kills %d>%d alive %.0f>%.0f cause %s>%s lastleg %s>%s reg3 %s>%s mem3 %s FIGHT %d>%d memHold %d>%d'%(b[s]['kills'],h[s]['kills'],b[s]['alive'],h[s]['alive'],b[s]['cause'],h[s]['cause'],x['lastleg'],y['lastleg'],x['reg3'],y['reg3'],y['mem3'],b[s]['modes'].get('FIGHT',0),h[s]['modes'].get('FIGHT',0),b[s]['memHold'],h[s]['memHold']))
print('differ',len(ch),'of',len([s for s in h if s in b]),ch,'net',sum(h[s]['kills']-b[s]['kills'] for s in ch),'up',sum(h[s]['kills']>b[s]['kills'] for s in ch),'down',sum(h[s]['kills']<b[s]['kills'] for s in ch))
