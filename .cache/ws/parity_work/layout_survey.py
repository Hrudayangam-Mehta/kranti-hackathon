import os, re, sys, json, collections
root = sys.argv[1]
repos = sorted(d for d in os.listdir(root) if not d.startswith('_') and os.path.isdir(os.path.join(root, d)))
C = collections.Counter
top = C(); frm = C(); entry = C(); pin = C(); envs = C(); runs = C(); copies = C(); heads = C(); lic = C(); user = C(); multi = 0; nodock = []
dockers = {}
for r in repos:
    p = os.path.join(root, r)
    try: names = [n for n in os.listdir(p) if n != '.git']
    except Exception: continue
    for n in names: top[n if os.path.isfile(os.path.join(p, n)) else n + '/'] += 1
    df = os.path.join(p, 'Dockerfile')
    if not os.path.isfile(df):
        nodock.append(r); continue
    try: txt = open(df, errors='replace').read()
    except Exception: continue
    dockers[r] = txt
    froms = re.findall(r'(?im)^\s*FROM\s+(\S+)', txt)
    if len(froms) > 1: multi += 1
    for f in froms:
        frm[re.sub(r'@sha256:[0-9a-f]+', '@sha256', f)] += 1
    last = froms[-1] if froms else ''
    pin['digest' if '@sha256' in last else ('tag' if ':' in last and not last.endswith(':latest') else ('scratch' if last == 'scratch' else 'unpinned'))] += 1
    for m in re.findall(r'(?im)^\s*(ENTRYPOINT|CMD)\s+(.+)$', txt): entry[m[0] + ' ' + re.sub(r'\s+', ' ', m[1])[:70]] += 1
    for m in re.findall(r'(?im)^\s*ENV\s+(.+)$', txt):
        for kv in re.findall(r'([A-Za-z_][A-Za-z0-9_]*)[= ]', m)[:6]: envs[kv] += 1
    for m in re.findall(r'(?im)^\s*RUN\s+(.+)$', txt): runs[re.sub(r'\s+', ' ', m)[:60]] += 1
    for m in re.findall(r'(?im)^\s*COPY\s+(.+)$', txt): copies[re.sub(r'\s+', ' ', m)[:50]] += 1
    for m in re.findall(r'(?im)^\s*USER\s+(.+)$', txt): user[m.strip()] += 1
    rd = os.path.join(p, 'README.md')
    if os.path.isfile(rd):
        for h in re.findall(r'(?m)^#{1,3}\s+(.+)$', open(rd, errors='replace').read()):
            heads[re.sub(r'[^a-z ]', '', h.lower()).strip()[:40]] += 1
    lf = [n for n in names if n.upper().startswith('LICENSE') or n.upper().startswith('LICENCE')]
    if lf:
        t = open(os.path.join(p, lf[0]), errors='replace').read(300)
        lic['MIT' if 'MIT' in t else 'other'] += 1
    else: lic['none'] += 1
print('repos', len(repos), 'with top-level Dockerfile', len(dockers), 'multi-stage', multi)
print('no top-level Dockerfile:', len(nodock))
def show(name, c, n=40): print('\n##', name); [print(f'  {v:4d}  {k}') for k, v in c.most_common(n)]
show('top-level names', top, 70); show('FROM', frm, 45); show('final-stage pinning', pin); show('entry', entry, 45); show('ENV names', envs, 30)
show('RUN', runs, 40); show('COPY', copies, 30); show('USER', user); show('licence', lic); show('README headings', heads, 60)
json.dump(dockers, open(sys.argv[2], 'w'))
