import sys,re,json
s=open(sys.argv[1],encoding='utf-8',errors='replace').read()
dec=json.JSONDecoder()
seen=set()
for m in re.finditer(r'"announcements":\[',s):
    o,_=dec.raw_decode(s,m.start()+len('"announcements":'))
    for a in o:
        k=(a.get('id'),a.get('created_at'))
        if k in seen: continue
        seen.add(k); print(a.get('id'),a.get('created_at'),'|',a.get('title'),'|',a.get('body'))
