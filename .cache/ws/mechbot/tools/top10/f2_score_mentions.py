#!/usr/bin/env python3
"""Finder 2: list commit-message lines that state a practice-style score, with repo and UTC commit time.
Reads the text dump made from commit metadata only. usage: f2_score_mentions.py <bodies.txt> [score ...]"""
import re, sys, datetime
path = sys.argv[1]; want = set(sys.argv[2:])
hdr = None
num = re.compile(r'(?<![0-9.])([1-6]\.[0-9]{2})(?![0-9])')
for line in open(path, encoding='utf-8', errors='replace'):
    line = line.rstrip('\n')
    if line.startswith('@@ '):
        p = line.split(' ')
        repo, h, when = p[1], p[2], p[-1]
        try:
            t = datetime.datetime.fromisoformat(when).astimezone(datetime.timezone.utc).strftime('%d %H:%M:%S')
        except ValueError:
            t = when
        hdr = (repo.replace('.git', '').replace('__', '/'), h, t)
        continue
    if not hdr: continue
    found = num.findall(line)
    if not found: continue
    if want and not (want & set(found)): continue
    print('%s\t%s\t%s\t%s' % (hdr[0], hdr[1], hdr[2], line.strip()[:200]))
