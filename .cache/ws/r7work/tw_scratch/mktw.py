#!/usr/bin/env python3
"""mktw.py PARAMS_JS NAME 'JSON' [--select]  -> add the tw value NAME = { sqOverrides: JSON } to a checkpoint-08 params.js
(the one line `  tw: { off: {} ...},`) and, with --select, set SELECT tw: 'NAME'. Then resolves the params with bun so a
refused key (SQ_REFUSED, not a PARAMS key, wrong type) fails here instead of in the gate. Example:
  mktw.py variants6/X/bot/lib/params.js k40 '{"keepTargetHpf": 0.4}' --select"""
import json, re, subprocess, sys
p, name, js = sys.argv[1], sys.argv[2], sys.argv[3]
sel = '--select' in sys.argv[4:]
assert re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', name), 'value name: letters and digits'
ov = json.loads(js)
assert isinstance(ov, dict) and ov, 'sqOverrides must be a non-empty JSON object'
s = open(p).read()
m = re.search(r"^  tw: \{ off: \{\}(.*?) \},$", s, flags=re.M)
assert m, 'no tw preset line (not a checkpoint-08 tree?)'
assert ("%s:" % name) not in m.group(1), 'tw value %s exists' % name
lit = '{ ' + ', '.join('%s: %s' % (k, json.dumps(v)) for k, v in ov.items()) + ' }'
line = m.group(0)[:-3] + ', %s: { sqOverrides: %s } },' % (name, lit)
s = s[:m.start()] + line + s[m.end():]
if sel:
    a = s.index('export const SELECT = {'); b = s.index('}', s.index('healDoc:', a))
    blk, n = re.subn(r"(\btw: )'[^']*'", r"\g<1>'%s'" % name, s[a:b], count=1)
    assert n == 1, 'no tw key in SELECT'
    s = s[:a] + blk + s[b:]
open(p, 'w').write(s)
bun = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun'
code = "const m = await import(process.argv[1]); const P = m.resolveParams({}); console.log('tw', P.selected.tw, 'sqOverrides', JSON.stringify(P.sqOverrides || null))"
import os
r = subprocess.run([bun, '-e', code, os.path.abspath(p)], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(p)))
print(line.strip())
print((r.stdout + r.stderr).strip())
sys.exit(r.returncode)
