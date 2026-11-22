# usage: python3 rep.py FILE < pairs  ; pairs separated by lines '@@@@' (old) '====' (new) '%%%%' end of pair
import sys
f = sys.argv[1]
s = open(f).read()
data = sys.stdin.read()
pairs = [p for p in data.split('%%%%\n') if p.strip()]
for i, p in enumerate(pairs):
    assert p.startswith('@@@@\n'), ('bad pair', i, p[:80])
    old, new = p[5:].split('====\n', 1)
    n = s.count(old)
    if n != 1:
        print('FAIL pair', i, 'count', n, repr(old[:120])); sys.exit(1)
    s = s.replace(old, new)
open(f, 'w').write(s)
print('ok', f, len(pairs), 'edits')
