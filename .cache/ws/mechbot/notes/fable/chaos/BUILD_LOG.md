# Fable chaos: the "go aggressive" coach bundle, build log (engineer)

Written Sun 22 Nov, 03:22-04:05 UTC. One author (the engineer agent); nothing here is independent review. Machine: 4 cores,
load 7-20 during the run. Every recording and simulator match: `nice -n 19`, override `fuseMs 1e9`, at most 2 jobs. The
simulator cannot rank changes of this size; its kills are a sanity read only (does the bot collapse, error, trip the fuse).
S = the session scratchpad. No git, no game server, no network, no other team's code (the intel notes were read for the
behaviour descriptions only).

Work folder `S/fable_work/chaos`: `tree/` (copy of `switch/tree`, the CH1 code; frozen in `out/tree_ch1_freeze.sha256`),
`tree2/` (= tree + the R6 alpha and R7 strafe code; frozen in `out/tree2_freeze.sha256`), `tree.orig_switch/` (untouched
copy), `tools/`, `sim/` (copies of switch's, paths repointed to chaos), `bot -> tree`, `kit`, `replay`, `notes` (symlinks),
`id/` (recordings), `out/sim/<tag>/` (simulator metas), `out/lt/` (laser-time probe), `builds/<name>/{bot,dist}`.

## 0. Result in brief

| Build | SELECT changes against the 5.38 SELECT (`variants6/FNV_s1`, salt 1) | Source | sha256 of `dist/bot.js` | Sim 24 seeds: kills (base 95), alive s (1692), differ, up/down |
|---|---|---|---|---|
| CH1_s1 | focus mult->kill, laserGrab std->spawn, cubes snow (new key), laserRange far->midsq, boostCharge on (new), farmHp 90->50sq, cratePath 80 (new), upg std->laser, upgFix off->on | tree | 014e3e19b3436a580cf1525492a866f2a7f1420019e3e31407ec2489b044ef17 | 108, 1673, 24, 13/9 |
| CH1_s2 | the same, salt 2 (only the salt line differs) | tree | 051eba9b79e67f6c62971eda162e09e1adf0552d1e88a492dcb1e6df5cc27832 | (salt 1 only simulated) |
| CH1_s3 | the same, salt 3 | tree | 6c31af6430a1d48ff6b725da1034f0dfc636aa4e7796b55c3cc804716da5e2d4 | - |
| CH1DL_s1 | CH1 + dropLife off->on (R3) | tree | f86ead0a873405c32a1b0f58a24077d3aabba2052a0499dabe9b6b567c1a3c6c | 111, 1694, 24, 13/9 (1 supply drop captured in 24 matches; 68 capture-mode decisions) |
| CH1AL_s1 | CH1 + alpha off->on (R6) | tree2 | 9c1dd3c4749539664fc140ad13bcf053deae58834b02b1e03b58650c54584b75 | 102, 1647, 24, 10/9 |
| CH1PM_s1 | CH1 + pauseMove on, isoDwell on, strafe d4->fast75 (R7) | tree2 | 34385c7080756a4a0d90edea2ff9c7d5b53a2e337c093f6bb76d4dc3285d860e | 93, 1567, 24, 10/10 |

All six: conformance `run_check.sh base` PASS and `v3dir` PASS (world=true nav=true brain=true, worst answer 6.2-12.4 ms on
this machine), `dist` = `bot.js` + `Dockerfile`, every `bot/lib` file equals its source tree except `params.js`, and the
salts differ only in the salt line. Every simulator run: errors 0, fuse 0. `READY.txt` (CH1_s1..s3) was written at 03:37
UTC as soon as they passed; `READY_addons.txt` holds the three add-ons.

Old values: tree 108/108 and tree2 108/108 recordings byte-identical to `switch/id/final2` (DEF, KS, KB, 5.38 SELECT; R3a2 set
+ FFA-inert set), fuse 0, errors 0; simulator `nc` (tree) and `nc2` (tree2), every chaos key old: 24/24 matches identical
to `base`. Forced FFA (T-F2): every new preset value and every bundle changes **0 lines in all 5 forced-FFA sources**, and
every unit scene's forced-FFA run equals the old value.

## 1. What each new preset does (all in the SQUAD posture behind `hunt.firewall()`; the old value is the first one)

New SELECT keys sit before `healDoc` (still the last key): `cubes: 'off'`, `boostCharge: 'off'`, `cratePath: 'std'`,
`alpha: 'off'`. New values of existing keys: `focus: 'kill'`, `laserGrab: 'spawn'`, `laserRange: 'midsq'`, `farmHp: '50sq'`,
`upg: 'laser'`, `strafe: 'fast75'`. New PARAMS (all inert at their defaults) are listed under "Fable chaos" in params.js.

**R1 focus 'kill'** (tactics.selectTarget, firecontrol.run, brain.fightLegs / legs):
- target cost (lowest wins): mech `dist + 0.1 hp`, -200 at hp <= 30% of max, -200 when it was our target within the last 2 s
  (`tr.fkTgtT`, stamped each decision on the current target), -40 when it hit us within 4 s. Kept from today's 'add' cost:
  +240 without a line (`fcNoLos`; without it the cost ignores sight), the drone cost of 'add'. The torso veto keeps the pick
  under 38% hp or while we hit it within 2 s (as 'add'); the rear-hit face switch (`scanner.rearPick`) is off under 'kill'.
  Not used from 'add': closing -15, mortar -20, airborne -15, the last-stand term.
- lethal partial laser: `0.7 x laserFrac(charge) x damage x dmgMult x (1 + cookoff if it carries a mortar) >= hp`, from the
  minimum charge, inside the existing aim gate. It **replaces** today's rule (factor 1.0 and the 1.5 rear factor counted), so
  partial shots are released *later* than today (unit FK3: at hp = 0.85 x estimate today releases, 'kill' holds). This is
  the 0.7 rule as described (intel: "the estimate must exceed the target's health by 43%").
- blink hold: today's code already keeps the charge through a blink (a target unlisted < 0.35 s or "blind" < 1.5 s stays the
  target and the charge is kept; with no target the charge is held 2 s for a lost target). The one path that dropped it, a
  phantom track in the "memory" branch, now keeps the charge up to 1.5 s (`fkBlink`). It never triggered in the sources or
  the simulator (counter absent), so this part has no measured reach.
- finish walk-in: target < 38% hp, our hp > 42%, `B.nLos <= 2`: hold 20 m, dead band 14-26 m; the walk-in suppresses every
  boost of fightLegs (laser boost-away, lightning-rush boost, chase boost), boostSpend and boostCharge, and skips the isolate
  cell. The late-zone leash, beam hide and power grabs still come first.

**R2 laserGrab 'spawn'** (economy.lgsUpdate / chooseLoot / lootLegs / wantPickup, firecontrol.scan):
- sweep: from the first decision the torso is commanded `min(2.5, 0.3 x turn rate)` rad ahead in one direction until it has
  turned 2 pi - 0.15 or 1.6 + 0.6 s passed (16 decisions = 1.6 s in every sim match); an attacker / unseen hit / anything to
  shoot comes first.
- the laser run (`B.lgsOn`): no laser held, match clock < 25 s, no tracked mech has damaged us from within 100 m since spawn
  (first such hit ends it for the match): laser pickups get value 100 and reach 240 m of path in the LOOT chooser; the LOOT
  legs boost to it (> 8 m away, energy above boostReserve 25) and shoot the nearest fresh crate within 45 m with a clear line.
  The chooser runs only out of contact, so the run never takes the legs from a fight.
- never a mortar (whole match, SQUAD + firewall); a lightning is refused while we are laser-less before 40 s.

**R4 cubes 'snow'** (economy.chooseGrab / killReachOk): `killCubeThreats` 1 -> 3, grab hp floor 0.5 -> 0.25, high reach 70
(unchanged number); for 8 s after our own kill with at most 3 lines on us, cubes and a laser we lack within 25 m of the corpse
(`B.lastKillX/Y`) are grabbed out to max(120 m, the normal reach) of path with the grab's rush flag (boost beyond 20 m with
energy >= boostReserve + 10). The corpse rule skips the "no other mech within 60 m of the cube" check; the normal long kill-cube
reach keeps it.

**R5 laserRange 'midsq' + boostCharge 'on'**: 'midsq' = the far numbers in PARAMS plus the mid band (hold 115, 100-130,
boost-away 70) in tactics.bandFor while SQUAD + firewall. **Why not the existing 'mid'**: it changes forced FFA (27 lines in
2 of the 5 forced-FFA sources, `id/ffa_laserRange_mid`), because stance.js reads bandFor in FFA. boostCharge: boost while the
laser charges under fire (a line on us or hurt within 1 s), energy > 30 (and the lightning reserve), any mode but ZONE, stick
>= 0.05, not in a rush or walk-in. Its reach is near zero because the 5.38 SELECT already has `boost: 'spend'` (the same rule
in FIGHT with stick >= 0.3): alone it changes 0 lines on the 28 sources and 1 of 24 sim matches; inside CH1, 7-11 decisions.

**R8**: `farmHp '50sq'` = farmHp 0.9 in PARAMS and 0.5 for the farming rule in SQUAD + firewall (economy.chooseLoot). The
existing '50' happened to leave the forced-FFA sources identical (`id/ffa_farmHp_50`), but it reaches the FFA farm rule by
code, so the gated value was used; the steal gates (steal.js) keep farmHp 0.9. `cratePath '80'`: crate farming path 150 ->
80 m (SQUAD + firewall). `upg 'laser'`: order plating, armor, laser_damage, laser_charge, plating, nanites, gun_rate,
gun_damage, then today's order without those (lightning_efficiency, lightning_range, ...). Read as a sequence: an id ranks at
its (k+1)-th entry once k of it are taken (`obs.self.upgrades`), so the second plating counts after the first is taken
(unit UP2). Today's rule that laser_* ranks +60 without a laser stays. With upgFix 'on' the same alias / append fix is applied
to this order (B.upgOrderSq).

**R6 alpha** (tree2; firecontrol reload, tactics.selectTarget, brain.fightLegs): (1) with no line on us for 0.4 s
(`reloadQuiet`) reloadAmmo 4 -> 11 (tops up any missing round); (2) a non-hostile mech becomes a candidate (we open a fight)
only with a full magazine, not reloading, a ready laser (cooldown <= 0.11 s) and within 130 m; the current target hit by us in
5 s, the hunt50 commit and an armed FIN target are not "openers"; an opener whose torso faces > 90 deg away (`tr.rearOn`)
scores x1.5 (cost / 1.5 under 'kill'); (3) when the target has fired its 12th round within 2.5 s (`tr.magN`, `magReloadS`):
hold min(hold, max(20, dist - 30)), hi = hold + 5, any loadout (today only narrows hi for gun-only).

**R7** (tree2): `strafe 'fast75'` = strafe reversal interval U(0.45, 1.15) s when the target is beyond 75 m (SQUAD +
firewall), else d4 U(0.8, 1.6); one RNG draw either way. pauseMove 'on' and isoDwell 'on' are the switch engineer's presets.

## 2. Tests

- `tools/test_chaos.mjs` (real map, scripted observations, 5.38 SELECT): **35/35** on tree and on tree2
  (`out/test_chaos_tree.txt`, `out/test_chaos_tree2.txt`). Every preset value in the T-F2 form (acts in SQUAD, forced FFA
  identical to the old value, one foreign death identical): FK1 cost picks the 30% mech at 110 m over a fresh one at 60 m;
  FK2 walk-in holds 20 m, no boost; FK2c none at our hp 40%; FK3 partial charge at hp 0.85 x estimate: today releases, 'kill'
  holds; FK3b at 0.6 x both release; LR1 midsq holds 115 m at 140 m (far 150); BC1 boostCharge boosts (scene with boostSpend
  off, since spend already covers FIGHT); LG1 sweep (>= 10 decisions) then the laser at 150-170 m by boost; LG2 no run after
  25 s; LG3 a hit from inside 100 m ends it; LG4 mortar at 2 m never taken (std takes); LG5 lightning at 30 s refused, LG6 at
  45 s taken; LG7 forced FFA identical; SN1 cube at 55 m grabbed at hp 45%; SN2 corpse at 90 m rushed (laser we lack, rush flag);
  FH1 50sq farms a crate at hp 60%; CP1 a crate at 100-120 m skipped under '80'; UP1 laser_damage over nanites; UP2 after one
  plating, armor over plating; UP3 the same with upgFix.
- `tools/test_chaos_r6.mjs` on tree2: **9/9** (AL1 reload at ammo 6 without a line; AL2 no opening at ammo 8, AL2b opening at
  12 rounds and 110 m, AL2c none at 150 m, AL2d the opener facing away is picked; ST1 fast75 in a fight at 110 m; all T-F2).
  The push during the target's reload has no unit scene (bullet attribution); counted in the simulator (`alPush` 139-258).
- Inherited suites on tree2: test_switch 36/36, test_tf2 13/13.

## 3. Changed decisions on the 28 sources (5.38 SELECT, salt 1, against `id/old`)

| Preset value / bundle | R3a2 set (14 sources) | FFA-inert set (14) | forced-FFA sources (5) | counters (27 recordings) |
|---|---|---|---|---|
| focus kill | 13837 / 34139 lines, 12 / 14 | 2132 / 14123, 4 / 14 | 0 / 4944, 0 / 5 | fkWalk 533 |
| laserGrab spawn | 3721 / 33923, 14 / 14 | 7044 / 16923, 9 / 14 | 0, 0 / 5 | sweep 410, laser run 2776, boost 89, stopped by a hit 27 |
| cubes snow | 2138 / 34156, 8 / 14 | 12 / 14123, 1 / 14 | 0, 0 / 5 | - |
| laserRange midsq | 824 / 33906, 6 / 14 | 776 / 14391, 1 / 14 | 0, 0 / 5 | - |
| boostCharge on | 0 / 33906, 0 / 14 | 0, 0 / 14 | 0, 0 / 5 | - |
| farmHp 50sq | 0 / 33906, 0 / 14 | 0, 0 / 14 | 0, 0 / 5 | - |
| cratePath 80 | 1321 / 33906, 4 / 14 | 10 / 14123, 1 / 14 | 0, 0 / 5 | - |
| upg laser | 146 / 33906, 1 / 14 | 0, 0 / 14 | 0, 0 / 5 | - |
| alpha on (tree2) | 9499 / 34412, 14 / 14 | 3911 / 15115, 7 / 14 | 0, 0 / 5 | alNoOpen 95713 (candidate-decisions), alPush 183, alReload 184 |
| strafe fast75 (tree2) | 3070 / 33915, 14 / 14 | 6293 / 16447, 6 / 14 | 0, 0 / 5 | strafeFar 339 |
| CH1 | 14989 / 34459, 14 / 14 | 7129 / 16923, 9 / 14 | 0, 0 / 5 | boostCharge 7, fkWalk 620 |
| CH1 on tree2 | byte-identical to CH1 on tree (27 / 27) | | | |
| CH1DL | 14993 / 34459, 14 / 14 | 7129 / 16923, 9 / 14 | 0, 0 / 5 | dlCap 8 |
| CH1AL | 15861 / 34050, 14 / 14 | 7438 / 17023, 9 / 14 | 0, 0 / 5 | alPush 106, alReload 188 |
| CH1PM | 14967 / 33940, 14 / 14 | 6837 / 16358, 9 / 14 | 0, 0 / 5 | pmPause 1499, strafeFar 446 |
| (check) existing laserRange mid | - | 2250 / 15405, 6 / 14 | **27 / 4944, 2 / 5** | the reason for midsq |
| (check) existing farmHp 50 | - | 0, 0 / 14 | 0, 0 / 5 | gated anyway (code reach) |

The FFA-inert differences are all in `env: auto` sources (streams kit / ffa_s1-4 with auto, sim FFA 411-414), which start
in the SQUAD posture: over 74 differing sources the first difference is always before the FFA latch and before the first
foreign death (`out/first.txt`, `tools/first.py`); the spawn sweep makes most of them differ from tick 0. In a real FFA match
the opening (sweep, laser run, focus, walk-in) therefore also runs until the first foreign death; that is the gate as asked
(the switch engineer reported the same for his presets).

## 4. Simulator sanity (24 squad seeds, 5.38 SELECT, salt 1)

| Tag | kills | alive s | differ | up / down | worst decision ms | notes |
|---|---|---|---|---|---|---|
| base / nc / nc2 | 95 | 1692 | 0 | - | 21 / 64 (load) | nc, nc2 = 24/24 identical to base |
| focus kill | 104 | 1661 | 23 | 8 / 9 | 29 | fkWalk 1357 decisions |
| laserGrab spawn | 96 | 1630 | 24 | 8 / 9 | 22 | stopped by a hit in 24 / 24 matches |
| cubes snow | 104 | 1731 | 16 | 6 / 3 | 95 | |
| laserRange midsq | 89 | 1639 | 6 | 1 / 3 | 24 | |
| boostCharge on | 95 | 1692 | 1 | 0 / 0 | 38 | 1 decision |
| farmHp 50sq | 95 | 1711 | 1 | 0 / 0 | 153 (load) | |
| cratePath 80 | 89 | 1658 | 2 | 0 / 2 | 105 (load) | |
| upg laser | 93 | 1685 | 3 | 1 / 2 | 78 | |
| alpha on | 88 | 1737 | 24 | 6 / 9 | 18 | |
| strafe fast75 | 97 | 1711 | 23 | 8 / 9 | 497 (one load spike; CH1PM with the same code 20) | |
| **CH1** | **108** | 1673 | 24 | 13 / 9 | 28 | laser shots 185 / hits 173 (base 119 / 115) |
| CH1DL | 111 | 1694 | 24 | 13 / 9 | 17 | 1 drop captured, 68 capture-mode decisions |
| CH1AL | 102 | 1647 | 24 | 10 / 9 | 75 | |
| CH1PM | 93 | 1567 | 24 | 10 / 10 | 20 | |

Errors 0 and fuse 0 everywhere. Laser probe (`tools/lt.js`, same 24 matches, `out/lt/`): a laser held at all 10 (base) /
12 (spawn alone) / 13 (CH1) of 24; **by 15 s 5 / 7 / 8**; median first-laser time 18.8 / 13.8 / 13.8 s; a lightning taken
12 / 2 / 3. None of these differences is outside the noise of 24 seeds.

## 5. Rules simplified or read in a particular way

1. R5 / R8: the gated new values `laserRange 'midsq'` and `farmHp '50sq'` instead of the existing 'mid' / '50' (same numbers;
   'mid' measurably changes forced FFA). The steal gates keep farmHp 0.9.
2. R1 lethal release: the 0.7 factor replaces today's factor 1.0 with rear multiplier, so it releases later than today.
   Blink hold: only the phantom path was missing; no measured trigger. Cost terms kept from 'add': no-line +240, drone cost.
3. R2: "boost to the nearest ground laser" = the LOOT chooser's nearest-by-time laser at value 100 within 240 m path (the run
   happens only out of contact); "first damage from inside 100 m" = a tracked mech's hit at <= 100 m (an unseen shooter does
   not stop it); "never take a mortar" is for the whole match in SQUAD + firewall.
4. R4: the corpse is the last kill position; "boost" = the grab's rush flag (> 20 m, energy >= 35).
5. R6: "a full charge" = a ready laser (cooldown <= 0.11 s; the release rule then waits for the full charge unless lethal); a
   charge cannot be held before the fight opens. Rounds are counted per track; the push uses the current target's count.
6. R7 strafe 'fast75': only the reversal interval changes beyond 75 m (the strafe weight is unchanged).
7. Every chaos rule turns off after the first foreign death, in the late zone (next radius <= 70) and at <= 3 alive.

## 6. Open points for the moderator

- R2's run is cut by a hit inside 100 m in every simulator match; the gain in "laser by 15 s" is 5 -> 8 of 24. If the
  official house bots also arrive early, a looser stop (e.g. only a hit that costs > 10% hp) would give it more reach.
- boostCharge adds almost nothing on top of `boost 'spend'`; it is harmless.
- alpha blocks most openings (alNoOpen counts candidate-decisions); in the simulator it lost kills alone (88) and inside CH1
  (102 against 108). CH1PM lost alive time (1567 s against 1673). Weak evidence; the slot owner decides.
