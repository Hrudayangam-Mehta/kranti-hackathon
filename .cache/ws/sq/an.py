import json,gzip,sys,glob,statistics as st
from collections import defaultdict
tag=sys.argv[1]
med=lambda a: round(st.median(a),1) if a else None
tier_cost=defaultdict(list); tier_ttk=defaultdict(list); tier_rng=defaultdict(list); tier_n=defaultdict(int)
gap_new=[]; gaps=[]; left=[]; lines_after=defaultdict(list); intake_k=defaultdict(list); time_k=defaultdict(list)
dead_after=defaultdict(lambda:[0,0]); lull=[]; killsbyorder=defaultdict(lambda: defaultdict(int))
hunters_at=defaultdict(list); killer=defaultdict(int); burst=[0,0,0,0]
for fn in glob.glob(f'{sys.argv[2]}/{tag}_m*.json.gz'):
    d=json.load(gzip.open(fn,'rt')); me=d['slot']; tiers=d['tiers']
    dm=d['dmg']; deaths=d['deaths']
    myd=[x['t'] for x in deaths if x['id']==me]; tdie=myd[0] if myd else d['rec']['matchT']
    kills=[x for x in deaths if x['id']!=me and x['t']<=tdie]
    kt=[0]+[x['t'] for x in kills]
    tome=[x for x in dm if x[2]==me and x[1]!=me and isinstance(x[1],int) and x[1]<16]
    byme=[x for x in dm if x[1]==me and x[2]!=me]
    first_from={}
    for x in tome: first_from.setdefault(x[1],x[0])
    for i,x in enumerate(kills):
        v=x['id']; tr=tiers[v].split(':')[-1]; tier_n[tr]+=1; killsbyorder[i+1][tr]+=1
        took=sum(y[3] for y in tome if y[1]==v); tier_cost[tr].append(took)
        hits=[y[0] for y in byme if y[2]==v]
        if hits: tier_ttk[tr].append(x['t']-hits[0])
        rr=[y[5] for y in tome if y[1]==v]
        if rr: tier_rng[tr].append(st.median(rr))
        # next new attacker after this kill
        nxt=[t for a,t in first_from.items() if t>x['t']]
        if nxt: gap_new.append(min(nxt)-x['t'])
        # lull: time after kill until next damage taken
        nd=[y[0] for y in tome if y[0]>x['t']]
        lull.append((nd[0] if nd else tdie)-x['t'])
        tn=kills[i+1]['t'] if i+1<len(kills) else None
        if tn: gaps.append(tn-x['t'])
        dead_after[i+1][1]+=1
        if myd and (tn is None): dead_after[i+1][0]+=1
    # per k-state intake and duration
    for k in range(len(kt)):
        a=kt[k]; b=kt[k+1] if k+1<len(kt) else tdie
        intake_k[k].append(sum(y[3] for y in tome if a<y[0]<=b)); time_k[k].append(b-a)
        att=set(y[1] for y in tome if a<y[0]<=b); lines_after[k].append(len(att))
    # damage left in live mechs at death
    if myd:
        hp={}
        for y in byme:
            if y[0]<=tdie and isinstance(y[2],int) and y[2]<16: hp[y[2]]=y[7]
        deadids=set(x['id'] for x in kills)
        left.append(sum(1400-h for i,h in hp.items() if i not in deadids and h<1400))
        killer[tiers[d['rec']['killedBy']].split(':')[-1] if d['rec'].get('killedBy') is not None and d['rec']['killedBy']<16 else 'x']+=1
    for f in d['frames'][::20]:
        hunters_at[(int(f['ks']) if 'ks' in f else 0)].append(len(f.get('hu',[])))
print('==',tag)
print('tier: n kills | hp we lost to victim (median, mean) | ttk first hit->death median | victim median range when it hit us')
for tr in ['easy','medium','hard','expert']:
    c=tier_cost[tr]; print(f' {tr:7s} n={tier_n[tr]:3d} cost med {med(c)} mean {round(sum(c)/max(1,len(c)))}  ttk {med(tier_ttk[tr])}  rng {med(tier_rng[tr])}')
print('victim tier by kill order:',{k:dict(v) for k,v in sorted(killsbyorder.items())[:8]})
print('inter-kill gap med',med(gaps),'p25/p75',round(st.quantiles(gaps,n=4)[0],1),round(st.quantiles(gaps,n=4)[2],1))
print('kill -> first damage from a NEW attacker: med',med(gap_new),'quartiles',[round(q,1) for q in st.quantiles(gap_new,n=4)])
print('kill -> next damage taken (lull): med',med(lull),'share>=5s',round(sum(1 for l in lull if l>=5)/len(lull),2),'share>=10s',round(sum(1 for l in lull if l>=10)/len(lull),2))
print('k-state: n, median duration s, median intake hp, median distinct attackers, P(die in this state)')
for k in sorted(intake_k)[:9]:
    n=len(intake_k[k]); die=dead_after[k][0]/dead_after[k][1] if k>0 and dead_after[k][1] else None
    print(f'  k={k} n={n} dur {med(time_k[k])} intake {med(intake_k[k])} attackers {med(lines_after[k])} pdie {None if die is None else round(die,2)}')
print('damage banked in live mechs at death: med',med(left),'mean',round(sum(left)/max(1,len(left))))
print('killer tier',dict(killer))
