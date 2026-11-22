import json, re, sys
txt = open(sys.argv[1], encoding='utf-8').read()
dec = json.JSONDecoder()
seen = {}
for m in re.finditer(r'\{"id":\d+,"body":', txt):
    try:
        obj, _ = dec.raw_decode(txt[m.start():])
    except Exception:
        continue
    if 'body' in obj and 'created_at' in obj:
        seen[obj['id']] = obj
mode = sys.argv[2] if len(sys.argv) > 2 else 'all'
rows = sorted(seen.values(), key=lambda o: o['id'])
print('messages', len(rows), rows[0]['created_at'] if rows else '', rows[-1]['created_at'] if rows else '')
for o in rows:
    if mode == 'staff' and not o.get('staff'):
        continue
    print(f"[{o['id']}] {o['created_at'][:19]} {'STAFF ' if o.get('staff') else ''}{o.get('author')}: {o['body']!r}")
