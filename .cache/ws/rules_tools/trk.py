import sys,re,json
for fn in sys.argv[1:]:
    s=open(fn,encoding='utf-8',errors='replace').read()
    # try flight decode
    parts=re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>',s,flags=re.S)
    t=''
    for p in parts:
        try: t+=json.loads('"'+p+'"')
        except Exception: t+=p
    if not t: t=s
    dec=json.JSONDecoder(); o=None
    for m in re.finditer(r'\{"key":"builders"',t):
        try: o,_=dec.raw_decode(t,m.start()); break
        except Exception: pass
    if o is None:
        print(fn.split('/')[-1],'no builders obj'); continue
    st=o.get('standings') or []
    def sc(r):
        for x in st:
            if x['rank']==r: return x['score'],x['team']
    print(fn.split('/')[-1], 'ver',o.get('scorer_version'),'limit',o.get('practice_limit'),'teams',o.get('team_count'),'workers',o.get('active_workers'),'#1',sc(1),'#16',sc(16),'#32',sc(32),'#50',sc(50),'locked',o.get('locked_at'),'sealed',o.get('sealed'),'paused',o.get('paused'),'final',o.get('final'))
