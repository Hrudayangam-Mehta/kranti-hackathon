import json,sys,collections
def L(tag,s): return json.load(open(f'sim/{tag}/sq{s}.json'))
for tag in sys.argv[1:]:
    kb=kv=0; ab=av=0; diff=0; up=dn=0; c=collections.Counter(); nl=collections.Counter(); nlb=collections.Counter(); ours=oursb=0; nt=ntb=0;still=0
    for s in range(1,25):
        b=L('base',s); v=L(tag,s); kb+=b['kills']; kv+=v['kills']; ab+=b['alive']; av+=v['alive']
        if b['legs']!=v['legs'] or b['alive']!=v['alive']: diff+=1
        up+=v['kills']>b['kills']; dn+=v['kills']<b['kills']; c.update(v['legs']); nl.update(v['nLosHist']); nlb.update(b['nLosHist'])
        f=lambda m:sum(1 for e in m['newLines'] if e['hadTgt'] and not e['isTgt'] and e['ours'])
        ours+=f(v); oursb+=f(b); nt+=v['noTgt']; ntb+=b['noTgt']; still+=v['noTgtStill']
    print(tag,'kills base',kb,'var',kv,'alive',round(ab),round(av),'differ',diff,'up',up,'down',dn,'ambhold dec',c.get('ambhold',0),'noTgt',ntb,nt,'still',still,'our-motion lines',oursb,ours)
    print('   nLos>=2 dec base',sum(v for k,v in nlb.items() if int(k)>=2),'var',sum(v for k,v in nl.items() if int(k)>=2))
