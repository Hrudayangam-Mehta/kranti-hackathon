# Fable chaos: independent QA of the six aggressive bundles

Written Sun 22 Nov, 04:01-04:25 UTC by the QA agent. Everything below was re-run or re-read by QA; nothing is taken from the
engineer's report. Machine: 4 cores, load 5-8, other jobs running. Every recording and simulator match: `nice -n 19`,
`fuseMs 1e9` on both sides, at most 2 jobs. No git, no game server. S = the session scratchpad.
QA files: `S/fable_work/chaos/qa/` (scripts, recordings, probes, conformance and unit output). Nothing else was written; the
trees, builds, `switch`, `r7work`, `variants6` and `mechbot/bot` were only read.

## Verdict per build

| Build | Verdict | Reason |
|---|---|---|
| CH1_s1 | PASS on integrity and safety; one behaviour check FAILS | Every build, identity, T-F2, conformance, timing and word check passes. Three of the four behaviours fire in the simulator. The opening laser run does not deliver: a laser is held by 25 s in 5 of 12 matches (5.38 base: 3 of 12), not in most. |
| CH1_s2 | same as CH1_s1 | Differs from CH1_s1 in one byte of the bundle (the salt). Forced FFA equals `FNV_s2` on 8 sources. Not simulated. |
| CH1_s3 | same as CH1_s1 | One byte (the salt). Forced FFA equals `FNV_s3` on 8 sources. Not simulated. |
| CH1DL_s1 | PASS, inherits the CH1 finding | All checks pass. dropLife changes 8 lines in 2 of 30 sources against CH1 and nothing in simulator seeds 1-6, so it is almost inert here. |
| CH1AL_s1 | PASS, inherits the CH1 finding; weak in the simulator | All checks pass. Seeds 1-6: 18 kills against 30 for CH1 (the engineer's 24 seeds: 102 against 108). No collapse, errors 0. |
| CH1PM_s1 | PASS, inherits the CH1 finding; weak in the simulator | All checks pass. Seeds 1-6: 19 kills against 30 for CH1 (24 seeds: 93 against 108, 106 s less alive). No collapse, errors 0. |

No build fails a build, identity, gating, conformance or hygiene check. The failed item is one of the four behaviours QA was
asked to see: "laser held by 15-25 s in most matches". The simulator cannot rank the bundles; its kills are a sanity read.

## What was checked

| Check | Result |
|---|---|
| Tree freeze | `out/tree_ch1_freeze.sha256` and `out/tree2_freeze.sha256`: 21 of 21 files match in each. |
| Build source against tree | CH1_s1-3 and CH1DL `bot/` differ from `tree` only in `lib/params.js`; CH1AL and CH1PM differ from `tree2` only in `lib/params.js`; there only the salt line and three SELECT lines. `tree2` differs from `tree` in brain, firecontrol, mover and tactics (86 diff lines, the R6 and R7 code). |
| Rebuild | 6 of 6: `bun build --minify --target=bun` from `builds/<name>/bot` gives the sha256 of `dist/bot.js`, equal to READY.txt / READY_addons.txt and the log. |
| SELECT | 6 of 6: 65 keys; values equal the 5.38 SELECT plus exactly the logged changes; salts 1, 2, 3, 1, 1, 1. Resolved parameters of CH1_s2/s3 differ from CH1_s1 only in `salt`; CH1DL only in `dropLife`; CH1AL only in `alpha`; CH1PM only in `pauseMove`, `isoDwell`, `strafeFarR`. |
| Identity at old values | `tree/lib` and `tree2/lib` with the 5.38 SELECT, every new preset at its old value, salt 1, against `variants6/FNV_s1/bot/lib` as it stands: 30 of 30 sources byte-identical each (62,129 decisions), fuse 0, errors 0. |
| T-F2, unit | `test_chaos.mjs` 35/35 on tree and on tree2, `test_chaos_r6.mjs` 9/9 on tree2, `test_switch.mjs` 36/36 and `test_tf2.mjs` 13/13 on both trees. Each new preset value has a scene in the full form (acts in SQUAD, forced FFA identical, one foreign death identical): 11 scenes in test_chaos, 3 in r6. |
| T-F2, real sources | Each new value alone (focus kill, laserGrab spawn, cubes snow, laserRange midsq, boostCharge on, farmHp 50sq, cratePath 80, upg laser, alpha on, strafe fast75, upgFix on) and each of the six bundles: 0 changed lines on 8 forced-FFA sources (19,344 decisions). |
| Conformance | `run_check.sh base` and `v3dir`: PASS for all six, `world=true nav=true brain=true`, errors 0, slow 0, 0 answers over 50 ms; worst answer 6.1-13.7 ms. No rerun was needed. |
| Worst decision, kit stream | Best of 3 runs per build: 2.0-4.2 ms wall, 2.7-4.5 ms CPU (5.38 reference 5.3 wall, 3.8 CPU). Fuse 0. |
| Forbidden words | The owner's grep from `release_gate.sh` prints nothing for all six `dist` folders. No local path, no comment except the `// @bun` header, no "fable", "chaos" or "coach". |
| Simulator, 12 seeds, CH1_s1 | Errors 0, fuse 0. 58 kills, 895 s alive (5.38 base on the same seeds: 49 kills, 895 s). |

Identity sources (30): the kit stream (auto, squad, forced FFA); long4800, long11, long23p (squad, auto, forced FFA); ffa_s1-4
(auto, forced FFA); simulator squad seeds 1-6 and FFA seeds 411-414.

The engineer's numbers reproduce: my simulator seeds 1-6 give the same answer hash as his `out/sim` metas for base, CH1,
CH1DL, CH1AL and CH1PM, and his table recomputes from his metas (base 95, CH1 108, CH1DL 111, CH1AL 102, CH1PM 93).

### Changed lines against the 5.38 reference (30 sources)

| Build | Sources that differ | Changed lines | Forced-FFA sources |
|---|---|---|---|
| CH1_s1 | 22 | 22,086 of 62,895 | 0 of 8 |
| CH1DL_s1 | 22 (against CH1: 2 sources, 8 lines) | 22,090 | 0 of 8 |
| CH1AL_s1 | 22 (against CH1: 19 sources, 14,761 lines) | 23,251 | 0 of 8 |
| CH1PM_s1 | 22 (against CH1: 19 sources, 9,918 lines) | 21,735 | 0 of 8 |

## Behaviours in the simulator (12 squad seeds, CH1_s1 bundle source; base = `FNV_s1`)

| Behaviour | CH1_s1 | 5.38 base | Reading |
|---|---|---|---|
| Laser held by 15 s / by 25 s / ever | 5 / 5 / 6 of 12 | 3 / 3 / 4 of 12 | Fails "most matches". |
| Laser releases; below full charge; of those on mechs | 109; 21; 19 | 69; 20; 18 | Partial releases happen, at the base count. |
| Cubes gained within 12 s and 30 m of our kill | 47 of 73 cube gains | 35 of 57 | Corpse pickups fire. |
| Corpse-rush decisions (rush grab near the last kill, 8 s) | 908, in 12 of 12 matches | 0 | Fires. |
| Walk-in episodes; ended with the target dead within 2 s | 34, in 12 of 12 matches; 29 | 0 | Fires. Only 2 of 34 came within 26 m; the median closest distance is 61 m. |
| Spawn sweep, torso turn in the first 3 s | at least 6.7 rad in 8 of 12 | - | In the other 4 an attacker or a target came first, as coded. |
| Firewall on | 97% of decisions | 95% | The rules were live almost all match. |
| Mortar taken | 0 of 12 | 0 of 12 | |
| Lightning taken | 1 of 12 (at 41 s) | 5 of 12 | The 40 s rule acts. |

Why the laser run misses (per seed, `qa/diag.js` and `qa/diag2.js`):
- Seeds 3, 4, 6, 12: no ground laser was seen before 25 s. No rule can fetch what is not seen.
- Seeds 5 and 10: a laser was known at 174 m and 102 m from the first second, but a house bot had a line on us from 150 m.
  The run only acts through the out-of-contact loot chooser (3 s without contact and no incoming damage estimate), so the
  bot held and then fought. No damage had been taken; the plan's two stop rules had not fired.
- Seed 7: the run boosted from 142 m to 32 m of the laser, then ZONE mode took the legs at 14.8 s and walked away from it.
  No laser, 1 kill (base 2).
- Seeds 1, 2, 8, 9, 11: laser held at 14.3, 6.6, 5.7, 4.1 and 1.6 s. The run boosted in 5 of 12 matches (2, 7, 8, 9, 11);
  seed 1 got its laser without a run boost. The base holds one by 25 s in seeds 8, 9 and 11.

## Code against the coach's plan

| Rule | Trigger and numbers | Gate | Finding |
|---|---|---|---|
| R1 target cost | dist + 0.1 hp, -200 at hp <= 30%, -200 our target within 2 s, -40 hit us within 4 s: as planned. Kept from 'add': +240 without a line, the drone cost, the torso veto. | SQUAD + firewall | Matches. |
| R1 partial laser | 0.7 x estimate >= hp from the minimum charge. It replaces today's factor 1.0 with the rear multiplier. | SQUAD + firewall | Matches the plan's number, but it releases later than the 5.38 build, not earlier. |
| R1 blink hold | Phantom-track path keeps the charge 1.5 s. | SQUAD + firewall | Counter `fkBlink` read 0 on 30 sources and 12 matches: no measured reach. |
| R1 walk-in | Target < 38%, our hp > 42%, lines <= 2, hold 20 m, band 14-26 m, no boost. | SQUAD + firewall | Matches. The flag is set before the grab legs can take the decision, so `fkWalk` also counts grab decisions: 15 boosted decisions in seed 2 were grab rushes, not the walk-in. |
| R2 sweep | min(2.5, 0.3 x turn rate) rad ahead until 2 pi - 0.15 or 2.2 s. | SQUAD + firewall | Matches. |
| R2 laser run | Value 100, 240 m of path, crates within 45 m, ends at 25 s or on a tracked mech's hit from <= 100 m. | SQUAD + firewall | **Narrower than the plan**: also needs "out of contact". This is the main reason it misses (above). Disclosed in the log, section 5 item 3. |
| R2 mortar, lightning | Mortar never; lightning refused while laser-less before 40 s. | SQUAD + firewall | Matches. |
| R4 corpse | 8 s after our kill, lines <= 3, items within 25 m of the kill, path max(120 m, normal reach), rush flag. Also grab floor 0.5 -> 0.25 and threats 1 -> 3. | SQUAD + firewall | Matches. The floor and threat changes are the engineer's additions, logged. |
| R5 midsq | Hold 115, band 100-130, boost-away 70. | SQUAD + firewall | Matches. `laserBackOff` is read nowhere, so midsq equals 'mid' while the firewall holds. |
| R5 boostCharge | Laser charging, a line on us or hurt within 1 s, energy > 30. | SQUAD + firewall | Matches. 7 decisions on 30 sources; almost no reach beside `boost: 'spend'`. |
| R8 farmHp 50sq, cratePath 80 | Farm at 50% hp, crates within 80 m of path. | SQUAD + firewall | Matches. farmHp 50sq changes 0 lines on all 30 sources. |
| R8 upg laser | plating, armor, laser_damage, laser_charge, plating, nanites, gun_rate, gun_damage, then today's order. | SQUAD + firewall | Matches. A third plating keeps the rank of the second entry (above nanites). With upgFix the two mortar ids become `mortar_reload`, `mortar_velocity`. |
| R6 alpha (tree2) | Reload at <= 11 rounds after 0.4 s without a line; open only with a full magazine, ready laser, <= 130 m; rear-facing opener x1.5; push to max(20, dist - 30) during the 2.5 s reload. | SQUAD + firewall | Matches as the log reads it ("full charge" = laser ready). |
| R7 fast75 (tree2) | Reversal interval U(0.45, 1.15) s beyond 75 m. | SQUAD + firewall | Only this part of the plan's rule 7 is new; "attackers in the front 180 deg" and "peek with cover" are not built. |

Every new branch tests `B.env !== 'FFA'` and `hunt.firewall()` (no foreign death, next radius > 70, more than 3 alive).

## Findings

1. **The opening laser run under-delivers.** 5 of 12 matches hold a laser by 25 s against 3 of 12 for the base. Two causes
   are in the code (contact gate, zone abort), one is the map (no laser in view in 4 of 12).
2. **"Forced FFA unchanged" does not mean "FFA matches unchanged".** With `env: auto` all 9 free-for-all sources differ from
   the base, 6 of them from the first decision (the sweep), all before the FFA latch. Simulator FFA seeds moved both ways:
   411 1 -> 4 kills, 412 1 kill / 223 s -> 0 / 64 s, 413 2 -> 1, 414 0 -> 2. Four matches prove nothing. The log states this.
3. **The stated reason for `midsq` holds.** The existing `laserRange 'mid'` changes 5 of my 8 forced-FFA sources; `midsq`
   changes none. The existing `farmHp '50'` changes none of the 8 either; the gate on `50sq` is by code reading only.
4. **Small reach.** boostCharge, farmHp 50sq and the blink hold change almost nothing measurable. They are harmless.
5. **The add-ons are not supported by the simulator.** CH1DL is near-inert; CH1AL and CH1PM score below CH1.
6. **Carried over from the switch QA.** `dist` holds `bot.js` and the Dockerfile only (no LICENSE, no README). Every bundle
   prints the `upgrade order: unknown ids ...` line on stderr at match start.

## Not checked

- The 24-seed runs were not repeated in full; seeds 1-12 for base and CH1 and seeds 1-6 for the add-ons were.
- CH1_s2 and CH1_s3 were not simulated; they were only compared on forced FFA and by the one-byte bundle difference.
- The bundles were not replayed against their source decision by decision; the rebuild hashes tie each bundle to its folder.
- The 0.7 release factor was checked by code reading and the engineer's unit scene FK3, not by an independent scene.
- Timing was measured with the fuse off under load; wall-clock spikes up to 311 ms in recordings are load, CPU stayed under 9 ms on the kit stream.
