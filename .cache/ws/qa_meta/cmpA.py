import json,glob,os,hashlib,sys
O='out/'
rows=[]
for f in sorted(glob.glob(O+'A_*_MX_meta.meta.json')):
    b=f.replace('_MX_meta.meta.json','_MX_base2.meta.json')
    if not os.path.exists(b): rows.append((f,'MISSING base')); continue
    a1=open(f.replace('.meta.json','.jsonl'),'rb').read(); b1=open(b.replace('.meta.json','.jsonl'),'rb').read()
    la=a1.split(b'\n'); lb=b1.split(b'\n'); d=sum(1 for x,y in zip(la,lb) if x!=y)+abs(len(la)-len(lb))
    m=json.load(open(f)); mb=json.load(open(b))
    rows.append((os.path.basename(f)[:-len('_MX_meta.meta.json')], m['salt'], m['n'], d, m['hasMeta'], m['errors'], mb['errors'], m['finalEnv'], hashlib.sha256(a1).hexdigest()[:12], m['maxMs'], m['offers']))
tot=0
for r in rows: print(*r); tot+= r[3] if len(r)>3 else 1
print('pairs',len(rows),'total differing decisions',tot)
