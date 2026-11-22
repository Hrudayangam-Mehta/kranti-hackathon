import json, glob, os, sys, hashlib
Q = sys.argv[1]
def h(p): return hashlib.sha256(open(p,'rb').read()).hexdigest()
def meta(p): return json.load(open(p))
# A: tree identity
ck = sorted(glob.glob(Q+'/rec/tree/ck/*.jsonl')); same = diff = 0; fuse = err = 0; miss = []; bad = []
for p in ck:
    n = os.path.basename(p); q = Q+'/rec/tree/ft/'+n
    if not os.path.exists(q): miss.append(n); continue
    for x in (p, q):
        m = meta(x[:-6]+'.meta.json'); fuse += m['fuse']; err += m['errors']
    if h(p) == h(q): same += 1
    else: diff += 1; bad.append(n)
kit = [os.path.basename(p) for p in ck if '_kit_' in p]
print(f"TREE identity F/bot vs ckpt_07_LG: {same}/{same+diff} identical, missing {miss}, differing {bad}, fuse {fuse}, errors {err}; kit recordings in set: {len(kit)}")
# B: builds vs OPUSBASE
base = Q+'/rec/b/OPUSBASE'
for n in 'FOHLC_s1 FNR_s1 FHE40_s1 FA60_s1 FC075_s1 FB_s11 FB_s1'.split():
    d = Q+'/rec/b/'+n; out = {}; fuse = err = stuck = 0; kills = []; bk = []; dsq = []; zone = 0; nrec = 0
    for p in sorted(glob.glob(base+'/*.jsonl')):
        name = os.path.basename(p)[:-6]; q = d+'/'+name+'.jsonl'
        if not os.path.exists(q): out.setdefault('missing', []).append(name); continue
        nrec += 1
        m = meta(d+'/'+name+'.meta.json'); mb = meta(base+'/'+name+'.meta.json'); fuse += m['fuse'] + mb['fuse']; err += m['errors'] + mb['errors']; stuck += m.get('stuck', 0)
        grp = 'sq' if name.startswith('sq') else 'ff' if name.startswith('ff') else name
        eq = h(p) == h(q)
        if grp == 'sq':
            kills.append(m['kills']); bk.append(mb['kills'])
            if 'zone' in str(m.get('cause','')).lower(): zone += 1
            if not eq: dsq.append((int(name[2:]), mb['kills'], m['kills']))
        else:
            if not eq: out.setdefault('differs', []).append(name)
    up = sum(1 for s,a,b in dsq if b>a); dn = sum(1 for s,a,b in dsq if b<a)
    print(f"{n}: recs {nrec}; non-squad-sim differing: {out.get('differs', [])} missing {out.get('missing', [])}; sim squad 1-24 differ {len(dsq)} seeds {[s for s,_,_ in sorted(dsq)]} up/down {up}/{dn} net {sum(kills)-sum(bk):+d} changed {[(s,a,b) for s,a,b in sorted(dsq) if a!=b]} mean {sum(kills)/max(1,len(kills)):.2f} vs {sum(bk)/max(1,len(bk)):.2f}; fuse {fuse} errors {err} stuck {stuck} zone deaths {zone}")
