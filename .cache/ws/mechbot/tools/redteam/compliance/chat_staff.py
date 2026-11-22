import sys, re, json
s=open(sys.argv[1],encoding='utf-8',errors='replace').read()
chunks=re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)', s)
buf=''.join(json.loads(c) for c in chunks)
for m in re.finditer(r'\{"id":\d+,"body":"(?:[^"\\]|\\.)*","face":"[^"]*","staff":(true|false),"author":"[^"]*","created_at":"[^"]*"\}', buf):
    d=json.loads(m.group(0))
    if d['staff'] or re.search(sys.argv[2], d['body'], re.I): print(d['created_at'][:19], 'STAFF' if d['staff'] else 'user ', d['author'], '|', d['body'][:400])
m=re.search(r'"announcements?":\[.*?\]', buf)
print('ANN:', m.group(0)[:1500] if m else None)
for k in ('published_at','locked_at','cutoff_at','scorer_version','practice_limit','max_bytes'):
    mm=re.search(r'"key":"builders".*?"%s":("[^"]*"|[^,}]*)'%k, buf); print(k, mm.group(1) if mm else None)
