import gzip, json, math, sys, collections
R=sys.argv[1]
fr=[];hdr=None;res=None
for l in gzip.open(R,'rt'):
    o=json.loads(l)
    if o.get('type')=='header': hdr=o
    elif o.get('type')=='result': res=o
    else: fr.append(o)
C=(-276.31,128.71)
pos={}  # tick-> id -> (x,y,z,hp,flags)
hits=[]
for f in fr:
    pos[f['t']]={m[0]:m for m in f['m']}
    for e in f.get('ev',[]):
        if e.get('e')=='hit': hits.append(e)
ts=sorted(pos)
def at(t,i):
    k=min(ts,key=lambda q:abs(q-t)); return pos[k].get(i)
# bot 2 distance from stadium centre over time
print('bot2 timeline (t s, dist to stadium centre, z, hp)')
for t in ts[::200]:
    m=pos[t].get(2)
    if m: print(round(t/20,1), round(math.hypot(m[1]-C[0],m[2]-C[1]),1), m[3], m[6], 'zone',fr[ts.index(t)]['z'])
# hits on / by bot 2
agg=collections.defaultdict(lambda:[0,0,[],[]])
for e in hits:
    if e['dst']==2 and (e.get('src') is not None and e['src']<100):
        s=at(e['t'],e['src']); d=at(e['t'],2)
        a=agg[('on2',e['src'],e['w'])]; a[0]+=1;a[1]+=e['amt'];a[2].append(e['t']/20)
        if s and d: a[3].append((round(math.hypot(s[1]-C[0],s[2]-C[1])),round(s[3],1),round(math.hypot(d[1]-C[0],d[2]-C[1])),round(math.hypot(s[1]-d[1],s[2]-d[2]))))
    if e.get('src')==2 and e['dst']<100:
        s=at(e['t'],2); d=at(e['t'],e['dst'])
        a=agg[('by2',e['dst'],e['w'])]; a[0]+=1;a[1]+=e['amt'];a[2].append(e['t']/20)
        if s and d: a[3].append((round(math.hypot(d[1]-C[0],d[2]-C[1])),round(d[3],1),round(math.hypot(s[1]-C[0],s[2]-C[1])),round(math.hypot(s[1]-d[1],s[2]-d[2]))))
for k,a in agg.items(): print(k,'n',a[0],'dmg',a[1],'t',round(min(a[2]),1),'-',round(max(a[2]),1),'samples(other dist to centre, other z, bot2 dist centre, range)',a[3][:3],a[3][-2:])
# how many other mechs ever came within 75 m of stadium centre (inside the bowl)
ins=collections.Counter()
for t in ts:
    for i,m in pos[t].items():
        if i!=2 and m[6]>0 and math.hypot(m[1]-C[0],m[2]-C[1])<70: ins[i]+=1
print('other mechs inside 70 m of stadium centre (frames):',dict(ins))
for m in res['mechs']: print(m['id'],m['name'],'place',m['place'],'kills',m['kills'],'death',m['death_t'],m['killed_with'],'by',m['killed_by'],'dealt',m['damage_dealt'],'taken',m['damage_taken'])
