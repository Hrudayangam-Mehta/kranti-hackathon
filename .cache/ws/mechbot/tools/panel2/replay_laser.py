import gzip,json,math,collections,sys,statistics
f=gzip.open(sys.argv[1],'rt'); hdr=json.loads(f.readline()); bots=[b.split(':')[1] for b in hdr['bots']]
frames={}; evs=[]
for line in f:
    o=json.loads(line)
    if 'm' in o: frames[o['t']]={m[0]:m for m in o['m']}
    for e in o.get('ev',[]) or []: evs.append(e)
ch=collections.defaultdict(list)
for e in evs:
    if e['e']=='charge': ch[e['id']].append(e)
print('charge sample',json.dumps([e for e in evs if e['e']=='charge'][:2]))
for e in evs:
    if e['e']!='laser': continue
    t=e['t']; tf=t-(t%2); S=e['id']; fr=frames.get(tf); 
    if not fr or S not in fr: continue
    fx,fy,fz=e['from']; tx,ty,tz=e['to']; L=math.dist(e['from'],e['to']); ux,uy=(tx-fx),(ty-fy); hn=math.hypot(ux,uy); ux/=hn; uy/=hn
    best=None
    for j,m in fr.items():
        if j==S: continue
        px,py=m[1]-fx,m[2]-fy; al=px*ux+py*uy
        if al<0 or al>285: continue
        lat=-uy*px+ux*py
        if best is None or abs(lat)<abs(best[0]): best=(lat,j,al,m)
    # charge start for this shot: last charge event of S before t
    cs=[c['t'] for c in ch[S] if c['t']<=t]
    tc=cs[-1] if cs else None
    info=''
    if best:
        lat,j,al,m=best
        p=frames.get(tf-2,{}).get(j)
        vlat=(-uy*(m[1]-p[1])+ux*(m[2]-p[2]))/0.1 if p else float('nan')
        # where was target at charge start relative to beam?
        lat0=None
        if tc is not None:
            f0=frames.get(tc-(tc%2),{}).get(j)
            if f0: lat0=-uy*(f0[1]-fx)+ux*(f0[2]-fy)
        # aim yaw of shooter vs beam yaw
        info='nearest mech %2d lat=%6.1f m along=%5.0f vlat=%5.1f lat_at_charge_start=%s chargeticks=%s flags_tgt=%d'%(j,lat,al,vlat,('%.1f'%lat0) if lat0 is not None else '-',(t-tc) if tc is not None else '-',m[8])
    print('t=%5d S=%2d(%s) len=%5.0f hits=%s %s'%(t,S,bots[S],L,e.get('hits'),info))
