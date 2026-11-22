# Verify pass 1 — independent verifier (Opus sub-agent), 07:25-07:55 UTC Sat Nov 21
Scope: the integration pass 1 brain (bot/lib brain modules as of 07:23, unchanged during the run). Nothing under bot/ was edited
by the verifier; during the run someone else changed bot/Dockerfile (07:38, FROM pinned to a digest; engine lines identical) and
bot/lib/counters.js (07:36; not imported by brain.js, not in the bundle). All scripts: tools/verify1/
(common.js helpers; outputs next to them; reproductions in tools/verify1/repro/). Cores 0-1 only.

## Verdict
Determinism, D0, D3, D5 (scores), D6 gates/grabs/drops, D7, D8, D9 units, D12, both suites, timing, memory, conformance and
the 20 squad matches all PASS. 24 of the 32 findings re-run as fixed; 1.18 and 1.22 by own checks; 1.21 as logged.

## FAIL list (reproduce with: cd P; taskset -c 0 ./bun <script>)
1. D4 bullet dodge has no effect (finding 1.17). tools/verify1/d4_dodge_dbg.js: 4/9 led bullets hit with or without the dodge;
   commanded move unchanged (A[0.06,-1.00] vs B[0.05,-1.00]) while bulletDodges counts. tools/verify1/s10_jink_v.js: hits taken
   75/64/52% at 75/100/130 m with the dodge vs 76/63/49% with dodgeHorizon 0. Cause: mover.js bulletDodge sidesteps to "the side
   we are already moving toward" = the planned motion the shooter led.
2. D5 "never leave a target under 25%" (finding 1.9). tools/verify1/d5_keep_veto.js: 15%-hp finishable target dropped for a
   full-hp attacker 180 deg away (single-decision flips, then for good after vetoKeepS 1.5 s; B.vetoT = -1 makes the first veto
   decision ignore the keep). tools/review_tactics/s03_aimveto.js: the 120-hp kill-secure mech is the target on 0/170 decisions.
3. D6 kill cubes (finding 1.7). tools/verify1/d6_killcube_range.js: after a gun kill at 90 m or a laser kill at 150 m the cubes
   are not collected in 25 s, even alone (kill-cube reach is grabCubeHi 70 m). stats2.js --matches 20: 41/82 kills give no cube.
4. Late zone (finding 1.12). tools/review_tactics/s04_zone_late.js: alone 104 hp zone damage (was 26), with an enemy on the centre
   442-585 hp, ZONE<->FIGHT switches 72-78 (was 37-43), 212-221/240 final-shrink decisions > 3 m from the centre.
5. PARTIAL, hide cells (finding 1.14). tools/review_tactics/stats2.js / stats3.js --seed 1 --matches 20: 15/85 hide episodes reach
   the cell (18%, was 31%); 14/68 exposed retreat episodes end > 10 m closer to the attacker (was 13%).

## Notes (not failures)
- integration_log.md checkpoint times (07:35 / 08:05 / 08:30 / 09:05 UTC) were later than the clock at 07:25; not real times.
- D2 gun "hold 75" is a dead band: from 150 m it stops at 95 m, from 40 m at 56 m. Laser boost-away and back-off look only at
  the target, not at any mech (D2 says "a mech"); laserBackOff is never read.
- D10: the 30 ms fuse is the one clock dependence left: 40 ms stalls on every 5th decision change the match (score 7 vs 6).
- 1.5: drone no longer steals the target, but with a drone behind us the 1 v 1 is still lost 4/8 (58 rear hits).


## 4a. Test suites (core 0)
- test_brain.js: PASS 57/57 (6.2 s wall). Output: tools/verify1/out_test_brain.txt
- test_world.js: PASS 39/39 (15.4 s). Output: tools/verify1/out_test_world.txt
- Note: integration_log.md checkpoint times (07:35, 08:05, 08:30, 09:05 UTC) are LATER than the clock when this
  verification started (07:25 UTC); file mtimes are 07:20-07:24. The log's timestamps are not real.

## 1. Determinism (tools/verify1/determinism.js; outputs determinism_out.txt)
Closed loop = one simulator squad match, every action JSON hashed. Open loop = the kit stream (300 obs).
- Same seed twice (seeds 1, 3, 11; kit stream): byte-identical (e.g. seed 1 hash 6be1c114bd2419c2, 641 decisions). PASS
- CPU hog (busy loop pinned on the same core 0): seeds 1, 11 identical to the reference hashes. PASS
- Clock running 3x and 10x fast (every decision looks 3x / 10x slower): identical (seed 1 at 10x: 1 fuse trip, same hash). PASS
- One 20 ms stall every 50th decision: identical. 40 ms stall every 50th: fuse 4 / 2 trips, still identical. PASS
- 40 ms stall every 5th decision (fuse 17): actions differ, score 7 vs 6; 40 ms on every decision: first difference at decision 134.
  This is the documented D10 emergency fuse (30 ms): the only clock dependence left. NOTE, not a failure.
- warmup off vs on (rehearsal): identical; --jobs 1 vs --jobs 2 squad 20: identical per seed. PASS
- PARAMS.salt 1 / 7 change the actions (seed 1: 641 -> 786 / 594 decisions, scores 6 / 6 / 3). PASS
- 20 squad matches reproduce the integration table exactly (mean 4.200 +- 0.569, same per-seed rows). PASS

## 2. D-items
### D3 (tools/verify1/d3_losing_heal.js, out_d3.txt): PASS
LOSING table 13/13 rows literal (1 threat 34%/45% yes, 34%/40% no, 36% no; 2 threats 49% yes 51% no; 3-5 threats 59% yes
61% no; 6 threats at 100% yes; finish exception <20% with <=2 threats; 3 threats no finish), hysteresis +5 points,
LOSING keeps shooting, HEAL entry 54% yes / 56% no, exit 0.701 (healExit=90 preset: 0.902), post-LOSING heal window 6 s,
HEAL left when a mech gets a line and we are not LOSING, no hiding at 60% with one threat.
### D5 keep rule (tools/verify1/d5_keep_veto.js): FAIL
A 15%-hp finishable target at 80 m plus a full-hp attacker 180 deg behind: the target flips to the attacker for single
decisions (first veto decision: B.vetoT starts at -1 so `t - vetoT > vetoKeepS` is already true) and is dropped for good
after 1.5 s (tactics.js selectTarget torso-veto block, `vetoKeepS`). D5: "Never leave a target under 25% hp for a fresh one".
Trace (a = 15% target, B = attacker): aaaaaaaaaaaaBaaaaaaaaBaaaaaaaaaaaaaaaBBB. Side effect: with the threats 180 deg apart,
the first-decision flip latches LOSING for its 1.5 s minimum although the finish exception applies.
### D5 positives, D0, D7, D8 (tools/verify1/d5_d7_d8.js, out_d5_d7_d8.txt): PASS
finishable x2 (200-hp mech at 78 m beats full-hp at 60 m; control 1000 hp does not), hostile-first (attacker at 90 m beats
quiet mech at 70 m), opening guard (quiet mech at 60 m untouched before 40 s, target and trigger on the decision it hits us),
aim hostility 150 m yes / 170 m no, drones below mechs in contact, trigger down at cooldown 0.10/0.05/0 and up at 0.15,
upgrade order 12/12 offers, pickups (laser > lightning > mortar, mortar only after 60 s, SQUAD keeps gun, FFA pair drops gun).
### D6 (tools/verify1/d6_economy.js, out_d6.txt): PASS
farming gates 10/10 rows (farmHp 90 and preset 50, t >= 210, 10 cubes + laser, crate 150 m, drone 170 m, contact), roof
crate 5.6 m above terrain not farmed while a ground crate is, power grabs in contact (laser 50 m yes / 75 m no, lightning
30 m yes / 45 m no, cube 60 m at full hp yes, at 45% no, 35 m at 45% yes), kill cubes collected 5.4 s after the kill with the
second hunter still shooting, supply drop started at lands_in 7.0 s (limit 7.4), never when held or contested.
### D2 / D4 (tools/verify1/d2_d4.js, out_d2_d4.txt; d4_dodge_dbg.js, out_d4_dodge.txt)
- D2 gun only: from 150 m stops at 95 m (dead band edge; hold 75 is never approached), from 40 m backs off to 56 m at radial
  stick -0.57; laser far 151 m from 150, 126 m from 100, boost on 28/28 decisions inside 90 m; preset mid 101-130; lightning
  rush to 33 m with boost from < 90 m, no rush with a second hitting mech in sight; long-flight gate 0 shots at an unsteady
  target at 170 m vs 24 at a steady one. PASS (note: "hold 75" is in practice 95 m when the target is farther, 56 m when closer).
- D4 strafe reversals: 33 in 40 s default (U(0.8,1.6) mean 1.2 s), 49 with preset fast. PASS
- D4 bullet dodge: FAIL. Paired runs (identical arenas and brains; brain B also sees one enemy gun bullet): 9 shots (from 50 m
  and 120 m, led on our velocity or aimed at our position, 3 moments): 4/9 hit without seeing the bullet, 4/9 still hit with it.
  The commanded move does not change (k0..k4: A[0.06,-1.00] vs B[0.05,-1.00]) although bulletDodges counts 1-5 decisions.
  Cause: mover.js bulletDodge picks "the side we are already moving toward" (pref = sign(v0 . perp)); when we strafe across the
  bullet's path (the normal stand-off) that side IS the planned motion the bullet was led on, so the blend keeps the velocity.
  The 1.17 test only checks a sideways stick from standstill, so it cannot see this.
### D9 / D12 (tools/verify1/d9_d12.js, out_d9_d12.txt): PASS
zone triggers 6/6 (outside, > 0.9 r, > 0.8 nr while shrinking, shrink in 10 s yes / 100 s no, inside both no), goal (100, 0)
= 0.5 nr on our side, late zone nr 60: converged to 12.4 m from the next centre and fought there (48 trigger decisions, 0 ticks
outside), final shrink goal on the moving centre; latch: 3 foreign deaths -> FFA@70 s, 2 -> SQUAD, our kill subtracts,
deaths after 200 s ignored, env=squad preset holds SQUAD.
### D0 "unlatched = bit-identical to a SQUAD-only build": PASS — squad seeds 1-20, env auto vs select env=squad: 20/20 identical
action hashes (tools/verify1/env_squad_vs_auto.txt).
### Latch in 20 squad matches: PASS — tools/squad_counters.js 1-20: latched 0, env SQUAD in all, stuck 0, noProgress 5, fuse 0,
errors 0, max 9.3 ms (tools/verify1/squad_counters20.txt).
### Latch in FFA vs sandboxed roster bots (8 roster bots via proc:/srv/mech-sparring/run.sh + 7 house; tools/verify1/ffa_roster10.txt): see below.

## 3. Reviewer findings (re-run of each finding's own reproduction; outputs tools/verify1/repro/)
- 0.1 t_select_null2: 0/30 scenes throw with map, 0/30 without (was 30/30). FIXED
- 0.2 t_airborne_boost: after the 1.5 m ledge drop boost held on 1 airborne decision, peak 1.6 m (was 46 decisions, 41.6 m). FIXED
- 0.3 t_gates: 0/3000 differ in every gate variant (gates removed); own clock tests in section 1. FIXED
- 0.4 t_boost_pulse: 1401 m in 90 s, boost 48% after 30 s (was 1197 m, 15%). FIXED
- 0.5 cube_spike: main-thread CPU at resizes 1.2-3.2 ms (was 3.3-9.4 ms on the first resizes). FIXED (note: the bot's own wall
  worst in these runs was 20-76 ms with core 1 shared by a background sim job; re-measured on an idle core in section 4)
- 0.6 edge_cases (cubes 40, stats not scaled) and test fix 0.6: radius 3.75 at 10 cubes. FIXED
- 0.7 t_far_ray: 10 mechs 90 km out: median 0.22 ms per decision (was 22 ms). FIXED
- 0.8 t_botjs 18/18; fallback boost needs grounded, slot 1 fired only for lightning, obs before end answered. FIXED
- FFA latch vs roster bots (seeds 1-10, 8 sandboxed roster bots incl. magic_53f6854, kanyaraasi, ttun, r1ver + 7 house):
  latched in 8/10 at 16.9-26.4 s; the 2 unlatched matches are the ones where we died before 3 foreign deaths (seed 5: 2 deaths at
  25 s, seed 6: first to die at 19.9 s). 0 errors, 0 fuse trips. PASS (note: external bots are not deterministic: seed 1 gave
  178 then 218 decisions in two runs).
- 1.0 s01_cadence: 72 shots / 30 s, gap 0.236 s at 50-150 m (was 64, 0.300 s). FIXED
- 1.1 s08_doomed: aiming-only mechs -> LAST-STAND 0/200 (was at t=0.2 with full hp); s16_duel_matrix 24/24 kills, 0 deaths,
  0 LAST-STAND both facings (was 13/24 and 11/24). FIXED
- 1.3 s09_relocate: relocate decisions 0, 108 lateral reversals during reloads for gun / laser / mortar enemies alike. FIXED
- 1.5 s20_drone_switch: drone targeted on 0% of decisions (fixed), but with the drone 35 m behind us the duel is still lost
  4/8 times (58 rear hits taken; without the drone 8/8). Target steal FIXED; residual loss noted.
- 1.6 s23_partial_path: complete 436-441 m paths with 25000 expansions; s22 seed 156 now dies to gun, not zone. FIXED
- 1.9 s03_aimveto: no parked torso (trigger never down off-target) BUT the 120-hp kill-secure mech east of us is the target on
  0 of 170 decisions after t=3; every shot goes to the full-hp shooter west. Same D5 violation as section 2. FAIL (target rule)
- 1.11 s06_determinism: seeds 6/14/17 x3 identical trace hashes. FIXED
- 1.12 s04_zone_late: FAIL. With an enemy on the next centre: zone damage 585 (passive) / 442 (shooting) hp before the circle
  closes (was 819-936), ZONE<->other switches 78 / 72 (was 37-43: worse), final shrink 212 / 221 of 240 decisions > 3 m from
  the centre (was 189-195: worse). Alone: 5 decisions outside, 104 hp (was 1 decision, 26 hp: regression). fightLegs in the late
  zone moves to the NEXT centre and strafes within max(8 m, 0.35 nr), so inside a < 8 m circle it leaves it, ZONE takes over,
  and the modes alternate. (Part of the B/C damage is forced: the enemy body occupies the centre once r < 5 m.)
- 1.17 s10_jink (re-run with the current parameter names, tools/verify1/s10_jink_v.js; the original overrides jinkLo/jinkHi
  no longer exist so all its variants were identical): hits taken from an exact-lead gun at 75 / 100 / 130 m: 75% / 64% / 52%
  with the dodge, 76% / 63% / 49% with dodgeHorizon 0. The bullet dodge changes nothing (strafe flips do: 93-94% without them
  at 75 m). FAIL (see D4)
- 1.18 s13_charge_zone: the scenario no longer reaches a running charge (no target, charge 0 throughout): inconclusive;
  test_brain fix 1.18 (release on shell dodge) passes.
- 1.19 s21: its drop part reuses one brain with time running backwards (artefact); with fresh brains (tools/verify1/dbg_drop.js)
  lands_in 20/10 s -> no DROP, 4 s -> DROP; D6 check in section 2 passes. FIXED
- 1.20 s21 offers: 0/8 differ from D7. FIXED
- 1.10 s07_ffa_unit: (a) two foreign deaths and (b) re-sighted house bots -> no latch. FIXED
- 0.0 t_bowl seeds 2,4,8,9,11,13,15: all walk out of the bowl (3.9-21.9 s), zone damage 0 (was 7/7 zone deaths). FIXED
- 1.2 stats5 (20 matches): 46 FIGHT->DISENGAGE/HEAL transitions (2.3 per match, was 5.9) at mean hp 0.42 (was 0.82); 37/46 are
  D3-LOSING, the other 8 with no line are HEAL entries at mean 0.48; at most one line and hp >= 70%: 0 (was 110 / 60 matches). FIXED
- 1.4 stats3: 7/7 matches with a laser known within 60 m >= 3 s ended up holding one (was 14/28 never). FIXED (5/20 still end
  with an empty slot)
- 1.7 stats2: 41 of 82 kills gave no cube within 20 s (was 123/174 = 71%; now 50%). tools/verify1/d6_killcube_range.js: after a
  gun kill at 90 m or a laser kill at 150 m the two dropped cubes are NOT collected in 25 s, even with no other mech around.
  Kill cubes count only within grabCubeHi 70 m (economy.js chooseLoot/chooseGrab maxPath), but the D2 bands put our kills at
  55-95 m (gun) and 125-185 m (laser). D6: "Collect the cubes of our kills at once". FAIL (fix test 1.7 only kills inside 70 m)
- 1.8 stats2: HEAL decisions at hp >= 70%: 0; HEAL entered only < 55% (or after LOSING). FIXED
- 1.13 stats2: 0.1 s per match standing in HOLD before first damage (was 15.4 s). FIXED
- 1.14 stats2/3: cell jumps > 6 m 0.35 per match (was 3.1), hide boost 26% (was 39%), exposed retreat decisions moving toward
  the attacker 11% (was 14%) — but only 15 of 85 hide episodes reach the cell (18%, was 31%) and 14/68 exposed retreat episodes
  end > 10 m closer to the attacker (21%, was 13%). PARTLY FIXED
- 1.15 stats2: first gun shot at mean 94 m (was 122 m); shots > 130 m 135/1903 = 7% (was 17%). FIXED
- 1.16 stats5: gun-only FIGHT decisions with a line: < 55 m 34%, 55-95 m 45%, 95-125 m 15%, > 125 m 6% (was 26% in band, 39% at
  95-125). Logic verified in section 2; the 34% under 55 m are simulator hunters walking in. FIXED (note)
- 1.18 own check tools/verify1/f118_zone_charge.js: charge 0.4 s running, then outside the zone: ZONE, laser trigger released on
  3/3 decisions. FIXED
- 1.21 tools/verify1/deadparams.js: 5 of 235 PARAMS keys are still never read (laserBackOff, hideReloadDist, roamStep, ffaThirdS,
  ffaThirdR); re-hit rule and peek cycle not built (as logged). CHANGED as logged
- 1.22 code + test fix 1.22 (0/10 boost decisions under lightReserve + 10 with a mech inside 60 m). FIXED
- D4 extra reversal at an enemy magazine start (tools/verify1/d4_d8_extra.js): 13 extra reversals in the 22 of 30 paired moments
  without a scheduled flip; the rest fall inside the 0.4 s floor. PASS. Laser trigger held on 36/40 LOSING decisions. PASS

## 4. Regressions
- test_brain 57/57, test_world 39/39 (section 4a above). PASS
- Decision time, one core: suite stream replay p99 8.3 ms max 10.0 ms (map); real bot process, Dockerfile engine settings, worst-
  case heavy stream (15 mechs, 10 projectiles), 4800 decisions on core 0: CPU mean 0.48 p99 2.9 p999 12.3 max 15.5 ms, wall max
  15.9 ms, 0 late (tools/verify1/heavy_ref.txt). PASS (note: D10 says "under 8 ms"; about 6 of 4800 decisions are 9-15.5 ms)
- Same 4800-decision run with 3 busy loops on the bot's core: wall max 82 ms (2 late, caused by the hogs) and 0 of 4800 action
  lines differ from the unloaded run (heavy_ref.jsonl vs heavy_hog.jsonl). PASS
- Memory over 4800 decisions: RSS 66 -> 72-76 MB, high-water 88 MB, flat from decision 1000 on. PASS
- 20 squad matches seeds 1-20: mean 4.200 +- 0.569, every row identical to runs/integ1 (jobs 2 and jobs 1). PASS
- tools/package.sh: hygiene clean, conformance PASS with the map (300/300 in time, p99 5.0, max 8.9 ms under the 1-CPU quota) and
  without it (p99 3.0, max 7.1 ms). PASS
- Node 22: conformance PASS (p99 4.6, max 6.4 ms); actions equal to Bun's within 9e-16 (last-bit math differences only). PASS
