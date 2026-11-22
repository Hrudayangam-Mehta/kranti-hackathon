import json, sys
txt = open(sys.argv[1], encoding='utf-8').read()
i = txt.index('"initial":{') + len('"initial":')
obj, _ = json.JSONDecoder().raw_decode(txt[i:])
print('now', obj.get('now'))
for t in obj['tracks']:
    if t['key'] != 'shopping-sessions':
        continue
    meta = {k: v for k, v in t.items() if k != 'standings'}
    print(json.dumps(meta, indent=1))
    st = t['standings']
    print('standings rows:', len(st))
    for r in st[:int(sys.argv[2]) if len(sys.argv) > 2 else 15]:
        print(f"{r['rank']:>3} | {r['team']:<32} | {r['score']} | {r['at']}")
    json.dump(t, open(sys.argv[1] + '.shopping.json', 'w'), indent=1)
