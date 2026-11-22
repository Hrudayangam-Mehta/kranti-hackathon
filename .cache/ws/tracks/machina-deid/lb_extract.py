import re, sys, json
s = open(sys.argv[1], encoding='utf-8').read()
# Next.js flight data: self.__next_f.push([1,"..."]) chunks. Concatenate and unescape.
chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>', s, flags=re.S)
data = ''.join(json.loads('"' + c + '"') for c in chunks)
open(sys.argv[2], 'w', encoding='utf-8').write(data)
# find objects containing "standings"
for m in re.finditer(r'"key":"([a-z-]+)"', data):
    pass
idx = [m.start() for m in re.finditer(r'"standings":', data)]
print('standings occurrences', len(idx))
for i in idx:
    # walk back to find the enclosing object start
    depth = 0; j = i
    while j > 0:
        j -= 1
        ch = data[j]
        if ch == '}': depth += 1
        elif ch == '{':
            if depth == 0: break
            depth -= 1
    # parse object from j
    dec = json.JSONDecoder()
    try:
        obj, end = dec.raw_decode(data[j:])
    except Exception as e:
        print('parse fail', e); continue
    keys = {k: v for k, v in obj.items() if k != 'standings'}
    print(json.dumps(keys)[:600])
    print(' n standings', len(obj['standings']))
