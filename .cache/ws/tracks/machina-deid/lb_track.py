import re, sys, json
data = open(sys.argv[1], encoding='utf-8').read()
key = sys.argv[2]
dec = json.JSONDecoder()
for m in re.finditer(r'"standings":', data):
    i = m.start(); depth = 0; j = i
    while j > 0:
        j -= 1
        ch = data[j]
        if ch == '}': depth += 1
        elif ch == '{':
            if depth == 0: break
            depth -= 1
    obj, _ = dec.raw_decode(data[j:])
    if obj.get('key') == key:
        json.dump(obj, open(sys.argv[3], 'w'), indent=1)
        print(json.dumps({k: v for k, v in obj.items() if k != 'standings'}, indent=1))
        st = obj['standings']
        print(json.dumps(st[0]))
        for r in st:
            print(r.get('rank'), '|', r.get('team'), '|', r.get('score'), '|', r.get('at'), '|', {k:v for k,v in r.items() if k not in ('rank','team','score','at')})
