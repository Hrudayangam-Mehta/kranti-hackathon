import json,sys
for tag in ['base','CH1_s1']:
    R=[json.loads(l) for l in open('probe/%s.jsonl'%tag)]
    print('==',tag,'matches',len(R),'kills',sum(r['kills'] for r in R),'alive %.0f'%sum(r['alive'] for r in R),'errors',sum(r['errors'] for r in R),'fuse',sum(r['fuse'] for r in R),'maxMs',max(r['maxMs'] for r in R))
    for r in R:
        rel=r['rel']; part=[x for x in rel if 0<=x['frac']<0.97]
        cg=r['cubeGains']; corpse=[x for x in cg if 0<=x['sinceKill']<=12 and x['dCorpse']<=30]
        w=r['walk']
        print(' sd%2d k%d alive%5.1f fw %4d/%4d fwEnd%5.1f | laserT%5.1f light%5.1f mortar%5.1f sweep %.1frad lgsOn %3d lastT%5.1f boost%3d stop%d | rel %2d partial %d %s | cubes %d corpse %d rushN %3d | walk ep %d dec %d killed %d boost %d'%(
            r['seed'],r['kills'],r['alive'],r['fwN'],r['n'],r['fwEndT'],r['laserT'],r['lightT'],r['mortarT'],r['sweepYaw'],r['cnt']['lgsOn'],r['lgsOnLastT'],r['cnt']['lgsBoost'],r['cnt']['lgsStopDmg'],
            len(rel),len(part),','.join('%.2f@hp%d%s'%(x['frac'],x['hp'],'d' if x['npc'] else '') for x in part)[:60],sum(x['n'] for x in cg),sum(x['n'] for x in corpse),r['corpseRushN'],len(w),sum(e['n'] for e in w),sum(1 for e in w if e['killed']),sum(e['boost'] for e in w)))
    L=[r['laserT'] for r in R]
    print('  laser held by 15 s: %d/%d, by 25 s: %d/%d, ever: %d/%d ; lightning ever %d ; mortar ever %d'%(sum(1 for x in L if 0<=x<=15),len(R),sum(1 for x in L if 0<=x<=25),len(R),sum(1 for x in L if x>=0),len(R),sum(1 for r in R if r['lightT']>=0),sum(1 for r in R if r['mortarT']>=0)))
    allrel=[x for r in R for x in r['rel']]
    print('  laser releases %d, partial (<0.97 full) %d, partial on mechs %d; on-firewall releases %d'%(len(allrel),sum(1 for x in allrel if 0<=x['frac']<0.97),sum(1 for x in allrel if 0<=x['frac']<0.97 and not x['npc']),sum(1 for x in allrel if x['fw'])))
    W=[e for r in R for e in r['walk']]
    print('  walk-in episodes %d in %d matches, decisions %d, ended in a kill %d, median dMin %s, boost decisions %d'%(len(W),sum(1 for r in R if r['walk']),sum(e['n'] for e in W),sum(1 for e in W if e['killed']),sorted(e['dMin'] for e in W)[len(W)//2] if W else '-',sum(e['boost'] for e in W)))
    K=[k for r in R for k in r['killsL']]
    print('  our kills seen %d, during/after a walk-in %d ; cube gains %d, of them at the corpse within 12 s %d ; corpse-rush decisions %d in %d matches'%(len(K),sum(k['walk'] for k in K),sum(x['n'] for r in R for x in r['cubeGains']),sum(x['n'] for r in R for x in r['cubeGains'] if 0<=x['sinceKill']<=12 and x['dCorpse']<=30),sum(r['corpseRushN'] for r in R),sum(1 for r in R if r['corpseRushN'])))
    print('  firewall on %d of %d decisions (%.0f%%)'%(sum(r['fwN'] for r in R),sum(r['n'] for r in R),100*sum(r['fwN'] for r in R)/sum(r['n'] for r in R)))
