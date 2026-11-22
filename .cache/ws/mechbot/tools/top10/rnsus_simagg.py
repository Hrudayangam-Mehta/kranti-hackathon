import json,sys,collections,statistics as st
D=sys.argv[1]
for f in sys.argv[2:]:
    try: d=json.load(open(f"{D}/{f}.json"))
    except Exception as e: print(f,e); continue
    rows=[]; allnames=collections.defaultdict(list)
    for m in d['matches']:
        fld=m.get('field') or []
        idn={x['id']:x['name'] for x in fld}
        for x in fld:
            allnames[x['name']].append(x['place'])
            if 'NEXUS' in x['name'].upper():
                rows.append((x, idn.get(x.get('by')), m))
    if not rows: print(f,'no nexus'); continue
    pl=[r[0]['place'] for r in rows]; t=[r[0]['t'] for r in rows]; k=[r[0]['kills'] for r in rows]; c=[r[0]['cubes'] for r in rows]
    print(f"== {f} n={len(rows)} mode={d.get('mode')} ov={d.get('overrides')} place mean {st.mean(pl):.2f} median {st.median(pl)} top3 {sum(p<=3 for p in pl)} wins {sum(p==1 for p in pl)}; t mean {st.mean(t):.1f} median {st.median(t):.1f}; kills {st.mean(k):.2f}; cubes {st.mean(c):.1f}; dealt {st.mean(r[0]['dealt'] for r in rows):.0f} taken {st.mean(r[0]['taken'] for r in rows):.0f}")
    print('  causes',collections.Counter(r[0]['cause'] for r in rows).most_common(5),' killers',collections.Counter(r[1] for r in rows).most_common(6))
    print('  loadouts',collections.Counter(tuple(r[0]['loadout']) for r in rows).most_common(5))
    # our bot kill attribution: who killed us
    ks=collections.Counter(m['killer'] for m in d['matches']); print('  our killers',ks.most_common(6))
    # league table mean place by name
    tab=sorted((st.mean(v),n,len(v)) for n,v in allnames.items()); print('  league',[(n,round(a,1)) for a,n,l in tab])
