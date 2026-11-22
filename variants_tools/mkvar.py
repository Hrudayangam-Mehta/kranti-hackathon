#!/usr/bin/env python3
"""mkvar.py SRC_BOT DEST_DIR SALT key=value ...  -> copies SRC_BOT to DEST_DIR/bot and sets SELECT entries and salt."""
import re, shutil, sys, os
src, dest, salt = sys.argv[1], sys.argv[2], int(sys.argv[3])
changes = dict(a.split('=', 1) for a in sys.argv[4:])
os.makedirs(dest, exist_ok=False)
shutil.copytree(src, os.path.join(dest, 'bot'))
os.makedirs(os.path.join(dest, 'dist'))
p = os.path.join(dest, 'bot', 'lib', 'params.js')
s = open(p).read()
a = s.index('export const SELECT = {')
b = s.index('}', s.index('r3a2:', a))
blk = s[a:b]
for k, v in changes.items():
    blk, n = re.subn(r"(\b%s: )'[^']*'" % re.escape(k), r"\g<1>'%s'" % v, blk, count=1)
    assert n == 1, ('no key', k)
s = s[:a] + blk + s[b:]
s2, n = re.subn(r"^  salt: 0,", "  salt: %d," % salt, s, count=1, flags=re.M)
assert n == 1, 'salt line'
open(p, 'w').write(s2)
print(dest, changes, 'salt', salt)
