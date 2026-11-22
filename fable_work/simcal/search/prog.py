import json,sys
st={};d=0;n=0
for l in open('runs/%s/log.jsonl'%sys.argv[1]):
    r=json.loads(l); e=r.get('ev')
    if e=='cand': st[r['id']]=r
    if e=='discard': d+=1
    if e=='batch': n+=1
print('batches',n,'discard',d,'cands',len(st))
top=sorted(st.values(), key=lambda r:(-r['stage'],-r['mean']))[:int(sys.argv[2]) if len(sys.argv)>2 else 8]
for r in top: print(r['id'],r['stage'],r['status'],r['n'],round(r['mean'],3),round(r.get('se',0),3))
