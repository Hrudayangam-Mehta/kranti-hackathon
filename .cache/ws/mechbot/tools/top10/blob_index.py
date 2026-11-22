#!/usr/bin/env python3
"""Index blob hashes (tree metadata only, no file contents) of every commit in the metadata repos and
report files that are byte-identical across repositories of different owners.
usage: blob_index.py <meta_dir> <out.tsv> [min_size=2000]
A blob shared by many owners is starter-kit material; one shared by 2-4 owners is a copy link."""
import os, subprocess, sys, collections, datetime
meta, out = sys.argv[1], sys.argv[2]
minsize = int(sys.argv[3]) if len(sys.argv) > 3 else 2000
ENV = dict(os.environ, GIT_TERMINAL_PROMPT='0', TZ='UTC')
def git(d, *a):
    return subprocess.run(['git', '--git-dir', d, *a], capture_output=True, env=ENV, timeout=120).stdout.decode('utf-8', 'replace')
first = {}                          # (repo, blob) -> (ctime, commit, path)
for d in sorted(os.listdir(meta)):
    if not d.endswith('.git'): continue
    gd = os.path.join(meta, d); repo = d[:-4].replace('__', '/', 1)
    log = git(gd, 'log', '--all', '--root', '--raw', '--no-abbrev', '--no-renames', '-m', '--format=C %H %ct')
    cur = None
    for line in log.splitlines():
        if line.startswith('C '):
            _, h, ct = line.split(); cur = (int(ct), h[:10])
        elif line.startswith(':') and cur:
            meta_part, _, path = line.partition('\t')
            f = meta_part.split()
            new = f[3]
            if set(new) == {'0'}: continue
            k = (repo, new)
            if k not in first or cur[0] < first[k][0]: first[k] = (cur[0], cur[1], path)
by_blob = collections.defaultdict(list)
for (repo, blob), v in first.items(): by_blob[blob].append((v[0], repo, v[1], v[2]))
# sizes: ask each repo once for the blobs we care about (cat-file -s works only for present objects,
# so sizes come from ls-tree -l of the commit that introduced them; cheap enough for shared blobs only)
size_cache = {}
def size_of(repo, commit, path):
    gd = os.path.join(meta, repo.replace('/', '__', 1) + '.git')
    o = git(gd, 'ls-tree', '-l', commit, '--', path).split()
    try: return int(o[3])
    except Exception: return -1
hm = lambda t: datetime.datetime.utcfromtimestamp(t).strftime('%d %H:%M:%S')
rows = []
for blob, lst in by_blob.items():
    owners = sorted(set(r.split('/')[0] for _, r, _, _ in lst))
    if len(owners) < 2: continue
    lst.sort()
    t, repo, commit, path = lst[0]
    sz = size_of(repo, commit, path)
    rows.append((len(owners), blob, sz, lst))
with open(out, 'w', encoding='utf-8') as f:
    for n, blob, sz, lst in sorted(rows, key=lambda r: (r[0], -r[2])):
        for t, repo, commit, path in lst:
            f.write('\t'.join([blob[:12], str(n), str(sz), hm(t), repo, commit, path]) + '\n')
print('shared blobs:', len(rows))
print('owners-per-blob histogram:', sorted(collections.Counter(r[0] for r in rows).items()))
for n, blob, sz, lst in sorted(rows, key=lambda r: (r[0], -r[2])):
    if n <= 4 and sz >= minsize:
        print('\nblob %s size %d shared by %d owners' % (blob[:12], sz, n))
        for t, repo, commit, path in lst: print('   %s  %-46s %s  %s' % (hm(t), repo, commit, path[:60]))
