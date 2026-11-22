#!/usr/bin/env python3
"""Dump commit metadata (never file contents) from bare metadata repos into one TSV.
usage: extract_commits.py <meta_dir> <out.tsv>
columns: repo, sha, committer_epoch, author_epoch, author_name, committer_name, branches, subject"""
import os, subprocess, sys
meta, out = sys.argv[1], sys.argv[2]
ENV = dict(os.environ, GIT_CONFIG_NOSYSTEM='1', GIT_TERMINAL_PROMPT='0')
def git(d, *a):
    return subprocess.run(['git', '--git-dir', d, '-c', 'core.hooksPath=/dev/null', '-c', 'log.showSignature=false', *a],
                          capture_output=True, env=ENV, timeout=60).stdout.decode('utf-8', 'replace')
n = 0
with open(out, 'w', encoding='utf-8') as f:
    for d in sorted(os.listdir(meta)):
        if not d.endswith('.git'): continue
        gd = os.path.join(meta, d)
        repo = d[:-4].replace('__', '/', 1)
        heads = [l.split('\t') for l in git(gd, 'for-each-ref', '--format=%(refname:short)\t%(objectname)', 'refs/heads').splitlines() if l]
        if not heads: continue
        where = {}
        for br, tip in heads:
            for sha in git(gd, 'rev-list', tip).split():
                where.setdefault(sha, []).append(br)
        log = git(gd, 'log', '--all', '--format=%H%x1f%ct%x1f%at%x1f%an%x1f%cn%x1f%s%x1e')
        for rec in log.split('\x1e'):
            rec = rec.strip('\n')
            if not rec: continue
            p = rec.split('\x1f')
            if len(p) < 6: continue
            sha, ct, at, an, cn, subj = p[:6]
            clean = lambda s: s.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ')
            f.write('\t'.join([repo, sha[:10], ct, at, clean(an), clean(cn), ','.join(where.get(sha, []))[:80], clean(subj)[:200]]) + '\n')
            n += 1
print(n, 'commits')
