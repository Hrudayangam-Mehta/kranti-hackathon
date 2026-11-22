import json,sys
for f in sys.argv[1:]:
    d=json.load(open(f)); print(f, d['summary']['meanKills'], d['summary']['meanTimeAlive'])
    for m in d['matches']:
        s=m.get('sanc') or {}
        print(' ',m['seed'],'k',m['kills'],'t',m['timeAlive'],'dealt',m['dmgDealt'],'taken',m['dmgTaken'],m['cause'],'nLos',m.get('nLosEnd'),m.get('modeEnd'),'fuse',m.get('fuse'),'maxMs',m['maxMs'],'lates',m['lates'],'err',m.get('errStages'),'st',m.get('stuck'),m.get('abandons'), {k:(round(v,1) if isinstance(v,float) else v) for k,v in s.items()})
