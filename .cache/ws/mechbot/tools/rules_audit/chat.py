import sys, re, json
seen={}
for fn in sys.argv[1:]:
    s=open(fn,encoding='utf-8',errors='replace').read()
    # unescape one level of JS-string escaping
    u=s.replace('\\"','"').replace('\\\\','\\')
    for m in re.finditer(r'\{"id":(\d+),"body":"((?:[^"\\]|\\.)*)","face":"[^"]*","staff":(true|false),"author":"([^"]*)","created_at":"([^"]*)"\}', u):
        i=int(m.group(1)); seen[i]=(m.group(5),m.group(4),m.group(3),m.group(2))
print(len(seen),'chat messages; ids',min(seen) if seen else None, max(seen) if seen else None)
for i in sorted(seen):
    t,a,st,b=seen[i]
    print(i,t[:19],('STAFF ' if st=='true' else '')+a+':',b)
