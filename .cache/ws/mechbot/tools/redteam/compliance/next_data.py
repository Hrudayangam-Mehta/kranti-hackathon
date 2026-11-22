import sys, re, json
s=open(sys.argv[1],encoding='utf-8',errors='replace').read()
chunks=re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)', s)
buf=''.join(json.loads(c) for c in chunks)
# print all string literals > N chars that look like prose
N=int(sys.argv[2]) if len(sys.argv)>2 else 40
seen=set()
for m in re.finditer(r'"((?:[^"\\]|\\.){%d,})"'%N, buf):
    try: t=json.loads('"'+m.group(1)+'"')
    except Exception: t=m.group(1)
    if t in seen: continue
    seen.add(t)
    if re.search(r'^(/_next|static/|\$|M\d|[a-z0-9\-: \[\]/\.\(\)_%,!&>#=]+$)', t) and ' ' not in t.strip()[:25]: continue
    if re.match(r'^[\w\-\[\]:/\.\(\)%,!&>#= ]+$', t) and re.search(r'\b(flex|text-|border|px-|py-|rounded|grid|gap-|items-|font-|mt-|mb-|w-|h-)', t): continue
    print('*', t)
