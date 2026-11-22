# Fable wave 2, engineer A (engagement + fire): build log

Written Sun 22 Nov, 04:08-05:20 UTC. One author (the engineer agent); nothing here is independent review. Machine: 4 cores,
load 6-20 (other engineers running). Every recording and simulator match: `nice -n 19`, override `fuseMs 1e9`, at most 2 jobs.
No git, no game server, no other team's code or constants. S = the session scratchpad.

Specs: `notes/fable/redesign/q1_engage.md` (variant 'd': D1-D6, C) and `q2_fire.md` (variant 'e': e1, e2, e3, e5, e6; e4 is
engineer B's). Hook names: `redesign/architecture.md` 3.3.

## 1. Where

- Work tree `S/fable_work/w2/A/tree` = copy of `S/fable_work/chaos/builds/CH1_s1/bot` (the CH1 snapshot), plus:
  - NEW `lib/engage.js` (D1-D6, C) and `lib/fire2.js` (e1, e2, e3, e5, e6);
  - hooks in `brain.js`, `tactics.js`, `firecontrol.js` (each `if (B.en) ...` / `if (B.f2) ...`; `B.en` / `B.f2` exist only
    when one of the presets is on, so at the old values not one statement of the CH1 code path changes);
  - `params.js`: one marked PARAMS block ("Fable wave 2, engineer A"), 9 PRESETS entries, 9 SELECT entries before `healDoc`.
- Diff against the snapshot: `S/fable_work/w2/A/w2A_vs_CH1_s1.diff` (`diff -ruN CH1_s1/bot w2/A/tree`).
- Tools (mine, outputs only under w2/A): `S/fable_work/w2/A/tools/` rec.sh, cmp.sh, idall.sh (recordings through
  `fable_work/chaos/tools/recs.js`), sim.sh / simx.sh / simeach.sh / simdiag.sh (copies of chaos `simb.sh`), simsum.py,
  test_w2a.mjs (synthetic scenes), trace.mjs / simtrace.mjs / probe_snap.mjs (diagnostics). Recordings in `w2/A/id/<tag>/`,
  simulator metas in `w2/A/out/sim/<tag>/`.

## 2. Hooks (line numbers in the w2/A tree)

| Hook | Line | Code |
|---|---|---|
| imports | brain.js 26-27 | `import { makeEngage } from './engage.js'`, `import { makeFire2 } from './fire2.js'` |
| HB2 | brain.js 259-260 | `if (P.enOpen \|\| P.enBand \|\| P.enRetarget \|\| P.enContra) B.en = makeEngage(B, hunt, mover)`; `if (P.fiGate \|\| ... \|\| P.fiRung) B.f2 = makeFire2(B, hunt)` |
| HB9 | brain.js 487 | fightLegs, after `stance.fightLegs()`: `if (B.en && B.en.fightLegs()) return` |
| HB4 | brain.js 741 | assess stage after `B.util.pre()`: `if (B.en) B.en.pre(); if (B.f2) B.f2.pre()` |
| HB5 | brain.js 744 | after `hunt.post()`: `if (B.en) B.en.post()` (B.ft) |
| HT1 | tactics.js 119 | bandFor, before the gun-range clamp: `if (B.en) B.en.band(o)` |
| HT5 (new) | tactics.js 208-210 | `let gate = ...; if (B.en) gate = B.en.ofGate(gate); B.ofGate = gate \|\| (!!B.en && B.en.openUp())` |
| HT2 | tactics.js 263 | candidate gate, after the farm-first gate line: `if (B.en) ok = B.en.cand(tr, ok)` (two-way: D1 closes, D6 opens) |
| HT3 | tactics.js 377 | after `util.pickTarget`: `if (B.en) pick = B.en.pickTarget(pick, cur, candBuf)` |
| HF10 (new) | firecontrol.js 62 | gunSolve: `if (tr.revs >= P.revCount && !(B.f2 && B.f2.fullLead()))` |
| HF5 (new, fire gate) | firecontrol.js 235, 319 | `yawGate = B.f2.yawGate(...)`, `pitGate = B.f2.pitGate(...)`; `B.f2.gunNote(gunFire, ey, ep)` (counters) |
| HF9 (new) | firecontrol.js 254-255 | `const rungs = B.f2 && rungs0 === LASER_RUNGS ? B.f2.laserRungs(rungs0) : rungs0` |
| HF7 (new) | firecontrol.js 282-284 | `const lfs = B.f2 ? B.f2.forceS() : P.laserForceS` (the forced-release line reads lfs) |
| HF6 (new) | firecontrol.js 288 | `if (B.f2 && B.f2.save(tgt, lz, frac, laserRelease, forced)) { laserRelease = false; laserKeep = true }` |
| HF8 (new) | firecontrol.js 291 | pre-charge: `expected = ... \|\| (!!B.f2 && B.f2.snap(tgt))` |
| HF11 (new) | firecontrol.js 348 | at a release: `if (B.f2) B.f2.onRelease(tgt, lz)` (counters) |
| HF2 | firecontrol.js 382 | reload block, last branch: `else if (B.f2 && B.f2.reloadNow(g, lowInSights)) out.reload = true` |

Not used: HB1, HB3, HB6-HB8, HB10-HB12, HT4, HF1, HF3, HF4, HE*. HT4 (losingRaw) is not needed: D5 "never leave" is already
CH1's behaviour behind the firewall (`loseCover: never` makes LOSING false), so B.ft.ok is written as true (neutral).

## 3. Presets (old value first = `{}`, byte-identical; 'on' = SQUAD posture + hunt.firewall(); 'both' = both postures)

| Preset | Values | Rule | Numbers (PARAMS) |
|---|---|---|---|
| en_open | off / on / strict | D1 | gate until first kill / foreign death / `enOpenT` 60 s (x openFarmT/75) / laser + `enOpenCubes` 6; lifted for good by `enOpenShooters` 2 (hit us within `enOpenHitS` 4 s) or `enOpenDryS` 15 s with no cube; answered: hit us within 4 s from under `enOpenR` 100 m; 'on' also answers a farther shooter (`enOpenFar`), 'strict' = spec list alone |
| en_band | off / on / both | D2, D3, D4, D6 | D2 gun `enGunLo/Hold/Hi` 120/135/150, strafe reversal `enStrafeS` 0.5 s +-0.1 beyond `enStrafeMinR` 75 m; D3 laser 130/150/170, at or under `enLzBeams` 2 beams (2 x damage x dmgMult) with <= 2 shooters floor 90 (hold min(110, dist)), lightning carrier floor 55; D4 shooter inside `enAwayR` 70 m, energy >= 35, not finishing (hp <= `enFinHp` 470 x dmgMult, or legacy finishing / killSecure): 1 s boost pulses straight away while < 95 m and energy >= 17; D6 lined mech within 280 / 205 m a candidate at any hp, no walk-in under `enWalkHpf` 70%, isolate cell skipped. 'both': D2's band + D4 in FFA too |
| en_retarget | off / on | D5 | tDie = hp / max(2 s intake, 30); focus-'kill' current-target bonus counted 60 (not 200); if tDie < tKill(pick): the lined mech with the smallest tKill (hunt.ttk) when < tDie |
| en_contra | off / on | C | hp < 35% with 3+ shooters (hit us in 3 s or hostile line): in to 25-32 m (hold 28) of the smallest-tKill lined mech without lightning, boosting; after a kill 4 s on its corpse spot; held while hp < 45% and a shooter remains |
| fi_gate | off / on / both | e1 | gate = max(old gate, 0.70 x (radius or visible half-height + 0.3) / R) |
| fi_save | off / on / both | e2 | no unforced release at a mech with hp <= 90 x dmgMult while the gun has >= 3 rounds, clear line, <= 150 m, our hp >= 25% |
| fi_reload | off / on / both | e3 | no line in or out for 0.4 s and ammo <= 8 (<= 10 with no listed mech within 150 m): reload; never with a target under 300 hp in sight |
| fi_snap | off / on / both | e5 | pre-charge on a listed target without a line, closing >= 8 m/s, position at +0.5 / 1.0 / 1.5 s in a clear muzzle line; forced release 1.8 s (spec 1.9: one decision of margin before the 2 s self-fire); off for the match when blind > 0.45 x snap releases after 5 |
| fi_rung | off / on / both / rung | e6 | laser rung 0.5 when clear, else the highest clear rung (0.8 -> 0.2); 'on' / 'both' also the full gun lead on jinkers (SQUAD + firewall only); 'rung' = the rung alone |

Readings of the spec that a reviewer should check:
- D1: CH1 has no farm-first gate (fightEarly 'on' turns openFarm off), so D1 adds a gate. With the spec's answer list alone
  ('strict'), a mech hitting us from 100+ m is not a target and decideMode's "shot by a mech we do not target" DISENGAGE hides
  from it (kit stream: 63 decisions of hide/retreat under a 150 m laser hunter), which D1 forbids; the economy will not loot
  under fire either. Neither is in my files, so 'on' answers any mech that hit us within 4 s. Once D1 was live the farm-first
  gate stays replaced (no line breaking) for the rest of the match, also after the firewall drops.
- D2's strafe: own reversal clock (own generator seeded from the spawn point; never `B.rng()`), written into mover.jink.sign;
  inside 75 m the legacy jink. D2-D6 legs: a takeover of the open-ground stand-off only; beam hide, drop pull, power grab,
  lightning rush and the no-line regain stay with the legacy branches. The CH1 finish walk-in stays for gun-only (D3 replaces
  it with a laser), with the 55 m floor against a lightning carrier.
- e1: the spec's 0.70 x 2.8 / R is stricter than today's gate inside 80 m (today allows 2.4 m at 40 m, which already passes the
  spec's own p_now >= 0.77 p_centre test), so the new gate never goes below the old one.
- e5 rarely adds anything: in 12 CH1 matches 130 decisions had a listed target without a line and a ready laser; 25 had a
  clear predicted line, 11 also closing >= 8 m/s, and most of those are already pre-charged by the legacy 1 s line memory.
- e6's lead part: the simulator's house model strafes (replay-calibrated reversals, median 1.1 s), against the spec's
  "never jink"; hence the 'rung' value.

## 4. Tests

- Identity, kit stream (`S/diff_stream.mjs` CH1_s1/bot vs w2/A/tree): decisions 300, differ 0.
- Identity recordings (recs.js, every preset at its old value; tags `def` = default SELECT, `defold` = every new key set to
  'off' explicitly) against CH1_s1/bot/lib (`ch1`): 10/10 sources byte-identical each (kit squad / auto / ffa, long4800
  squad / auto / ffa, ffa_s1-4 forced). Rerun on the final code (05:25): 10/10 and 10/10.
- T-F2 recordings, each preset 'on' (and en_open 'strict', and the bundle) with env forced to FFA, 6 sources (kit, long4800,
  ffa_s1-4): byte-identical to CH1, 6/6 for each of en_open on / strict, en_band, en_retarget, en_contra, fi_gate, fi_save,
  fi_reload, fi_snap, fi_rung on / rung, and the bundle of all (final code). Bundle in SQUAD: kit 117 / 300 and long4800
  1905 / 4800 lines differ (squad and auto alike), errors 0. Kit stream under en_open: base 45 DISENGAGE / 116 FIGHT,
  'strict' 108 / 30 (the hiding described above), 'on' 45 / 99.
- Synthetic scenes `tools/test_w2a.mjs` (real map, open loop): for every preset one trigger scene where it acts in SQUAD
  (actions differ, counter moves), equals the old value with env forced to FFA, and equals the old value after one foreign
  death (alive 12 -> 11 seen before the trigger appears; the firewall reads B.foreignDeaths one decision late, as for every
  CH1 rule): 40/40 PASS. Scenes: D1 calm lined mech at 120 m at t 30 s; en_open 'on' answers a 120 m shooter, 'strict' hides;
  D2 hostile at 100 m (gun); D4 shooter at 60 m; D3 full-hp laser hostile at 110 m; D6 calm lined mech at 200 m at 50% hp;
  D5 hp 600 under fire, a 450 hp mech appears; bonus 60 (same, intake from an unseen mech); C hp 30% with 3 shooters; e1 still
  mech at 200 m with a 0.007 rad residual after the slew; e2 full charge at an 80 hp mech at 100 m; e3 7 rounds, target behind
  cover; e5 closing mech behind cover with a predicted line; e6 0.5 rung in the open.
- Simulator: tree with every key old (`nc`) = CH1 (`chaos/out/sim/CH1`): 24/24 match hashes identical, 108 kills, 1673 s;
  `nc` (seeds 1-72) is the base of the table below.

## 5. Simulator sanity (FNV + CH1 SELECT, salt 1, squad seeds; errors 0 and fuse 0 in every run)

Per-match kill sd 2.8; diff = sum of paired kill differences against `nc`, se = sd(paired difference) x sqrt(n). A 24-seed
sum has se 12-16, a 72-seed sum about 20-24. Worst decision times above 100 ms are machine load (en_open seed 52: 1205 ms,
rerun alone 25 ms with the same match hash).

| Tag | seeds | kills | base | diff (se) | alive s / base | differ | up/down | errors / fuse |
|---|---|---|---|---|---|---|---|---|
| **bundle (all 9 on)** | 72 | 298 | 334 | -36 (23.6) | 5885 / 5232 | 72 | 21/38 | 0 / 0 |
| en_open on (D1 alone) | 72 | 318 | 334 | -16 (20.0) | 5134 / 5232 | 44 | 15/20 | 0 / 0 |
| en_band on | 72 | 292 | 334 | -42 (20.3) | 5446 / 5232 | 71 | 21/32 | 0 / 0 |
| en_band with the old gun band (no D2) | 72 | 287 | 334 | -47 (22.4) | 5126 / 5232 | 71 | 21/33 | 0 / 0 |
| bundle without en_open, en_contra | 24 | 89 | 108 | -19 (15.6) | 1915 / 1673 | 24 | 8/13 | 0 / 0 |
| en_retarget on | 24 | 97 | 108 | -11 (4.0) | 1585 / 1673 | 13 | 0/6 | 0 / 0 |
| en_contra on | 24 | 106 | 108 | -2 (3.1) | 1671 / 1673 | 17 | 1/3 | 0 / 0 |
| fi_gate on | 24 | 104 | 108 | -4 (3.9) | 1628 / 1673 | 2 | 0/1 | 0 / 0 |
| fi_save on | 24 | 108 | 108 | 0 | 1673 / 1673 | 0 | 0/0 | 0 / 0 |
| fi_reload on | 24 | 104 | 108 | -4 (14.5) | 1717 / 1673 | 22 | 5/8 | 0 / 0 |
| fi_snap on | 24 | 99 | 108 | -9 (6.1) | 1602 / 1673 | 3 | 0/2 | 0 / 0 |
| fi_rung on | 24 | 105 | 108 | -3 (13.4) | 1648 / 1673 | 24 | 7/10 | 0 / 0 |
| fi_rung rung | 24 | 106 | 108 | -2 (6.5) | 1650 / 1673 | 13 | 1/2 | 0 / 0 |
| en_band without D4 | 24 | 86 | 108 | -22 (14.0) | 1674 / 1673 | 23 | 5/13 | 0 / 0 |
| en_band without D6 | 24 | 96 | 108 | -12 (14.8) | 1801 / 1673 | 23 | 7/11 | 0 / 0 |

Counters, bundle, 72 matches (sum / matches where > 0): D1 enOpenGate 13337/72, enOpenBlock 4008/45, ends dry 70 / kill 1 /
shooters 1; D2 enBandGun 10674/41, enFlip 2078/67; D3 enBandLaser 3871/35; D4 enAwayStart 132/63 (enAway 3530 decisions,
252 extra pulses); D6 enD6Cand 704/18, enNoWalk 573/11; D5 enRetarget 197/28, enRescore 97/44; C ecStart 42/42, ecLegs
1257/41, ecPick 370/29, ecCorpse 359/15 (19 kills while on); e1 fiGateExtra 18/13, gateBlocked 1206/71; e2 beamHeldForGun
52/11, overkillDmg 24108/37; e3 earlyReloads 240/53, reloadCaughtByLine 120/54; e5 fiSnapStart 2/2 (snapBeams 1); e6 laser
rung 0.5 hits 544 / 569 shots, rung 0.8 39 / 42 (base laser 173 / 185 = 93.5% in the 24 CH1 matches), fiFullLead 13624/72.

Reading (sanity, not a result): errors 0, fuse 0, every rule fires, no collapse. The bundle reads -11% kills (1.5 se) with
+12% alive time; en_band alone -13% (2.1 se) with +4% alive time; D1 alone -5% (0.8 se). The 24-seed split of en_band
suggested D2's gun band was the cost (no D2: 109), the 72-seed run does not (-47): the split was noise. en_retarget 0 up / 6
down in 13 differing matches (each a single rescore or retarget, then chaotic divergence; seed 3: the rescore took a 70 m
mech over a 152 m previous target, a sensible pick). D1's gate ends 'dry' (15 s without a cube) in 70 of 72 matches, so in
practice it is a 15-25 s no-initiation window; it lets CH1's early winning fights go (seed 2: a 104 m hostile that CH1 took
from 1400 to 277 hp at t 15-20 s is left alone; 10 -> 5 kills). e1, e2 and e5 rarely bind (spec: small gains).

## 6. Not done / open

- No salt-2 runs (the spec asks two salts per test); no real-server submission; no conformance build (mkbuild.sh) of this tree.
- e4 (regen hold) is engineer B's; HT4, HB10-12 untouched.
- `B.ft` is written (tKill, tDie, ourDps, inDps, shooters, ok = true, finish) only while the firewall is up, else null.
- If the integrator's V-guard (architecture 1.3) is added, every key here is a plain PARAMS value read live, so the in-place
  revert works; `en_open`'s replacement of the farm-first gate is a one-way state latch (B.en.st.openUsed), not a parameter.
