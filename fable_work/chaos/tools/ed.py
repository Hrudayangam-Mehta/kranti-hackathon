#!/usr/bin/env python3
"""ed.py FILE: apply (old,new,count) replacements read from a python list literal on stdin; each old must occur exactly count times."""
import sys, ast
f = sys.argv[1]; s = open(f).read()
for old, new, *c in ast.literal_eval(sys.stdin.read()):
    n = c[0] if c else 1
    k = s.count(old)
    assert k == n, (f, k, n, old[:80])
    s = s.replace(old, new)
open(f, 'w').write(s); print('ok', f)
