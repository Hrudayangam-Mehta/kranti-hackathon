import sys, re, json
s=open(sys.argv[1],encoding='utf-8',errors='replace').read()
chunks=re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)', s)
buf=''.join(json.loads(c) for c in chunks)
pat=sys.argv[2]
for m in re.finditer(pat, buf):
    a=max(0,m.start()-int(sys.argv[3]) if len(sys.argv)>3 else m.start()-200); b=min(len(buf), m.end()+(int(sys.argv[4]) if len(sys.argv)>4 else 400))
    print('>>>', buf[a:b].replace('\n',' '))
    print()
