# DEV ONLY (scratch). Builds tools/top10/t2696_cx_mod.js = bot/lib/counters.js (read-only) + the changes proposed in
# notes/counters_2696_addendum.md section 6, as exact old -> new string edits (each must occur exactly once), and
# tools/top10/t2696_test_counters_mod.mjs = tools/test_counters.js pointed at the scratch module.
# Run: python3 -I t2696_cx_mkmod.py
import os
P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
src = open(os.path.join(P, 'bot/lib/counters.js')).read()

EDITS = [
  # C3: new archetype index
  ("const UNK = 0, LK = 1, LZ = 2, GS = 3, BR = 4, HD = 5, FM = 6, NA = 7",
   "const UNK = 0, LK = 1, LZ = 2, GS = 3, BR = 4, HD = 5, FM = 6, LB = 7, NA = 8"),
  ("'HIDER', 'FARMER'])\n",
   "'HIDER', 'FARMER', 'LASER_BRAWLER'])\n"
   "const FIN_REASON = Object.freeze(['N/finish', 'LK/finish', 'LZ/finish', 'GS/finish', 'BR/finish', 'HD/finish', 'FM/finish', 'LB/finish'])\n"),
  # C2: laser kiter range ramp
  ("  lkR0: 80, lkR1: 110, lkBoost0", "  lkR0: 70, lkR1: 100, lkBoost0"),
  # C3: classification parameters
  ("  fmAimUs0: 0.3, fmAimUs1: 0.6, fmAimMech0: 0.35, fmAimMech1: 0.6,\n",
   "  fmAimUs0: 0.3, fmAimUs1: 0.6, fmAimMech0: 0.35, fmAimMech1: 0.6,\n"
   "  lbOn: true, lbR0: 38, lbR1: 46, lbR2: 70, lbR3: 82, lbBoost0: 0.3, lbBoost1: 0.5, lbBoostCut: 0.5,\n"),
  # C1 + C3: advice parameters
  ("  fmLo: 140, fmHi: 200, fmMult: 0.9, fmDodge: 0.6, fmStrikeMult: 1.3, fmStrikeHpf: 0.7,\n",
   "  fmLo: 140, fmHi: 200, fmMult: 0.9, fmDodge: 0.6, fmStrikeMult: 1.3, fmStrikeHpf: 0.7,\n"
   "  lbLoLaser: 125, lbHiLaser: 185, lbLo: 200, lbHi: 280, lbMult: 0.9, lbDodge: 0.8,\n"
   "  lbDashAlive: 0, lbDashLo: 0, lbDashHi: 43, lbDashMult: 1.3, lbDashDodge: 0.6, lbDashHpf: 0.7, lbDashEnergy: 70,\n"
   "  finOn: true, finHpf: 0.5, finFaceCos: 0.5, finLoLaser: 100, finHiLaser: 190, finLo: 60, finHi: 150, finMult: 1.5,\n"),
  ("  rankArch: [1, 1.4, 1.5, 1.2, 1.3, 0.5, 0.8],", "  rankArch: [1, 1.4, 1.5, 1.2, 1.3, 0.5, 0.8, 1.3],"),
  # C3: score
  ("    out[UNK] = 0\n  }\n",
   "    v = 0\n"
   "    if (P.lbOn && s.gun && s.laser && !s.lightning && f.rFoe >= 0) {\n"
   "      const H = f.chR >= 0 ? f.chR : f.rFoe\n"
   "      const Rm = ramp(H, P.lbR0, P.lbR1) * (1 - ramp(H, P.lbR2, P.lbR3))\n"
   "      const E = Math.max(f.chR >= 0 ? 1 : 0, ramp(f.aimMech, P.gsAimMech0, P.gsAimMech1))\n"
   "      const N = 1 - ramp(f.cl90, P.lkClose0, P.lkClose1) * f.cl90w\n"
   "      const Wk = 1 - P.lbBoostCut * ramp(f.boost, P.lbBoost0, P.lbBoost1)\n"
   "      const Fm = 1 - P.lkFarmCut * ramp(f.aimLoot, P.lkFarm0, P.lkFarm1)\n"
   "      v = Rm * E * N * Wk * Fm\n"
   "    }\n"
   "    out[LB] = v\n"
   "    out[UNK] = 0\n  }\n"),
  # C3: advice case; C1: finish rail after the switch
  ("      default:\n        CT.lo = 0; CT.hi = 0; CT.level = P.neutralLevel; CT.mult = 1; CT.dodge = P.neutralDodge; CT.reason = 'N/unknown'\n    }\n  }\n",
   "      case LB: {\n"
   "        const dash = P.lbDashAlive > 0 && myLight && !s.lightning && nAlive <= P.lbDashAlive && myHpf >= P.lbDashHpf && myHpf >= s.hpf && myEnergy >= P.lbDashEnergy\n"
   "        if (dash) { CT.lo = P.lbDashLo; CT.hi = P.lbDashHi; CT.level = 3; CT.mult = P.lbDashMult; CT.dodge = P.lbDashDodge; CT.reason = 'LB/dash' }\n"
   "        else { CT.lo = myLaser ? P.lbLoLaser : P.lbLo; CT.hi = myLaser ? P.lbHiLaser : P.lbHi; CT.level = 1; CT.mult = P.lbMult; CT.dodge = P.lbDodge; CT.reason = 'LB/cover' }\n"
   "        CT.brk = true\n"
   "        break\n"
   "      }\n"
   "      default:\n        CT.lo = 0; CT.hi = 0; CT.level = P.neutralLevel; CT.mult = 1; CT.dodge = P.neutralDodge; CT.reason = 'N/unknown'\n    }\n"
   "    if (P.finOn && s.label !== UNK && CT.level < 2 && s.hpf < P.finHpf && !(s.aimDot > P.finFaceCos) && !s.chargeOn && t - s.lastDmgUsT > P.hostileS) {\n"
   "      CT.lo = myLaser ? P.finLoLaser : P.finLo; CT.hi = myLaser ? P.finHiLaser : P.finHi\n"
   "      if (s.lightning && !myLight) CT.lo = Math.max(CT.lo, P.lzLo)\n"
   "      CT.level = 2; CT.mult = Math.max(CT.mult, P.finMult); CT.reason = FIN_REASON[s.label]\n"
   "    }\n"
   "  }\n"),
]
out = src
for old, new in EDITS:
    n = out.count(old)
    assert n == 1, (n, old[:80])
    out = out.replace(old, new)
open(os.path.join(P, 'tools/top10/t2696_cx_mod.js'), 'w').write(out)

t = open(os.path.join(P, 'tools/test_counters.js')).read()
for old, new in [("from '../bot/lib/counters.js'", "from './t2696_cx_mod.js'"),
                 ("const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')", "const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')")]:
    assert t.count(old) == 1, old
    t = t.replace(old, new)
open(os.path.join(P, 'tools/top10/t2696_test_counters_mod.mjs'), 'w').write(t)
print('ok: %d edits; module %d -> %d bytes' % (len(EDITS), len(src), len(out)))
