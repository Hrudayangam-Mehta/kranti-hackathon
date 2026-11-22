#!/usr/bin/env python3
"""mksel7.py SRC_BOT DEST_DIR key=value ...  -> copy SRC_BOT to DEST_DIR/bot with SELECT entries changed (timing bundles only)."""
import re, shutil, sys, os
src, dest = sys.argv[1], sys.argv[2]
changes = dict(a.split('=', 1) for a in sys.argv[3:])
os.makedirs(dest, exist_ok=False)
shutil.copytree(src, os.path.join(dest, 'bot'))
p = os.path.join(dest, 'bot', 'lib', 'params.js')
s = open(p).read()
a = s.index('export const SELECT = {')
b = s.index('}', s.index('healDoc:', a))
blk = s[a:b]
for k, v in changes.items():
    blk, n = re.subn(r"(\b%s: )'[^']*'" % re.escape(k), r"\g<1>'%s'" % v, blk, count=1)
    assert n == 1, ('no key', k)
open(p, 'w').write(s[:a] + blk + s[b:])
print(dest, changes)
