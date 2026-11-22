# Integration log, pass 1 (integration engineer, Opus sub-agent; started 06:53 UTC Sat Nov 21)
Base: bot/lib identical to tools/brain_fix/base_lib (the first fixer left no change). Tests at start: brain 29/29, world 39/39 (to confirm).
Format: ID | status (done / changed / rejected / pending) | note
## progress checkpoint 1 (07:35 UTC): code edits in flight, not yet tested
- params.js rewritten: D2/D3/D4/D6/D7/D9/D10/D12 numbers, PRESETS + SELECT + resolveParams (one string = one change), salt.
- senses.js: own body >= cube formula (0.6), track clamp to bounds +-200 m (0.7), hpPrev reset after a gap (1.10), steadiness / airborne per track, enemy bullet tracking + per-shooter magazine count (D4), kill-drop list (1.7).
- tactics.js: D0 hostility, D5 selectTarget (drones lexicographic 1.5, torso veto as target rule 1.9, null-crash gone 0.1), D3 LOSING/HEAL decideMode (1.1, 1.2, 1.8), hide cells away-side + commit + arena wall (1.14, N5), head-only exposure (R2 #3).
- mover.js: plan with full budget, partial-path rule, replan 2 s (1.6), D2 dead-band standoff, D4 strafe U(0.8,1.6) + extra flips, bullet dodge, D9 zone goal/triggers, pocket exit via hopPlan (0.0), boost refill hysteresis (0.4), progress re-goal (1.6, V9), arena clamp.
- firecontrol.js: readyCd 0.10 + per-tick gun latency (1.0), aim ladder (D8), D2 flight gate (1.15), ballistic airborne lead (R2 #4), laser hand-off 80% (D8), noCharge release (1.18).
## checkpoint 2 (08:05 UTC): brain.js rewritten (fuse, rehearsal, legs); suite 28-29/29 with doctrine-updated tests
Test changes forced by Doctrine V4 (old expectation -> new): zone boost "every decision with energy" -> arrival <= 0.8 x walk time,
boost whenever energy >= 60, <= 4 bursts (finding 0.4 refill rule); heal "resumes above 90%" -> resumes at healExit 70% (D3);
offer cases -> D7 order; ambush clock starts at 45 s (D0 opening guard: a pursuer without a line is not hostile); last stand
"doomed -> LAST-STAND" -> D3 (cover near: LOSING retreat still shooting; no cover: LAST-STAND at the quickest kill, never still);
environment "beams latch" -> D12 (3 foreign deaths before 200 s; beams only with the beamClue preset).
Interpretation: D12 "16 - alive" uses the first alive count seen (16 in a real match; the micro-arena reports 1 + enemies).
## checkpoint 3 (08:30 UTC): 28 new checks added (group `fix` in tools/test_brain.js), all passing in isolation
Section A, the 32 reviewer findings (status / note):
- 0.0 pocket exit | done | mover.pocketExit + zone length via nav.hopPlan (prototype adopted) + ledge launch after 1.5 s (new: landing on a 4-cell ledge looped). t_bowl seeds 2,4,8,9,11,13,15: all out, zone damage 0. Test fix 0.0.
- 0.1 selectTarget null crash | done | V formula gone (D5 scoring), no null deref. Test fix 0.1.
- 0.2 airborne boost | done | finishLegs: no boost in the air except pocket hop / stuck jet. Test fix 0.2.
- 0.3 wall-clock gates | done | all planMinMs/optMinMs/slowMs/budgetScale removed; fuse (30 ms into act) only guards hide search / posEval, counted. Test fix 0.3/1.11.
- 0.4 boost pulsing | done | refill hysteresis to boostRefill 55 (zone legs). Test: updated zone boost check (bursts <= 4).
- 0.5 setBody spikes | done | warmBodies at start-up (12 sizes x2, base restored). Test fix 0.5.
- 0.6 own body size | done | max(stats, cube formula). Test fix 0.6.
- 0.7 far tracks | done | track positions clamped to bounds +-200 m. Test fix 0.7.
- 0.8 bot.js | done | fallback boost grounded-only, slot 1 only lightning, obs before end answered. Test fix 0.8. Logged in lib_bug_reports.md.
- 1.0 trigger cadence | done | readyCd 0.10 + per-tick gun latency. 48 shots/20 s, gap 0.236 s. Test fix 1.0.
- 1.1 LAST-STAND in winnable fights | done | only < 25% hp with >= 2 attackers (3 s) and no cover / final shrink; bastion stop removed. Tests fix 1.1/1.2 + rewritten last-stand check.
- 1.2 early break-off | done | D3 LOSING table literal, 5-point hysteresis, 1.5 s minimum; hE / tau*A / mustDisengage removed. Test fix 1.1/1.2.
- 1.3 no jink in reload vs laser | done | `relocating` removed. Test fix 1.3.
- 1.4 second weapon rarely taken | done | D6 power grab (laser 60 m / others 35 m, any hp, in contact) + out-of-contact pickups at any hp 120 m. Test fix 1.4.
- 1.5 drone steals target | done | drones lexicographically below mechs in contact. Test fix 1.5.
- 1.6 partial path flip-flop | done | pathExpand 25000, partial paths that gain < 10 m dropped, replan 2 s, progress re-goal (3 s / 5 m), failed zone plan = late. Test fix 1.6.
- 1.7 kill cubes left | done | kill-drop list; cubes near it valued x1.5 in grabs (70/40/12 m) and loot. Test fix 1.7.
- 1.8 HEAL thresholds | done | D3 entry < 55% (or < 90% within 6 s of LOSING), exit healExit 70%. Test fix 1.8.
- 1.9 torso veto parks the torso | done | veto is a target rule in selectTarget (finishable/<25% kept 1.5 s); aim clamp no longer called. Tests fix 1.9 + old veto check (worst 1.6 deg).
- 1.10 loose FFA latch | done | D12 literal + hpPrev reset after a gap. Test: rewritten environment check.
- 1.11 = 0.3 | done.
- 1.12 late zone | done | from nr <= 70 legs converge on the next centre, strafe only inside; final shrink goal = moving centre; zone goal 0.5 R. Test fix 1.12.
- 1.13 idle standing | done | SQUAD idle roams the 0.5 R band at full speed (arena-wall aware), farming crates 150 m / drones 170 m. Test fix 1.13.
- 1.14 hide cells | done | away-side (60 deg cone) rule, hidden from the 3 s lead position, commit until exposed 0.5 s, no boost in the first second of a new cell. Test fix 1.14.
- 1.15 D0/D2/D5 | done | hostility (4 s / aim 12 deg + line inside 160 m, 1 s memory), candidate rule, flight-time gate. Test fix 1.15.
- 1.16 ranges | done | D2 bands by loadout + laserRange preset. Test fix 1.16.
- 1.17 bullet dodge | done | closest-approach dodge (0.9 s, r + 1.2 m, weight 0.9), per-shooter magazine count, extra flip at magazine start / laser charge. Test fix 1.17.
- 1.18 laser kept in dodge | done | release when noCharge unless full within 0.1 s. Test fix 1.18.
- 1.19 supply drop | done | D6 timing/limits/contest. Test fix 1.19.
- 1.20 upgrade order | done | D7 list in PARAMS.upgradeOrder. Test: offer check rewritten.
- 1.21 dead params | changed | dead STANCES fields / rehitS / relocateMin / evalRays / anchor* / coverShare / lootAimRange / npcDpsIn deleted; re-hit rule not built (D3 HEAL < 55% makes it rare); peek cycle not built (FFA only).
- 1.22 lightning energy | done | guard applies with the gun too; retreat boost floor lightReserve + 10. Test fix 1.22.

## Section B: DOCTRINE V4 (status / note)
- D0 | done | hostility = damaged us 4 s / aims within 12 deg with a line inside 160 m (1 s memory against torso-sweep flicker, PARAMS.hostileAimMemS); first 40 s only hostile mechs are candidates; return fire at once.
- D1 | n/a | opposition model (informs the numbers).
- D2 | done | gun 75 (55-95, full stick in, 0.7 out, always strafing); laser preset far 150 (125-185, back off < 125, boost away < 90 m at energy > 30) / mid 115 (100-130); lightning without laser 28 m, boost in from < 90 m at energy > 70, lone target only; no SQUAD lightning-carrier rule; flight-time gate 0.55 s unless steady 0.6 s (|dv| < 2) or ballistic.
- D3 | done | LOSING table literal (+5 pt hysteresis, 1.5 s minimum, finish exception < 20% with <= 2 threats); retreat = hide cell away from every mech with a line, zone first; HEAL entry/exit as written. Interpretation: after a LOSING retreat the < 90% heal holds at least until 6 s after the retreat ended, then exits at healExit.
- D4 | done | bullet dodge (closest approach of each visible gun bullet vs our planned motion, 0.9 s, r + 1.2 m, perpendicular walkable side or brake/reverse, weight 0.9, held 0.3 s); strafe U(0.8,1.6) preset `strafe`; extra reversal at an enemy magazine start (first bullet after >= 2 s silence, bullets attributed to the listed shooter by back-projection) and at a laser charge aimed within 0.25 rad; hard floor 0.4 s between flips; no jump dodging; their reload (12 bullets, 2.5 s) shortens our band to hold + 5 m (approach); laser charge -> hide cell within 6 m (9 m boosting).
- D5 | done | candidates + score as written (x2 finishable by remaining magazine + ready beam, x1.6 hit us in 3 s, x1.3 current, x1.15 mortar holder with our laser); target < 25% never dropped for a fresh one; drones below mechs in contact.
- D6 | done | farm at hp >= farmHp (preset) out of contact, crates <= 150 m path (shoot from 30 m), drones <= 170 m (38 m, leave to 75 m under 50%), stop at 210 s or 10 cubes + laser, no roof loot (> 2 m above terrain); power grabs (cube memory 40 s, 70/40/12 m; laser 60 m without one, others 35 m); kill cubes at once; no waiting in a drop ring; drop rules (unheld, 250 m, arrive <= 3 s early, leave when a mech is within 60 m, 70 m once landed).
- D7 | done | laser > lightning > mortar (mortar only after 60 s with nothing better seen; replaced by anything); SQUAD keeps the gun; FFA latched + preset ffaPair: laser + lightning, gun dropped; never swap a charging laser; upgrade order in PARAMS.upgradeOrder.
- D8 | done | trigger at cooldown <= 0.10, lead for the tick the shot leaves on; swing-on gate on the predicted aim; ladder 0 / +2 / +3.6 m (scaled); lead from our predicted position; laser hand-off at 80% charge; charging continues while retreating; blind fire 1.5 s behind canopy (kept).
- D9 | done | goal at 0.5 of the next radius; triggers (outside, > 0.9 r, > 0.8 nr while shrinking or time-to-shrink < path time + 12 s, travel margin); from nr <= 70 converge on the next centre and fight from there; final shrink: the moving centre.
- D10 | done | no clock in decisions (fixed counts: one A* of <= 25000 expansions per decision, 300-ray hide slices, posEval every 0.3 s); fuse at 30 ms counted in debugState.counters.fuse (0 in every run so far); start-up rehearsal 400 synthetic decisions (~0.3-0.4 s) + setBody warm-up; PARAMS.salt mixed into the seed.
- D11 | partial | done: no voluntary fight before 90 s, afterwards only finishable / wounded (< 50%) mechs not aiming at us; farming only with no mech within 150 m (no crates with a mech within 320 m); LOSING below 55% with any threat; FFA heal exits at 90% (patient heal); posts at 0.45 R; never walk at an enemy (no approach, no chase); keep 50+ m from a lightning carrier. Not built: third-party timing (4 s after a duel), laser-carrier corner rule, break-sight 5 s then turn, boost-rarely rule, hider/rusher counters, M5/M9/M11.
- D12 | done | (alive0 - alive) - ourKills >= 3 before 200 s (alive0 = first count seen = 16 in a match); beam clue preset off (beam ending within 6 m of a mech that then loses hp, twice); latch time in debugState.ffaLatchT and the log.

## Section C (status / note; conflicts with Doctrine V4 resolved for the doctrine)
redteam_practice.md:
1 laser late | done | D6 grab 60 m in contact, out-of-contact pickups at any hp to 120 m. CONFLICT: 130 m in contact -> D6 60 m.
2 pocket | done (A 0.0). 3 doomed | done (A 1.1). 5 idle/economy | done (roam band, crates 150 m, drones 170 m).
4 beams | partial | D4 charge reaction + extra flip; the posEval +80 "hidden cell within 8 m of every laser holder" not built.
6 heal while pursued | done (D3); "turn the corner into an ambush instead of resting" not built.
7 dodge | done per D4. CONFLICT: 0.35-1.05 s interval / 0.4 s floor -> D4 U(0.8,1.6) default, preset strafe=fast (0.45-1.15); 0.4 s is kept only as the physical floor between flips.
8 hostile-only | done. 9 wall clock | done. 10 first magazine | done (D2 gate). 12 damage split | done with D5 25% (CONFLICT: 40% -> 25%).
11 far band | CONFLICT: default mid -> D2 default far kept, preset laserRange=mid; "never back out of a line" not built.
13 latch | done. 14 answer time | measured (below). 15 cubes past 10 | done (only within 3 of an upgrade threshold).
redteam_final.md (final / FFA):
1 opening contact-break | not built for SQUAD (D0: practice hunters come anyway; owner decision); D0 target guard done.
2 visibility | partial (FFA: no crate fire with a mech within 320 m). 3 latched posture | partial (OFFENSIVE only at <= 4 alive or kill-secure).
4 hostile memory | changed: 1 s aim memory; CONFLICT: sticky 20 s rejected (D0 says 4 s). 5 LAST-STAND < 25% | done; cover leash not built.
6 FFA economy | partial. 7 concealment map | not built. 8 NEUTRAL default | not built (CONFLICT with D0/D12 SQUAD default).
9 FFA heal 0.7 | CONFLICT: D11 patient heal -> FFA exit 0.9. 10 last four | not built. 11 FFA band 0.7-0.85 | CONFLICT: D11 0.4-0.5 wins.
12 strafe seed readable | not built. 13 latch | done. 14 pockets | done.
tactics_update_r2.md:
1 idle rule | done: preset idlePull off (CONFLICT: its "no anything-after-20 s" -> D5 third clause kept). 2 final point | done as the D9 moving centre; E_i race not built.
3 head-only exposure | done (0.1 SQUAD / 0.5 FFA). 4 airborne lead | done (+ x1.3 target score). 5 belief-lite | not built.
6 latch | done + preset gunlessClue (off); ignoredClue not built. 7 FFA stance table | partial. 8 FFA economy/concealment | partial.
baseline_parity.md MUST rows that were missing: F6 trigger (done), N5 arena wall 30 m (done: goals clamped, cells rejected), E10 beam-origin phantom (done),
V9 goal not getting closer (done), C5 cube memory 40 s (done), Z1 leave time from path length (done), F9 ballistic lead (done), G4 rehearsal (done), G5 (done), G7 presets (done).
A3/A4 (FFA hide-first, opening) partial as in D11.

## Final verification (09:05 UTC)
- tools/test_brain.js 57/57 (29 original, 6 of them rewritten for Doctrine V4 as listed in checkpoint 2, + 28 new `fix` checks); tools/test_world.js 39/39.
- Stream replay with the real map: mean 0.20-0.24 ms, p99 5-8 ms, max 9-12.5 ms. Closed-loop scenarios max < 17 ms.
- tools/package.sh: hygiene clean; conformance PASS with the real map (300/300 in time, p99 4.8, max 9.8 ms under the 1-CPU quota) and without it (p99 2.6, max 8.5 ms).
- Simulator (uncalibrated), 20 squad matches seeds 1-20: mean score 4.20 +- 0.57 (old brain tools/brain_fix/base_lib on the same seeds: 3.50 +- 0.59);
  deaths gun 10, laser 5, lightning 4, drone 1, zone 0; stuck events 0, no-progress re-goals 5, fuse trips 0, stage errors 0, late answers 0,
  false FFA latches 0, slowest decision 9.3 ms. Runner with brain counters: tools/squad_counters.js <P> 1-20.
- FFA sanity (8 matches): no errors, latch at 3 foreign deaths, mean score 10.9.

# Fix round after verify1 (integration engineer, Opus sub-agent; started 07:54 UTC Sat Nov 21; times below are real `date -u`)
Base snapshot: tools/fix2/base_lib (bot/lib as handed over by verify1). Items: F1 D4 dodge, F2 D5 keep, F3 D6 kill cubes, F4 late zone, F5 hide cells.
## checkpoint F1-F3 (07:59 UTC): code changed, suites not yet rerun
- F1 D4 dodge | done | mover.bulletDodge: threat test and side choice now use an accel-limited prediction (ground_accel from our real velocity, 0.05 s steps over dodgeHorizon) instead of an instant velocity; the side is the walkable perpendicular with the larger predicted miss (often the reverse of the planned motion the shooter led), brake/reverse only when both sides are blocked or no better; blend() with a zero dodge now brakes instead of renormalising back to the old command. tools/fix2/f1_dodge.js (exact-intercept bullet, 18 moments): hits 50 m 18->18 (physics: 1.2 m max displacement in 0.2 s), 75 m 15->2 (base 15->10), 100 m 12->0 (base 12->13), 130 m 9->0 (base 9->11). verify1 s10_jink_v: hits 75/100/130 m 49/16/8% (dodge off 76/63/49%; base 75/64/52%).
- F2 D5 keep | done | tactics.selectTarget veto block: vetoT set before the test (first veto decision now keeps), a target < keepTargetHpf (25%) is never vetoed, a finishable one is kept vetoKeepS from the first veto decision. verify1 d5_keep_veto PASS (40/40 'a' both orders); s03_aimveto: kill-secure mech is the target on 170/170 (was 0/170), worst off-target trigger 1 deg.
- F3 D6 kill cubes | done | new PARAMS.killCubeR 200: our kills' cubes reach 200 m in LOOT and in grabs at hp > grabHpf (40 / 12 m limits unchanged below 50% / LOSING). verify1 d6_killcube_range PASS: gun 90 m collected 8.0 s, laser 150 m 13.1 s (15.8 s with a second hunter).
## checkpoint F3b/F4 (08:08 UTC)
- F3 refinement | done | simulator squad 1-20 showed the plain 200 m reach walking 100 m into three hunters (seeds 10 / 11: 6->1, 12->6; mean 3.80 vs 4.35 with killCubeR 70). The long reach now needs B.threats <= killCubeThreats (1) and no other mech within killCubeClear (60 m) of the cube; otherwise the 70 m D6 grab reach. d6_killcube_range still PASS (8.0 / 8.0 / 13.1 / 15.8 s). Squad 1-20: 4.40 (base 4.20).
- F4 late zone | done | mover.lateLeash(): anchor = zoneGoal (next centre; final shrink: the moving centre) + radius max(8, 0.35 nr) cut to stay radius + 2 m inside the circle 1 s ahead. Used by fightLegs (stand on the anchor when < 3 m, walk in when outside, leashStrafe inside: strafe reverses at the leash edge), holdLegs (roam inside the leash, stand when < 6 m) and zoneCheck (late trigger "far" = outside the leash + 2 m, inGoal = inside it). walkable(): in late zones never step to a point within radius + 1 m of the edge that is worse than ours. s04_zone_late: A alone 0 hp / 0 outside / 2 switches (was 104 hp, 36), B 312 hp / 8 switches (was 585, 78), C 286 hp / 10 (was 442-585, 72-80); final-shrink > 3 m from the final centre 112 / 153 / 152 of 240 (was 53 / 212 / 214; the D9 anchor is the moving centre, so this metric counts the designed offset). Remaining B/C damage = last ~1.2 s with the enemy body on the closing centre.
## checkpoint tests (08:15 UTC)
- Regression tests: new group `fix2` in tools/test_brain.js (4 checks: F1 paired led-bullet dodge 100/130 m, F2 keep-under-25% with an attacker behind (both orders) + veto control, F3 kill cubes at 90 / 150 m + no 70+ m grab into two hunters at the kill spot, F4 late zone on the real map through tools/review_tactics/scen.js). Against tools/fix2/base_lib F1-F3 FAIL (19/24 hits with the dodge; 'B' flips; cubes not collected); F4 base = 104 hp / 36 switches alone, 585 hp / 78 with the enemy (thresholds 30 hp / 6 and 400 hp / 16).
- F5 hide cells | measured, not changed | current code, squad 1-20 (tools/fix2/f5_hide_why.js, stats3.js): exposed retreat episodes ending > 10 m closer to the attacker 8/74 = 11% (verify1 21%, original 13%) and 5/53 in an earlier run; moving toward the attacker 81/996 = 8%. Hide-leg reach 16/103 = 16% (base 15/85 = 18%): the median cell is 46 m away (quartiles 23/46/65 m) because of the 1.14 constraints (60 deg away-side cone + hidden from the 3 s lead position), and most non-arrivals end when LOSING ends (D3) or a shell dodge / escape leg interrupts (counted as a new episode). Retreat spans that reach a cell or break the line >= 1.5 s: 32/77 = 42% (base 28/83 = 34%). Variant tools/fix2/var/h3 (the 1.14 "or a clearly better cell exists" re-search every 1 s while heading) raised the reach to 19/93 = 20% but scored -0.2 (seeds 1-20) and -0.1 (21-60) in the simulator: not adopted.
- Note: full-hp targets on opposite sides that both hit us still ping-pong through the veto (pre-existing; F2 control test only asserts the attacker wins most decisions).
## F1 follow-up (08:20 UTC)
- bulletDodge candidate score now counts every approaching bullet (hit = -1000, miss up to 2 rr) instead of the single worst miss, and bullets with ta < 0 (already past us) are ignored: one bullet passing at s = 0 made all candidates equal and masked a real threat. f1_dodge unchanged (75 m 15->2, 100 m 12->0, 130 m 9->0); s10_jink_v 49/18/8% (dodge off 76/63/49%).
- verify1 d4_dodge_dbg still prints FAIL 4/9 -> 3/9: the 3 remaining hits are the 50 m shots (0.2 s flight; ground_accel 58.5 m/s2 allows at most ~1.2 m sideways vs the 2.8 m hit radius, so no dodge exists); the 120 m led shot goes 0.24 -> 7.37 m and the 120 m at-position shot 3.67 -> 5.71 m.
## Final numbers (08:20 UTC)
- tools/test_brain.js 61/61 (57 + 4 new fix2 checks); tools/test_world.js 39/39 (world/nav unchanged this round).
- Simulator squad seeds 1-20: mean 4.15 +- 0.61 (base 4.20; paired -0.05); seeds 21-60: 4.05 +- 0.31 (base 3.60; paired +0.45). Counters 1-20: stuck 0, no-progress 8, fuse 0, errors 0, latched 0, max 8.8 ms, zone deaths 0, lates 0.
- tools/package.sh: hygiene clean, conformance PASS with the map (300/300, p99 4.6, max 8.7 ms under the 1-CPU quota; 3 earlier runs p99 3.3-4.5, max 8.4-11.2) and without (p99 2.7, max 8.1).
- Determinism: verify1 determinism.js match seed 1: warp 1 twice and warp 3 identical (2d9dd79cf8e89f88, fuse 0); salt 7 differs; warp 10 tripped the 30 ms fuse once and changed the hash (documented D10 fuse; at 10x any > 3 ms decision trips it).
- verify1 repros: d5_keep_veto PASS, d6_killcube_range PASS, s03_aimveto 170/170, s04 as in checkpoint F4.
- Files changed: bot/lib/mover.js (bulletDodge, blend, walkable late guard, lateLeash, leashStrafe, zoneCheck late trigger), bot/lib/tactics.js (veto keep), bot/lib/economy.js (kill-cube reach + killReachOk), bot/lib/brain.js (fightLegs / holdLegs late zone), bot/lib/params.js (killCubeR 200, killCubeThreats 1, killCubeClear 60, zoneLateLeash 8, zoneLateLeashFrac 0.35, zoneLateEdge 2), tools/test_brain.js (group fix2). Base snapshot tools/fix2/base_lib; scripts and outputs tools/fix2/.

# pass 2a (merge engineer, Opus sub-agent; 08:21-08:55 UTC Sat Nov 21; times are `date -u`)
Scope: counter module (counters_hookup.md) + counters_2696_addendum.md parameter changes (the file existed at start), dossier
section 5 rules and section 3 archetypes with the section 6 corrections, the D11 items pass 1 left undone. Everything FFA-only:
every new decision runs only while `B.env === 'FFA'` (and preset `ffaRules` / `ffaCounters`, both 'on' by default; each 'off'
is a one-change submission). Base snapshot: tools/pass2a/base_lib (bot/lib as at 08:21), base_bot.js; scripts and outputs tools/pass2a/.
## Wired (status | note)
- Counter module, hookup steps 0-10 | done | params ffaCounters/counterParams + preset; newTrack cxMult; createCounters in createBrain
  (B.cx, B.cxCtx); stage 'counters' after sense; counterAdvice() in assess (ctx, rank, dodge, breakLos); selectTarget step 4 (respond-only /
  avoid block first shots, attack may open inside its band, x targetMult); stance steps 5 (holdFirst, avoid -> DEFENSIVE, attack -> OFFENSIVE);
  fightLegs step 6 band + rush guard; step 7 beam hide outside FIGHT (used only when ffaRules is off; with the rules on, rule 1's budget
  version replaces it); mover dodgeW() step 8 (0.5 = the D4 weight exactly); fillThreats step 9 (rank first, no duplicates); debugState step 10.
  Change to hookup step 4/5: rule 8 wins, a finish (<= 40%) is never blocked by respond-only advice.
- Addendum | done: K2 FFA-only (aim-hostility after 3 decisions in a row, at once if its laser charges at us; SQUAD version = preset
  aimDwell=on, off by default), K3 (counters HD/finish: hider-read mech <= 40% not facing us -> attack, band 60-150), K4 (beam clock, rule 1),
  lesson 2 preset laserRange=far170 (145-195, off by default). Not built: K1/K5/K7/K8/K9 (signature-specific), K6 drop overwatch,
  openGuard75/75q and lesson 3 boost-back (SQUAD-affecting one-change candidates).
- Module corrections (dossier M3/M4/M5/A6/A7, section 6) | done in counters.js: brLevel 2 (BR capped at opportunistic; test_counters rusher
  expectation changed to 'opportunistic'), hdWoundHpf 0.5 -> 0.4, HD/harvest gated at its hp <= 40%, FM/strike gated at its hp <= 50% or a
  fight in the last 30 s and never on a 13-16 m crate stop (lootD tracked), at <= 6 alive a gun-carrying hider reads GS (HD/strafer).
  Not built: M1 (A4 archetype), M9 spinner flag, M10, M13.
- New bot/lib/ffa.js (decisions) + decision-neutral bookkeeping in senses.js (flag first tick / drop / seen, measured charge time from a
  first-tick flag to its beam, cubesKnown) — all read only in FFA:
  rule 1 | done | hide budget = charge time - 0.1 s from the first flag tick (measured, else cube bound 0.75 / 0.56 / 0.42 s, unknown 0.42);
    beam-hide reach = budget x speed (half speed, no boost while our laser charges), else D4 jink only; react cone 0.3 rad; beam clock: no
    re-exposure to a laser holder (lzhold) until its beam / flag drop (+1.65 s) or the 2.9 s / 4.3 s timers (0.6 s peek, our laser ready,
    hp > 50%, 12 s cap), back to a hide cell within 12 m when exposed to a ready laser outside a window (lzcover); finishes exempt.
    Not built: "trade only from a cell with a hide cell in reach" as a cell score (the evaluator has no cover term).
  rule 2 | done | charge 0.4 rad off the target (side kept), swing on at 80% charge, gun silent while charging. Not built: the 2.5 m caveat.
  rule 3 + D11 third-party timing | done | first shot: finishable / <= 40% / busy (torso within 0.2 rad of another listed mech <= 230 m) for
    1.5 s and < 50% hp, > 75 deg off its aim, 60-190 m and beyond 45/60/75 m by cubes (M14), hide cell within 6 m / duel survivor (busy
    with a mech that vanished at a foreign death) within 4 s, < 50%, no other listed mech within 120 m; exits (aim within 0.5 rad of us,
    opponent < 15%, a second line) block it for 5 s.
  rule 4 + 10 (+ 9, 8d) | done | B.ffaBreak: a hostile non-finish, non-rusher mech, or two lines with a hostile, or < 50% hp with a listed
    mech within 200 m with a line (< 65% within 115 m) -> DISENGAGE (fire not held) until 20 m from the last-seen point, then HEAL may run,
    break ends 9 s after last seen (30 s cap); exempt: late zone (nr <= 70), OFFENSIVE, last stand, kill-secure / finishing, our lightning
    brawl, no cover found.
  rule 5 | done | lightkeep: back straight off any lightning carrier inside 50 m (or closing > 12 m/s for 0.5 s: boost to the hide cell)
    unless we hold lightning and >= its hp; fightLegs floor uses the same exception. Not built: "along cover".
  rule 6 | done | sub-second reverser (median gap < 0.95 s over 3 s) only under 0.3 s of flight; steady waiver capped at 0.8 s. Not built:
    the one-magazine limit of the waiver.
  rule 7 / D11 hp race | done | from 390 s in the final phase (nr <= 0.5) zoneGoal = next_center, leash 0 (stand on it); ZONE, fight and
    idle legs agree. Rule 7's centre-parker counter (hold cover 30-140 m) conflicts with the ordered hp race and is not built before 390 s.
  rule 8 | done | torso 0.3 rad off a calm mech (track look, held first shot); no loot / grab / roam goal within 45/60/75 m of a calm mech.
  D11 boost rarely | done | FFA boost only in ZONE, the hop, shell dodge, beam hide, lightning cover, exposed hide/retreat (break sight).
  D11 hider counter | done | farm gate ignores a confident (>= 0.5) HIDER read >= 120 m away that is not aiming at us; no loot within
    120 m of a hider; finish late = HD/finish. Rusher counter | done | no break-sight from a BR read (do not run), BR band 30-160 from the module.
  Archetypes (dossier section 3) map: A1 -> rule 1/2 + LK; A2 -> LZ (brk with laser) + rules 1/5; A3 -> rule 5; A4 -> rules 4/8 (no module
  read, M1); A5 -> GS + rules 3/4; A6 -> HD + hider counter; A7 -> FM (gated); A8 -> rule 6 steady waiver (no read); A9 -> superseded by the
  ordered hp race.
- Forced-FFA brains (env preset 'ffa', tests) start with B.env 'FFA' on the first decision (auto / squad unchanged).
## SQUAD identity evidence (tools/pass2a/record.js; base_lib vs bot/lib; tools/pass2a/out/identity_final.txt)
- Byte-identical action logs: kit stream env=squad (300), long4800 (seed 7), long11 (seed 11), long23p (seed 23, perturbed config), each
  4800 decisions, env=auto and env=squad (none of the long streams latches); 6 simulator squad matches seeds 1-6 closed loop
  (1064 / 1180 / 840 / 854 / 741 / 589 actions, scores 10 / 8 / 3 / 4 / 2 / 1, identical hashes).
- kit stream env=auto latches FFA at tick 498: the 249 pre-latch actions identical; first difference at tick 518 (FFA, expected).
- In-suite guard: test_brain `ffa` group check 1 (kit stream SQUAD with ffaCounters/ffaRules on vs off identical; module inert).
## Tests: tools/test_brain.js group `ffa`, 16 checks, all env-forced FFA scenarios (micro-arena, real-map arena, synthetic feeds)
SQUAD identity; module wired (HIDER read, avoid, rank); hider counter (farm with a hider at 140 m: 49 vs 0 decisions; cube near it left);
rule 1 budget (measured 0.70 s, bounds 0.75/0.56/0.42); beam clock (11 state cases); rule 2 (0.40 rad median off-axis, beam hits; SQUAD
0.002); rule 3 / timing / rule 8 gate (13 cases); rule 4/10 (break at 100.3 s, fired while exposed, unseen 9.3 s, 95 m moved; SQUAD fights);
rules 9/8/4 triggers; rule 5 (min 52 m vs SQUAD 27 m); rule 6 (0 shots at a 0.7 s reverser vs 19 SQUAD); rule 8 courtesy; boost rarely
(0 vs 20); hp race (0.4 m from next_center vs 2.5 m SQUAD); K2 dwell; module corrections.
## Suites and conformance (08:50-08:55)
- test_brain 77/77 (61 + 16), test_world 39/39, test_counters 15/15 (rusher expectation updated, M3).
- tools/package.sh twice: hygiene clean (owner's case-insensitive grep: only the pre-existing headExposure); conformance PASS with the map
  (300/300 in time; p99 12.7 / 4.6 ms, max 13.4 / 14.2 ms) and without (p99 9.3 / 3.6, max 15.2 / 8.6). The bundle now carries the module's
  archetype / reason strings (hookup section 6). A/B timing kit stream (core 2): base p99 8.3-9.0 ms, new 8.3-9.0 (auto) / 8.7-9.0 (FFA).
- Streams in FFA (env forced): 0 stage errors, fuse 0, max 17.6 ms. Simulator FFA sanity (4 matches each, uncalibrated, info only): rules on
  scores 11/15/15/3, off 15/13/10/3, errors 0, fuse 0; seed 4 died before the latch with identical hashes on/off.
- Files: bot/lib/{ffa.js (new), brain.js, tactics.js, stance.js, mover.js, firecontrol.js, economy.js, senses.js, params.js, counters.js},
  tools/test_brain.js (group ffa), tools/test_counters.js (one expectation). bot/bot.js unchanged.

# pass 2b (merge engineer, Opus sub-agent; 09:24-10:15 UTC Sat Nov 21; times are `date -u`)
Base snapshot: scratchpad/snapshots/bot_pass2a (bot/ as at 09:24; byte-identical to snapshots/bot_pass2a_lead; sha256 list
scratchpad/snapshots/bot_pass2a.sha256). Final hashes: tools/pass2b/bot_final.sha256. Scripts and outputs: tools/pass2b/.
Every change has its own PARAMS switch / preset (SELECT defaults below); preset `pass2b: 'off'` (applied last) turns every
one of them off at once = the pass 2a behaviour (proved below).
## Merged (switch = default | note)
- R1 loot stealing a-e (lib/steal.js, copied unchanged from req_bot except the gate posture) | `R1: 'on'` (stealOn) in both
  postures | hooks hand-merged into the live economy.js / tactics.js / brain.js (the patch's economy hunks 1 and 3 and four other
  hunks no longer applied after fix2 / pass 2a): kept the live `killReachOk(c) ? killCubeR : grabCubeHi` reach, dropped
  deathCubeR; R1c = kill-cube memory 90 s with stealOn.
- R1 crate-shooting gate | `crateGate: 'ffa'` (crateGateOn, crateGateSquad false): FFA only, crateMechR 120, crateQuietS 2;
  SQUAD keeps the D6 farming rules (presets: 'all' = SQUAD too, 'off').
- R2 late-game scan (lib/scan.js unchanged) | `R2: 'on'`. Merge conflict resolved: the sweep pre-empted pass 2a's track look,
  so rule 8's courtesy (torso 0.3 rad off a calm mech) died in the late game (test_brain ffa group failed). The nearest-mech
  track look (with the courtesy offset in FFA) is now one of the sweep's wishes, like the corner pre-aim and the look hint.
- R3 laser head aim | `R3: 'on'` (headAimOn): laser ladder 0.8 / 0.65 / 0.5 / 0.35 / 0.2 of target height, first clear rung,
  asymmetric pitch gate. Gun: unchanged D8 centre-first ladder (new switch headAimGun false; preset R3=gun gives the
  prototype's gun ladder from gunLadderTop 0.65).
- R3 online calibration (lib/aimcal.js unchanged) | `aimCal: 'off'` (aimCalOn false): merged and tested switched on, OFF by
  default because our own beams are not reported to us (mechanics_deep.md section 1: obs.beams = beams "by another mech";
  play.js and the simulator agree), so it would learn nothing. With it off the laser lead / command are computed exactly as
  in pass 2a (no wrapPi on the yaw).
- 2696 counters (counters.js, addendum 6.2) | C1 finish rail `cxFinish: 'on'` (finOn); C2 kiter ramp 70 / 100 `cxKiterRamp: 'on'`
  (brain passes lkR0/lkR1 to createCounters; module defaults stay 80 / 110); C3 LASER_BRAWLER `cxBrawler: 'off'` (lbOn; LB/dash
  also gated by lbDashAlive 0). All three act only through FFA advice (module inert in SQUAD).
- Farm-first opening | `openFarm: 'on'` (openFarm, openFarmCubes 10, openFarmT 75, openFarmAnswerR 100, openFarmFfa false):
  until 10 cubes or t >= 75 s (ends for good) no mech is a candidate except one that damaged us from within 100 m (range at
  its hit, tr.dmgInD) in the last 4 s (hostileDmgS); the torso veto and R2's rear pick obey the same rule. A hostile mech with a
  line on us, or a mech hit in the last 1 s, while we have no mech target -> DISENGAGE (break the line: hide cell / retreat
  legs); once no line for openFarmQuietS (1 s) the loot gate reopens without the 3 s quiet wait, D6 farming as before.
  Interpretations: SQUAD posture only (openFarmFfa false: after a latch the FFA rules decide; in a real final the gate runs
  until the latch); a non-hostile mech in view is not run from (otherwise R1a steals in the opening die); no line-breaking in
  the late zone (nr <= 70: the zone owns the legs; F4 late-zone test flapped 98 times without this). With openFarm off the
  bot is identical to pass 2a (below).
- check2a FAIL rule 3 | `ffaThirdFix: 'on'`: stance.js holdFirst no longer holds a target that ffa.firstShotOk granted (rule 3 /
  D11 duel survivor, kept for the 10 s rule 3 window until an exit clears thirdT) or a rule 8 finish (finishable / <= 40%).
  The lone 38% calm mech is now shot at 0.7 s (was held to 5.0 s). Note: the checker's own harness finds only one spot in seeds
  701-799, so its rule 3 check can never reach n = 2; tools/pass2b/ffa_scen2b.js widens the seed range (spots 761, 1339).
- check2a FAIL rule 4 | `ffaBreakFix: 'on'`: ffa.breakLegs() inside a rule 4 break: (1) standing on the hide cell but still in a
  line for 0.4 s (the cell point is hidden, 0.3-0.9 m off it the head shows; vision = centre or top) -> settle 2.5-6.5 m deeper
  to a point hidden at centre, 0.9 h and top (sliced, <= 96 rays a decision), else mark the cell bad; (2) out of sight -> move
  >= 22 m from the last-seen point along a straight walk whose end and 1/3, 2/3 points are hidden; (3) then stand still; no
  M10 escape walk during a break (it crossed open ground). The 9 s now count from the first decision out of sight and must be
  exceeded; if no hidden 20 m walk exists (2 tries) the 9 s alone end the break.
- Decision time | (a) rehearsal 800 SQUAD + 800 forced-FFA decisions (rehearseN, new rehearseFfaN; was 400; ~1 s more init,
  init 1.9-2.1 s); (b) `hidePlanCap: 'on'`: the A* for a hide cell is capped at max(2000, 0.4 L^2) expansions (L = max(40, 2.5 d),
  the length above which the path is rejected anyway); a capped search that fails rejects the cell the same way (ffa3 ticks
  2948-2968: a full 25000-expansion A* every decision, 14-20 ms -> <= 5.5 ms); (c) Dockerfile BUN_JSC_useConcurrentJIT 0 -> 1
  (still one DFG thread, no FTL): the remaining spikes were synchronous DFG (re)compiles of sense / fire at fixed decision
  counts (15-25 ms, the check2a 24.5 ms); (d) bot.js waits 600 ms after building the brain (inside the 20 s hello budget) so the
  background compiler finishes the rehearsal's work before the first observation (without it the concurrent compiler throttled
  the first 300 answers to 12-49 ms under the quota). (c) and (d) are an engine-setting change: one line each to revert.
## SQUAD identity with every new switch off (tools/pass2b/identity.sh; snapshot lib vs bot/lib with select pass2b=off)
Byte-identical action logs (cmp of the files, tools/pass2b/identity_final.txt): kit stream squad 300 (7605aee309d6863c) and auto
300 (8f40c0318971a666, incl. the post-latch FFA part), long4800 / long11 / long23p 4800 each in squad and auto (6c8da3f85c69c1aa,
edfc37b03b0cbc34, 4917a044b5b835ad = the pass 2a hashes), 6 simulator squad matches seeds 1-6 (1064 / 1180 / 840 / 854 / 741 /
589 actions, scores 10 / 8 / 3 / 4 / 2 / 1, same as pass 2a); fuse 0 everywhere.
## Tests (taskset -c 0)
- test_brain 83/83: the 77 old checks run with openFarm off (they script fights with mechs inside the first 75 s, which the
  gate forbids by design; TB_SELECT='{}' runs them with the plain defaults), every other default on; + group `pass2b` (6 new,
  plain defaults): openFarm answer / break / end at 75 s / end at 10 cubes / openFarm off; farming resumes after the line breaks;
  crate gate posture; defaults + pass2b=off wiring; rule 3 on the real map (2 spots, ffaThirdFix off = held); rule 4 (3/3 spots
  >= 20 m and >= 9 s unseen; fix off 0/3).
- test_world 39/39; test_counters 15/15 (module defaults: finOn on, lbOn off, ramp 80/110).
- test_requests 12/12 (copied to tools/ with arena_req.js; tools/arena_micro.js got the one `e.hz` line). Adaptations: imports
  ../bot/lib; FFA runs get a zone whose 0.45 R post band passes through the start (the live FFA idle legs walked away); smart
  shooting tested with crateGate=all; calibration with aimCalOn true; R1b victim at 40 m and 12/11 alive reported (the arena's
  3 alive is the R2 late game, whose sweep looked away at the death); R1b expects >= 2 cubes + laser (the survivor walking at
  the drops aims at us and turns hostile under D0 / K2); R1d at t 80 (after the gate). Merge conflict resolved: a kill drop we
  reach first (R1b, its own survivor test) is no longer blocked by FFA rule 8 / hider pass (ffaBlocked).
- check2a scenario copies (tools/pass2b/ffa_scen2b.js): rule 3 PASS (2 spots), rule 4 PASS (3/3). Dev simulator
  tools/check2a/rule4_sim.js: spots 403 / 405 now break sight 13.7 / 13.9 s (405 no longer loops to the 30 s cap); 401 / 402 / 404
  end through the finish exemption (our return fire takes the standing shooter to <= 40%) before the 39-65 m hide cell is reached.
## Timing (decision time, one core, Dockerfile engine settings; tools/pass2b/timing2b.js, timing_e0_e1.txt)
- FFA streams ffa1-4 + kit, 2 runs each: max 10.2 ms (p99 4.2-4.5); with the old engine setting (useConcurrentJIT 0) the same
  code still had 15-22 ms compile pauses (ffa2 / ffa3). Before: 24.5 ms (check2a).
- 1-CPU quota, check.py answer times (tools/pass2b/quota_*.txt): FFA streams max 3.1-5.1 ms in 7 of 8 runs, one 20.1 ms (old
  setting: 6.8-29.9); kit stream max 2.8-12.1 ms in 13 of 14 runs, one 80.3 ms with one late answer (package run 1; old setting
  had one 55.8 ms late answer in 6 runs). This machine's quota numbers are noisy.
## Simulator sanity (taskset -c 0,1, defaults on, uncalibrated, information only; tools/pass2b/sanity_out.txt)
- 6 squad (seeds 1-6): scores 6 / 5 / 2 / 4 / 1 / 2 (mean 3.33; pass 2a 4.67; openFarm off 4.00), errors 0, stuck 0, zone deaths 0,
  false latches 0, fuse 0, slowest 2.7 ms; steals 1, R2 rear faces 7, gate ended at 75 s (69 s with 10 cubes in seed 4).
- 4 FFA: scores 15 / 13 / 10 / 4 (mean 10.5; pass 2a 11.0), latched 4/4 at 28-34 s, errors 0, stuck 0, zone deaths 0, breaks 21
  (brk legs used 594 decisions, no-goal 4), slowest 2.3 ms. No simulator gating (owner); the squad drop is reported, not acted on.
## Release tooling
- tools/release_gate.sh: H2 owner grep now 'fare.i|royale|mechfight|\bosu\b|ohio|campus|buildathon|builders|joinbuilders',
  case-insensitive with a word boundary for the short word ("exposure" passes, "OSU" fails); H9-method-exposure still checked,
  the waiver GATE_WAIVE=H9-method-exposure (generic mechanism) documented in the header.
- tools/package.sh: hygiene clean; conformance PASS with and without the map (see package_final.txt). dist/ rebuilt
  (bot.js 196277 bytes, sha256 cb2940d3...; tools/pass2b/dist_final.sha256). Nothing pushed, nothing outside the tree touched.
## Release gate (GATE_WAIVE=H9-method-exposure bash tools/release_gate.sh; tools/pass2b/release_gate_run.txt)
- VERDICT NO-GO (1 FAIL, 34 PASS, 1 waived). The one FAIL is P6-engine-limits: tools/release_gate/pack.py line 14 still
  requires BUN_JSC_useConcurrentJIT=0, i.e. exactly the pass 2b engine change above. Not changed by me (release policy is the
  lead's): accept it by editing that one entry to =1, or revert the one Dockerfile line (then the one-core worst decision goes
  back to 15-22 ms compile pauses). Everything else PASS, incl. H2 with the new grep, R1 official check in the sandbox, R3 p99
  1.2 / max 3.3 ms, R10b long run late 0 of 3939 (p99 4.38, max 10.24 ms), R11 determinism, R11b bundle = source.
- test_brain with the plain defaults (TB_SELECT='{}'): 64/83; the 19 FAILs are old scenarios that script a fight with a
  mech in the first 75 s (gun hit rates, laser, duel, ambush, last stand, stance, weapons, kill drop, D3/D5/D2 fixes, F3):
  under openFarm we do not fight there, by design (tools/pass2b/tb_plain_defaults.txt).

# R3a2 (engineer, Opus sub-agent; 17:38-18:00 UTC Sat Nov 21; times are `date -u`)
Spec: notes/build_spec_r3a2.md (+ top5_synthesis.md, build_spec_r3.md, panel_r3_scenarios.md). Base: bot/ = snapshots/bot_502
(diff -r clean at 17:38). Scripts and outputs: tools/r3a2/. Final source hashes: tools/r3a2/bot_final.sha256.
## Items (preset = SELECT default; first option = 5.02). `SELECT_502` (params.js) lists every changed preset at its 5.02 value;
## preset `r3a2: 'off'` (applied last) does the same in one string.
- P1 `fightEarly: 'on'` (off): sets openFarm false; SQUAD posture opening guard earlyOpenS 20 s while B.foreignDeaths (stance D12
  count, now exported to B) is 0, else openingS 40; new candidate clause `engaged()` in selectTarget (line within engR 240: <= 60 m,
  hit us in 6 s, under 40% within 160, aim within 0.22 rad within 190, closing > 3 m/s within 180). FFA posture unchanged.
- P2 `laserEcon: 'on'` + `laserRange: 'mid'` (far): SQUAD posture, no laser held -> laser pickup value 100 out to 240 m path
  (outranks every loot incl. steals; quiet / zone / drone / reachability gates unchanged); no mortar in SQUAD; laser over lightning
  was already true (tested). In-contact 60 m laser grab unchanged. Note: the mid band is the existing preset, so it applies in FFA too.
- P3 `focus: 'add'` (mult): SQUAD posture cost = dist + 0.1/hp, -200 (<= 30% or finishable), -200 current, -40 hit us in 4 s,
  -15 closing > 1 m/s, -20 mortar holder (laser held), -15 close hopper, +240 no line (the old x0.5 factor, my translation; spec
  silent), drones (d+20)/0.5-20+0.1 hp; tr.index = 1000 - cost; < 25% keep rule and drone ordering kept; torso veto keeps the
  target under 38% or hit by us in 2 s; R2 rear pick FFA only.
- P4 `retreat: 'pulse'` (d3): SQUAD posture, no HEAL; pulseLosing() n = listed mechs <= 160 m: (n>=2, <55%) | (n>=3, <80%) |
  (<35%, target >= ours+10 pts); cancel: target < 25% with our hp > 20% and n <= 2, late zone (nr <= 70), alive <= 3; tail 1.5 s
  after the last LOSING decision; DISENGAGE only with a found hide cell, else fight on. lastStand unchanged.
- P5 `boost: 'spend'` (off): SQUAD posture, in legs() before bulletDodge: FIGHT, grounded, mech target, moving (>= 0.3), boost when
  (laser charging | a line on us | hurt in 1 s) and energy > 30, or a held bullet dodge (mover.dodgeHeld) and > 25. Not during a
  lightning rush and never below lightReserve+10 with lightning (found by the old "second weapons" test: spending drained the
  rush tank). finishLegs vetoes unchanged.
- P6 `farmHp: '50'` (90). P7 `upg: 'speed'` (std): plating, armor, servos, nanites, laser_damage, laser_charge, jets, rest.
- F1 `ffaDropGate: 'on'`: FFA, alive <= 3: contest radius 150 and no drop with a listed mech within 150 m of us.
- Z5 `finalPoint: 'on'`: FFA: raceOn from 375 s (was 390) in the last circle (leash 0 on next_center); a body closer to the point
  -> stand r_us + r_them + 0.4 m from it on the current-centre side; from 405 s the target is the mech with the smallest positive
  E - E_us (E = hp - dps x (415 - exit time), exit sampled every 0.25 s with zoneSlack), else B.topAttacker; never held.
- Z8 `ffaTwo: 'on'`: FFA, alive 2: max hp gap >= 300 WAIT (no first shot except finishes, DEFENSIVE), <= -300 CLOSE (first shot
  only outside its 75 deg wedge and < 60% / reloading / charging away / outside the zone / busy incl. a drone), else DUEL (first
  shot at our estimate me.hp*b / (hp*dps) >= 0.9; stance need 0.9). Granted shots are not held by the DEFENSIVE silence.
- Z9 `ffaThree: 'on'`: FFA, alive 3: no first shot (rule 3 blocked) unless hostile or a finish; never OFFENSIVE unless the
  target is hostile or kill-secure; holdFirst for a non-hostile, non-finish target. D11 duel survivor (3 -> 2) still opens.
- Z10 `ffaGate: 'on'`: FFA: a mech outside the zone with zone dps >= 60, under 60% hp, while our incoming dps <= 100: score x1.5,
  first shot within 190 m with a line (after the Z8/Z9 gates); idle during a shrink with nr > 70: post 25 m inside the next edge
  on the bearing of such a mech outside the next circle (not near a calm mech).
- Not built: optional walk-in finish (default OFF in the spec). DROPPED N2 as specified.
## Identity (tools/r3a2/identity.sh: bot_502 lib vs bot/lib, record2b.js recorder, 14 streams of pass 2b, core 1)
- every R3a2 preset at its 5.02 value (SELECT_502): 14/14 byte-identical (identity_final.txt); `r3a2: 'off'`: 14/14
  (identity_bundleoff.txt); practice items old + all five final-only items ON: 14/14 (identity_finalon.txt: inert in SQUAD
  and in the kit-auto stream's post-latch part).
## Tests (taskset -c 0): test_brain 93/93 (85 old + 8 new group `r3a2`), test_world 39/39, test_counters 15/15, test_requests 12/12
- New (plain defaults vs SELECT_502): P1 185 m aimer / 178 m closer engaged at 20.0 s, none at 12-18 s, none by 25 s after a
  foreign death, 5.02 none; P2 laser at 200 m taken in 17 s over a crate at 40 m (5.02: crate, never), no mortar (5.02 takes it),
  laser replaces lightning; P3 29% target kept 49/49 decisions vs fresh full-hp at 60 m (5.02 switches 30/49); P4 no HEAL (5.02 60
  decisions), last LOSING 51.9 s -> FIGHT 53.4 s; P5 18/18 charging frames boosted above 30 energy, 0/20 below, FFA 0, 5.02 0;
  defaults / V2-V4 selects / servos third; final-only F1, Z5, Z8, Z9, Z10 unit checks; final-only inert in SQUAD (100 decisions
  at 400-410 s, 3 then 2 alive, last circle, a drop: identical on/off).
- Old tests changed only where the spec changes the behaviour: test_brain heal, last stand, fix 1.1/1.2, fix 1.8 -> retreat d3
  (P4); offer -> upg std (P7); presets laserRange compares far vs mid (P2 default); ffa rule 8 calm/finish runs -> ffaTwo off (the
  micro arena reports 2 alive = Z8); groups pass2b and rc -> fightEarly off (P1 turns openFarm off); test_requests R2 engaged ->
  focus mult (P3 moves the rear pick to FFA). No expectation values were changed.
## Simulator sanity (uncalibrated, information only; tools/r3a2/sanity.js, same seeds, R3a2 defaults vs snapshots/bot_502)
- Squad 1-6 (core 1): R3a2 mean 3.50 (5.02 3.33); kills/min alive 2.78 (1.91); first damage on a mech median 16.4 s (36.6 s;
  per seed 16/29/18/27/6/10 vs 22/79/60/28/37/75); alive 75.5 s mean (94.3); FIGHT share 0.34-0.73 (0.17-0.33); boost share in
  FIGHT 0.32 (0.15); HEAL 0 (94); errors 0, stuck 0, fuse 0, zone deaths 0, false latches 0; slowest decision 9.9 ms (8.6).
- FFA 411-414 (core 0): R3a2 15 / 9 / 8 / 14 (mean 11.5) vs 15 / 14 / 4 / 12 (11.25); latched 4/4 at 22-34 s; errors / stuck /
  zone deaths 0; slowest 8.5 ms. First damage 24 / 1.2 / 4.8 / 21 s (5.02: 24 / 10 / 45 / 23): without openFarm the pre-latch
  (SQUAD posture) opening answers D0-hostile mechs at once, which 5.02's farm gate did not; seed 412 died at 56 s (5.02 at 287 s).
  Flag for the lead: openFarm off also removes 5.02's incidental protection of the FFA opening before the latch (V2 keeps it).
## Release: tools/package.sh PASS (hygiene clean; conformance with map p99 3.0 / max 5.9 ms, without map PASS); dist/bot.js 206455
  bytes, sha256 021e65e6... (tools/r3a2/dist_after.sha256). GATE_CPU=1 GATE_WAIVE=H9-method-exposure GATE_SRC=bot
  tools/release_gate.sh dist: GO (35 PASS, 1 waived; R3 p99 1.8 / max 3.2 ms, R10b late 0 of 3939, R11 determinism, R11b bundle =
  source). Nothing pushed; /home/user/kranti-hackathon only read by package.sh (LICENSE, README).
- Variants (one code state, SELECT only): V1 = defaults; V2 = `fightEarly: 'off'`; V3 = `boost: 'off'`; V4 = `retreat: 'd3'`.

# R4a (engineer, Opus sub-agent; 19:30-20:00 UTC Sat Nov 21; times are `date -u`)
Spec: notes/build_spec_r4.md "Build R4a" (section 2), detail from notes/panel_r4_gameplay.md (GP) 1.3-1.4 and the commit / leave
thresholds of notes/panel_r4_past_events.md (PE) 9.2. Base: bot/ = R3a2 with V1 SELECT defaults, snapshotted first to
snapshots/bot_r3a2 (+ bot_r3a2.sha256). Scripts and outputs: tools/r4a/. Final source hashes: tools/r4a/bot_final.sha256.
## Items (preset = SELECT default; the first option of each = R3a2)
- `hunt: 'off' | 'h50' | 'lite'` (hunt50 + h50Pulse | hunt50 only) and `seek: 'off' | 'on'` (seekOn). New lib/hunt.js; hooks: brain
  assess stage `hunt.pre(obs)` before selectTarget and `hunt.post()` after it, holdLegs `seekLegs()` before stance.idleLegs,
  retreatLegs (no M10 escape walk during a pulse); tactics selectTarget `ok` expression (under B.h50.on: band, unengaged and
  engaged() off; candidates = hostile | current target hit < 5 s | commit | tr.h50Ok), losing() commit line right after the FFA
  line, decideMode `B.hunt.pulseUpdate()` after B.tCover and `B.h50Pulse -> DISENGAGE` after doomed; firecontrol one reload line;
  senses newTrack `h50Ok: false`; params 60 new keys (h50*, table 2.1). param_diff (tools/r4a/param_diff.txt): with the new presets at
  their first values no resolved PARAMS key changes; only the 60 new keys are added, hunt50 / h50Pulse / seekOn false.
- Firewall (every hook): B.env !== 'FFA', B.foreignDeaths < h50ForeignMax (1), next radius > zoneLateR (70), aliveN > 3.
- burst3 / TTK / IN / gate / commit / leave / LOSING / pulse / seek as spec 2.2-2.4, PE 9.2 (current target hp; hostile mechs are
  always candidates, as before; commit = picked target if gated, hostile or already committed).
## Interpretations (spec silent or self-contradictory; each one is a choice, flagged here)
1. Prey memory: spec 2.1 says "conf >= 0.25, seen within 12 s" but conf = exp(-age/4) is under 0.25 after 5.5 s, which fails T2
   (8 s ago). Used GP's reading: listed, or seen within 12 s (h50PreyMemS).
2. The seek also obeys the late-zone / 3-alive part of the firewall (T13: identical to off).
3. Leave at "burst3 < 0.3 x hp with the laser cooling > 1 s" applies only with a laser held. Gun only, a fresh hostile gives 405 < 420
   at once, so the commit would flap every decision; gun-only commits leave on death or 3 s without our damage.
4. Pulse: not started when already loaded (it would end in the same decision); while it runs the gun is reloaded below h50MagMin
   rounds (firecontrol), else a 5-7 round magazine never reloads and every kill pulse runs the full 4 s; the M10 escape walk
   (60-80 m away) is skipped so the pulse stays at its near cover. Trigger (b) needs a mech target.
5. Kill cubes first only when the kill point is within h50CubeR (40 m) and <= 1 line; wait >= 0.5 s for the cubes to show, <= 3 s.
6. Sound goal: near / mid -> 120 m, far -> 200 m; origin = our position when heard; bearing = weighted mean inside the loudest of 12
   sectors (weights 1.5 / 1 / 0.3 as senses); arriving within 45 m uses those sounds up (likewise the last-enemy fix, own memory).
7. Ring arrival radius min(45, 0.5 R) (next radius 70-110 m gives R < 45 m; without it the goal spins every decision).
8. Arriving inside 125 / 90 m of the prey we stand (moveTo arrive) with the torso on it; bulletDodge still applies.
9. Lag: stance updates B.foreignDeaths after the target choice, so the firewall closes one decision after the first foreign death
   is seen (the same lag as R3a2 P1's opening guard).
## Identity (T14; tools/r4a/identity.sh: snapshots/bot_r3a2 lib vs bot/lib with hunt off, seek off; the 14 R3a2 streams)
- V1 SELECT: 14/14 byte-identical (identity_V1.txt). V4 SELECT (retreat d3): 14/14 (identity_V4.txt).
## FFA inert (T15; tools/r4a/ffa_identity.sh + record.js: kit + check2a ffa_s1-4 in auto and forced FFA, sim FFA 411-414)
- hunt h50 vs off: V4 14/14, V1 14/14; lite (V4) 14/14; seek on (V4) 14/14. In auto posture the hunt was open for 150-255
  decisions before the first foreign death in each stream / match and changed nothing there (opening guard to 20 s, deaths at
  15-25 s). Caution: a first parallel run showed 2 differences that were fuse trips (decision > 30 ms on the loaded machine; the R3a2
  snapshot itself gives another ffa3 hash when its fuse trips): rerun one at a time, fuse 0 everywhere, identical.
- Foreign deaths before the latch, squad seeds 1-20 (V4 + h50): 1 of 20 (seed 19 at 74.8 s) = 5%, not more than 5%: h50ForeignMax stays 1.
## Tests (taskset -c 0): test_brain 108/108 (92 old, unchanged + 16 group `h50`), test_world 39/39, test_counters 15/15, test_requests 12/12
- h50: T1 burst3 513/486/405/405/0, 5 cubes 616, +laser 828/720/315, +lightning 993 (1%), gate words of GP T1; T2 remembered 300 m
  8 s -> HOLD 'hunt' goal at it (seek on too; off roam; 55% roam); T3 mid gun at 1.0 rad -> goal (64.8, 101.0); T4 ring R 123, 30.0 deg
  steps; T5 700 hp at 170 over 1400 at 150, nearer at 150/250, hostile -80, laser +60, roof skipped (real map); T6 gun-only fresh 1400
  at 80 m: 0 shots (h50, lite; off 16), 600 hp current -> engaged; T7 aim / hit -> answered at once; T8 400 dps lines, hp 600, TTK 2.65
  -> shut, 40 dps -> open; T9 commit 45% / 2 lines FIGHT (V4 and V1 without: DISENGAGE), 24% DISENGAGE, 3 lines 39 / 41%; commit /
  leave unit checks; T10 kill + 1 line, cover 1.0 s -> DISENGAGE 60.0-62.4 s (reloaded), 4.0 s cap without reload, cover 2.5 s none;
  T11 lite none; pulse (b) spent + 2 lines; T12 / T13 FFA, foreign death, late zone, 3 alive: h50 and seek identical to off (control
  differs); presets.
## Simulator sanity (squad seeds 1-6 per variant, taskset -c 0,1, uncalibrated, information only; tools/r4a/sim_*.txt)
| variant | score | kills/min | alive s | HOLD roam | HOLD hunt | kill->next dmg mean (>= 9.8 s) | commits / pulses |
|---|---|---|---|---|---|---|---|
| V1 | 3.50 | 2.78 | 75.5 | 15.9% | - | 5.76 s (7/20) | - |
| V4 | 3.83 | 2.97 | 77.3 | 15.4% | - | 5.10 s (7/22) | - |
| H = V4 + hunt h50 | 3.00 | 2.33 | 77.3 | 11.3% | 3.6% | 5.24 s (4/17) | 49 / 7 (12.6 s) |
| HL = V4 + hunt lite | 3.33 | 2.58 | 77.6 | 11.6% | 3.9% | 5.29 s (5/20) | 45 / 0 |
| S = V4 + seek on | 3.50 | 2.60 | 80.9 | 10.6% | 3.3% | 4.64 s (5/20) | - |
- H seeds 1-20: 3.70, kills/min 3.02, gap 3.42 s; seeds 1-10: 2.90, 2.51, roam 12.3%, gap 4.99 s. Every run: errors 0, stuck 0, fuse 0,
  zone deaths 0, false latches 0, at most 1 A* per decision. T16 criteria met (roam below V4, gap mean below 5.8 s); the kill rate in
  this uncalibrated simulator is lower for H / HL / S on seeds 1-6 (it has misjudged within-bot deltas six times): not a verdict.
## Timing (T17; one core, Dockerfile engine settings; tools/r4a/timing_streams.txt, huntcost.txt)
- Streams (env squad, hunt open 52-60% of decisions): p99 change <= +0.7 ms vs V4, max not above V4's (machine noise 9-41 ms on
  both sides), at most 1 A* per decision. Hunt module itself (sim seeds 1-6): mean 0.010 ms, p99 0.065 ms, max 4.1 ms (the max is the
  seek's own moveTo plan, which replaces the roam's).
## Release: tools/package.sh PASS (conformance with map p99 1.8 / max 4.0 ms, without map PASS); dist/bot.js 216928 bytes, sha256
  d3197183... (tools/r4a/dist_after.sha256; built with the defaults = R3a2 V1 behaviour). GATE_CPU=1 GATE_WAIVE=H9-method-exposure
  GATE_SRC=bot tools/release_gate.sh dist: GO (35 PASS, 1 waived; R3 p99 6.4 / max 7.0 ms, R10b late 0 of 3939, R11, R11b).
  Nothing pushed; /home/user/kranti-hackathon only read by package.sh (LICENSE, README).
- Arms (one code state, SELECT only): H = `retreat: 'd3', hunt: 'h50'`; HL = `retreat: 'd3', hunt: 'lite'`; S = `retreat: 'd3', seek: 'on'`.
