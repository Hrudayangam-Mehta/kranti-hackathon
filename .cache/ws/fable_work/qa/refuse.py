import json,sys
Q=sys.argv[1]; out=[]
for l in open(Q+'/jobsD.txt'):
    name=l.split('|')[0]
    try: m=json.load(open(Q+'/rec/'+name+'.meta.json'))
    except Exception: out.append(l); continue
    if m['fuse']: out.append(l)
open(Q+'/jobsE.txt','w').write(''.join(out)); print(len(out))
