import re, json, sys
path, key, outp = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(path, encoding='utf-8').read()
# collect next_f push payloads (JS string literals) and decode them
chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>', s, flags=re.S)
txt = ''.join(json.loads('"' + c + '"') for c in chunks)
# find objects containing "standings" by scanning balanced braces around each occurrence
res = []
for m in re.finditer(r'"standings":\[', txt):
    # walk back to the enclosing '{'
    depth = 0; i = m.start()
    while i > 0:
        i -= 1
        ch = txt[i]
        if ch == '}': depth += 1
        elif ch == '{':
            if depth == 0: break
            depth -= 1
    # walk forward to matching '}'
    j = i; depth = 0; instr = False; esc = False
    while j < len(txt):
        ch = txt[j]
        if instr:
            if esc: esc = False
            elif ch == '\\': esc = True
            elif ch == '"': instr = False
        else:
            if ch == '"': instr = True
            elif ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0: break
        j += 1
    try:
        obj = json.loads(txt[i:j+1])
        res.append(obj)
    except Exception as e:
        print('parse fail', e, file=sys.stderr)
out = [o for o in res if key in json.dumps(o)[:4000] or o.get('key') == key or o.get('slug') == key]
print('objects with standings:', len(res), [ {k: v for k, v in o.items() if k != 'standings' and not isinstance(v,(list,dict))} for o in res ], file=sys.stderr)
json.dump(res, open(outp, 'w'), indent=1)
