import json,sys,math
from collections import Counter
base=json.load(open(sys.argv[1]))['matches']; B={m['seed']:m for m in base}
def ms(v):
    n=len(v); m=sum(v)/n; sd=math.sqrt(sum((x-m)**2 for x in v)/(n-1)) if n>1 else 0
    return m, sd/math.sqrt(n)
def desc(name, M):
    n=len(M)
    k,ks=ms([m['kills'] for m in M]); sc,_=ms([m['score'] for m in M]); t,ts=ms([m['timeAlive'] for m in M])
    dealt=sum(m['dmgDealt'] for m in M)/n; taken=sum(m['dmgTaken'] for m in M)/n
    nl=Counter(min(m.get('nLosEnd',-1),5) for m in M)
    causes=Counter(m['cause'] for m in M)
    print(f"{name:10s} n={n} kills {k:.3f}+-{ks:.3f} score {sc:.3f} alive {t:.1f}+-{ts:.1f}s dealt {dealt:.0f} taken {taken:.0f} ratio {dealt/taken:.2f} hp_spent/1400 {taken/1400:.2f}")
    print(f"   deaths by lines at death (0,1,2,3,4,5+): {[nl.get(i,0) for i in range(6)]}  causes {dict(causes)}  zone deaths {causes.get('zone',0)}  alive {sum(1 for m in M if m['alive'])}")
    print(f"   errors {sum(m.get('errors',0) for m in M)} brainErr {sum(m.get('bErrors',0) for m in M)} {Counter(k for m in M for k in (m.get('errStages') or {}))} fuse {sum(m.get('fuse',0) for m in M)} stuck {sum(m.get('stuck',0) for m in M)} noProg {sum(m.get('noProg',0) for m in M)} abandons {sum(m.get('abandons',0) for m in M)} maxMs(max, load-affected) {max(m['maxMs'] for m in M)} meanMs {sum(m['meanMs'] for m in M)/n:.2f}")
    S=[m['sanc'] for m in M if m.get('sanc')]
    if S:
        g=lambda k: sum(s.get(k,0) for s in S)
        print(f"   sanc: matches tried {sum(1 for s in S if s['tries'])} up {sum(1 for s in S if s['ups'])} | tries {g('tries')} ups {g('ups')} climbFails {g('fails')} walkAbort {g('walkAbort')} drops {g('drops')} zoneDrops {g('zoneDrops')} hurtDrops>0 in {sum(1 for s in S if s['hurtDrops'])}")
        print(f"         per match: top {g('topTicks')*0.1/n:.1f}s (edge {g('edgeTicks')*0.1/n:.1f}s) healed {g('healHp')/n:.0f} hp, hurt on top {g('hurtTop')/n:.0f} hp; lines/tick centre {g('linesCentre')/max(1,g('centreTicks')):.2f} edge {g('linesEdge')/max(1,g('edgeTicks')):.2f}; died in phase {dict(Counter(s['phaseEnd'] for s in S))}; sanc code max ms wall {max(s.get('maxMs',0) for s in S):.1f} cpu {max(s.get('maxCpuMs',0) for s in S):.1f} (cpu sum/match {sum(s.get('sumCpuMs',0) for s in S)/n:.0f} ms)")
        print(f"         line sources (ticks): { {k:g(k) for k in ['Cup','Cd60','Cd110','Cfar','Eup','Ed60','Ed110','Efar']} }")
desc('BASE', base)
for f in sys.argv[2:]:
    M=json.load(open(f))['matches']
    desc(f.split('/')[-1][:-5], M)
    P=[(m,B[m['seed']]) for m in M if m['seed'] in B]
    for key in ['kills','score','timeAlive','dmgDealt','dmgTaken']:
        d,se=ms([a[key]-b[key] for a,b in P]); print(f"   paired d{key} {d:+.3f} +- {se:.3f} (n={len(P)})", end=';')
    w=sum(1 for a,b in P if a['kills']>b['kills']); l=sum(1 for a,b in P if a['kills']<b['kills']); print(f"\n   kills W/T/L {w}/{len(P)-w-l}/{l}")
    T=[(a,b) for a,b in P if a.get('sanc') and a['sanc']['ups']>0]; U=[(a,b) for a,b in P if not(a.get('sanc') and a['sanc']['ups']>0)]
    if T: d,se=ms([a['kills']-b['kills'] for a,b in T]); print(f"   reached a roof: n={len(T)} dkills {d:+.3f}+-{se:.3f}", end='; ')
    if len(U)>1: d,se=ms([a['kills']-b['kills'] for a,b in U]); print(f"never up: n={len(U)} dkills {d:+.3f}+-{se:.3f}")
    else: print()
