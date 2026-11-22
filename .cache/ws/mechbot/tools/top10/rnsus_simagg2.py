import json,sys,collections,statistics as st
D=sys.argv[1]; rows=[]; victims=collections.Counter(); ourdeaths_by_nexus=0; n_matches=0
for f in sys.argv[2:]:
    d=json.load(open(f"{D}/{f}.json"))
    for m in d['matches']:
        fld=m.get('field') or []; idn={x['id']:x['name'] for x in fld}
        nx=[x for x in fld if 'NEXUS' in x['name']]
        if not nx: continue
        n_matches+=1
        nid=nx[0]['id']
        for x in fld:
            if x.get('by')==nid: victims[x['name']]+=1
        rows.append((nx[0],m))
pl=[r[0]['place'] for r in rows]; t=sorted(r[0]['t'] for r in rows)
q=lambda a,p: a[int(p*(len(a)-1))]
print('n',len(rows),'place mean %.2f'%st.mean(pl),'death t quartiles',q(t,.25),q(t,.5),q(t,.75),'share dead by 30s %.2f by 60s %.2f'%(sum(x<30 for x in t)/len(t),sum(x<60 for x in t)/len(t)))
print('victims',victims.most_common(10))
by=collections.defaultdict(list)
for x,m in rows: by[tuple(x['loadout'])].append(x['place'])
print({k:(len(v),round(st.mean(v),1)) for k,v in by.items()})
cb=collections.defaultdict(list)
for x,m in rows: cb['cubes>=8' if x['cubes']>=8 else 'cubes<8'].append(x['place'])
print({k:(len(v),round(st.mean(v),1)) for k,v in cb.items()})
# our place in matches vs nexus
print('our mean place',round(st.mean(m['place'] for x,m in rows),2))
