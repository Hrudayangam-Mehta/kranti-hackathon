import sys,re,json
s=open(sys.argv[1],encoding='utf-8',errors='replace').read()
dec=json.JSONDecoder()
found=[]
# find all JSON objects/arrays starting at '{"key":' or '"messages":['
for m in re.finditer(r'\{"key":"builders"',s):
    try:
        o,end=dec.raw_decode(s,m.start()); found.append(('track',o))
    except Exception as e: pass
for m in re.finditer(r'"messages":\[',s):
    try:
        o,end=dec.raw_decode(s,m.start()+len('"messages":')); found.append(('messages',o))
    except Exception as e: pass
mode=sys.argv[2]
for k,o in found:
    if k=='track' and mode=='track':
        o2={kk:vv for kk,vv in o.items() if kk not in ('board',)}
        print(json.dumps(o2,indent=1)[:6000]); 
        print('board keys', [kk for kk in o.keys()])
        break
    if k=='messages' and mode=='messages':
        for mm in o: print(mm.get('created_at'), 'STAFF' if mm.get('staff') else '     ', mm.get('author'), '|', mm.get('body').replace('\n',' / '))
        break
