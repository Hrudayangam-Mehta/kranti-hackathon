import sys, re, json
seen={}
for path in sys.argv[1:]:
    s=open(path,encoding='utf-8',errors='replace').read()
    for m in re.finditer(r'\{"id":(\d+),"body":"((?:[^"\\]|\\.)*)","face":"[^"]*","staff":(true|false),"author":"([^"]*)","created_at":"([^"]*)"', s):
        i=int(m.group(1))
        if i in seen: continue
        try: body=json.loads('"'+m.group(2)+'"')
        except Exception: body=m.group(2)
        seen[i]=(m.group(5),m.group(3),m.group(4),body)
for i in sorted(seen):
    t,st,a,b=seen[i]
    print(f"{i}\t{t[:19]}\t{'STAFF' if st=='true' else ''}\t{a}\t{b}")
