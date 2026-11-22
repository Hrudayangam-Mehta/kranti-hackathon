#!/usr/bin/env python3
"""patch_lc.py PARAMS_JS key=value ... : add the R7 climb preset values (loseCover family, oneHit, fightOn, healDoc low)
to a checkpoint-07 params.js and set the given SELECT keys. Old values are untouched (byte-identical play at defaults)."""
import sys, re
p = sys.argv[1]; sets = dict(a.split('=', 1) for a in sys.argv[2:])
s = open(p).read()
old = "  loseCover: { off: { loseCoverNear: false }, near: { loseCoverNear: true } },"
assert s.count(old) == 1, 'loseCover line'
new = ("  loseCover: { off: { loseCoverNear: false }, near: { loseCoverNear: true }, near10: { loseCoverNear: true, lcCoverS: 1.0 }, near20: { loseCoverNear: true, lcCoverS: 2.0 }, low15: { loseCoverNear: true, lcLowHpf: 0.15 },"
       " low10: { loseCoverNear: true, lcLowHpf: 0.10 }, low15c10: { loseCoverNear: true, lcLowHpf: 0.15, lcCoverS: 1.0 },"
       " low10c10: { loseCoverNear: true, lcLowHpf: 0.10, lcCoverS: 1.0 }, low05: { loseCoverNear: true, lcLowHpf: 0.05 },"
       " never: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }, c0l10: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.10 },"
       " low0: { loseCoverNear: true, lcLowHpf: 0 }, c05l05: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.05 },"
       " c05l10: { loseCoverNear: true, lcCoverS: 0.5, lcLowHpf: 0.10 } },\n"
       "  oneHit: { off: {}, on: { lose1Hpf: 0.2, lose2Hpf: 0.25, lose3Hpf: 0.3 } },\n"
       "  fightOn: { off: {}, fin30: { finishHpf: 0.3 }, fin3t: { finishThreats: 3 }, ls35: { lastStandHpf: 0.35 } },")
s = s.replace(old, new)
hd = "  healDoc: { off: {}, on: { healEnterHp: 0.7, healExit: 0.8 }, full: { healEnterHp: 0.7, hfExit: 1.0 } },"
assert s.count(hd) == 1, 'healDoc line'
s = s.replace(hd, "  healDoc: { off: {}, on: { healEnterHp: 0.7, healExit: 0.8 }, full: { healEnterHp: 0.7, hfExit: 1.0 }, low: { healEnterHp: 0.40 }, lowx: { healEnterHp: 0.40, hfExit: 0.55 }, x60: { hfExit: 0.6 } },")
i = s.index('export const SELECT = {'); j = s.index('}', s.index('r3a2:', i))
blk = s[i:j]
blk, n = re.subn(r"loseCover: '[^']*'", "loseCover: '%s', oneHit: '%s', fightOn: '%s'" % (sets.pop('loseCover', 'off'), sets.pop('oneHit', 'off'), sets.pop('fightOn', 'off')), blk); assert n == 1
for k, v in sets.items():
    blk, n = re.subn(r"(\b%s: )'[^']*'" % re.escape(k), r"\g<1>'%s'" % v, blk, count=1); assert n == 1, ('no key', k)
s = s[:i] + blk + s[j:]
open(p, 'w').write(s)
print('patched', p)
