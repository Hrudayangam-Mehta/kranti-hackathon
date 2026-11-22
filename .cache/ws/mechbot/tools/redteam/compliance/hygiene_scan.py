import sys, re, json, os
dist=sys.argv[1]; pages=sys.argv[2:]
teams=set(); scores=set()
for pg in pages:
    s=open(pg,encoding='utf-8',errors='replace').read()
    chunks=re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)', s)
    buf=''.join(json.loads(c) for c in chunks)
    m=re.search(r'"key":"builders".*?"standings":(\[.*?\])', buf)
    if m:
        for r in json.loads(m.group(1)): teams.add(r['team']); scores.add(str(r['score']))
print('teams from saved boards:', len(teams), 'scores:', len(scores))
bad=0
for fn in sorted(os.listdir(dist)):
    txt=open(os.path.join(dist,fn),encoding='utf-8',errors='replace').read(); low=txt.lower()
    for t in sorted(teams):
        if len(t)<4: 
            hit=re.search(r'(?<![A-Za-z0-9_$])'+re.escape(t)+r'(?![A-Za-z0-9_$])', txt) if len(t)>=3 else None
        else: hit=re.search(re.escape(t.lower()), low)
        if hit:
            bad+=1; a=max(0,hit.start()-30); print('TEAM-NAME HIT', fn, repr(t), repr(txt[a:hit.end()+30]))
    for sc in sorted(scores):
        for hit in re.finditer(r'(?<![\d.])'+re.escape(sc)+r'(?![\d])', txt):
            a=max(0,hit.start()-30); print('score-like literal', fn, sc, repr(txt[a:hit.end()+20]))
print('team-name hits:', bad)
