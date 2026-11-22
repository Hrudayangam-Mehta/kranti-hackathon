# Build spec R3: the next submission (panel chair, Sat 21 Nov, about 17:40 UTC)

Inputs: `panel_r3_scenarios.md`, `panel_r3_levers.md`, `panel_r3_runtime.md`, `top5_map.md`, `measured_deltas.md`,
`release_candidate.md`, and `bot/lib/*.js` (read only).

**`top5_synthesis.md` did not exist when this was written.** Section 8 is the slot for it. I used `top5_map.md` (our own
note, written 16:55) for the top bots' published choices. That note draws on commit texts and the readable
giddygiddyboy source; I did not open `P/intel`.

Evidence grades:
- [M]: an official A/B result.
- [T]: the published choice of a bot scoring 5.19 or more.
- [1]: one other team's A/B.
- [A]: our arithmetic or model.
- [C]: the evidence is contested.
- [N]: no evidence.

Gains are practice-board points unless marked. The gains do not simply add up.

## 0. Decision in brief

1. **The next build (R3a) changes the practice score.** It bundles five practice changes. Each one is the choice that the
   bots above us (5.19 / 6.06 / 6.31) made where our bot differs from them. One FFA-only fix rides along. All six sit
   behind presets, so the same code yields four submissions in the first hour (section 5). Those four give the bundle,
   its two riskiest parts in isolation, and a re-roll.
2. **Every slot after that is a draw.** The top teams push one build every 10 minutes, so their 6.0-6.3 are best-of-many
   scores. At a draw sigma of 0.15-0.2, 16-32 draws add +0.26 to +0.41 (levers panel, lever 1). The true-strength gap is
   therefore nearer 0.5 than 1.3. The bundle has to close about +0.3 of it, and the draws close the rest.
3. **The final-only work waits for build R3b** (Sunday, ready by about 10:00 UTC): the 2-alive and 3-alive play, shadow,
   pull-through, the final point, and the zone-side entry. It must leave SQUAD play bit-identical so that it keeps the
   chosen practice score.
4. **Rust: no.** The measured answer time is p99 1-3 ms, the worst 36.5 ms, 0 late answers in 52,605. A prototype is only
   1.5-1.8x faster, the gain is 0.00 points, and a port costs 15-20 hours.
5. **"wait 196 ms / 120 ms": nothing to do.** It is the platform's queue wait before a scoring worker picks the entry up
   (track average 137 ms). It is not our answer time. `notes/submissions.md` calls it the "test run time"; that is wrong.
6. **Declined:**
   - Copying giddygiddyboy's MIT source. The rules: "a submission with the same repository, commit or archive as another
     team's is disqualified", and "top entries are compared".
   - Recognising practice seeds from the spawn, slot or first circle.
   - Handshakes or pacts with other bots.
   - Any connection to the play server.

   Ideas and published numbers, re-implemented in our own code, are fine.

## 1. Why this ranking

Where our bot (5.02) differs from the 6+ family, from `top5_map.md`:

| Knob | Ours (S01-full) | Top family | Other evidence |
|---|---|---|---|
| Laser hold range | 150 m (band 125-185) | 120 m, in both top bots; giddy 120 m fight / 240 m seek; kyoto squad laser range 120 (v32) | 5.19 bot 110 m [T]; alexwilldev 150 -> 110 m (plus gun 130 -> 90 m) +0.53 [1]; 5.58 bot far band [T, against] |
| Partial laser release | Only when the beam alone kills (fraction 1.0) | giddy's scored 6.06 change: lethal fraction 0.9 -> 0.7; kyoto v35-37 releases a partial charge that kills | - |
| Boost while charging under fire | Never | kyoto v43 = the 6.31 build | giddy dropped its fight boosts and still made 6.06 [C] |
| Farm hp floor | 90% | 50% (giddy), 40% (kyoto) | 5.19 bot 50% [T]; nullat0m7 60 -> 85 % -0.13 [1] |
| Upgrades | plating > armor > nanites > laser_damage | speed / energy picks right after plating + armor, in both | - |

Two pieces of arithmetic back the range change [A]:
- The gun gate. Our 0.55 s flight gate and the 252 m/s bullet mean the gun fires only inside 139 m. At a 150 m hold our
  gun is mostly silent (102 dps lost). At 115 m the flight time is 0.46 s and the gun fires.
- The fight model. One line at 90 m: 1 kill, 543 hp left, 9 s. At 150 m: 1 kill, 237 hp left, 15 s. With several
  lines, 90-120 m is the sweet spot.

The price: the house gun hits 57% at 100-126 m against 32% at 126-151 m.

The scenario panel's Z1 (fit the band to the circle) is mostly moot with a 115 m hold. The largest separation is 182 m
at R 140, and from nr <= 70 the late leash already owns the legs. So Z1 waits.

## 2. Ranked change list

`NEXT` = in build R3a. `WAIT` = build R3b or later.

| # | Change | Rule (numbers) | Hook | Preset (R3a default) | Env | Expected gain, grade | Risk | Test | Status |
|---|---|---|---|---|---|---|---|---|---|
| N1 | Laser mid range | hold 115 m, band 100-130, back off at 100, boost away inside 70 m at energy > 30 | none: the existing preset feeds `tactics.js bandFor` | `laserRange: 'mid'` (was far) | both | +0.10 to +0.40; [T x3] [1] [A], against [T] | more house gun hits on us; faster kills | T1 | **NEXT** |
| N2 | Partial laser kill release | release when beam >= 0.7 x hp AND the gun can finish the rest (section 3.2) | `firecontrol.js run()`, laser block (`killNow`) | new `killFrac: '70'` (values 100 / 70) | both | 0 to +0.15; [T] | partial beams wasted if the gun misses: guarded | T2 | **NEXT** |
| N3 | Boost while charging under fire | SQUAD, FIGHT, laser charging, under fire, grounded, energy hysteresis 30 / 60 (section 3.3) | `brain.js legs()`, after the mode switch, before `mover.bulletDodge()` | new `chargeBoost: 'on'` (off / on) | SQUAD only (the FFA veto stays) | 0 to +0.25; [T], [C] | energy short for boost-away or retreat: hysteresis | T3 | **NEXT** |
| N4 | Farm down to 50% hp | `farmHp` 0.9 -> 0.5; this also lowers the SQUAD loot-stealing hp gate (`steal.js` 280, 459) | none: the existing preset | `farmHp: '50'` | both (FFA keeps `ffaFarmClear` 150 m) | 0 to +0.15; [T x3] [1] | drone fire at 50-60% hp blocks regen; `droneLeaveHpf` 0.5 still holds | T4 | **NEXT** |
| N5 | Speed upgrade third | order plating, armor, servos, nanites, laser_damage, laser_charge, jets, then the old tail | `params.upgradeOrder` via `economy.js pick()` | new `upg: 'speed'` (std / speed) | both | 0 to +0.10; [T x2], no A/B | nanites one pick later (6 -> 10 cubes) | T5 | **NEXT** (first to drop if time runs short) |
| F1 | FFA drop gate at 3 or fewer alive | with obs.alive <= 3: contest radius 60 -> 150 m, plus skip a drop if any mech is within 150 m of us | `economy.js chooseDrop()` | new `ffaDropGate: 'on'` | FFA only | final +0.05 to +0.2 per match in the 2-alive cell; [A] (sim seed 412 loss) | none in SQUAD (identity) | T6 | **NEXT** |
| S1 | Late upgrade order | t >= 265 s or alive <= 4: plating > nanites > laser_damage > laser_charge > servos > armor (armor does nothing against the zone) | `economy.js pick()` | new `lateUpg: 'on'` | both | final 0 to +0.1; [A] | rare in practice | T7 | stretch: NEXT if the checker has time, else first in R3b |
| W1 | FFA 2-alive and 3-alive play (Z8, Z9) | compare max hp (E_full): ahead by >= 300 -> WAIT; behind by >= 300 -> CLOSE; else duel at P >= 0.9; no drop or post within 150 m; truel: hold fire, hit the survivor within 4 s if under 50% and within 190 m | `stance.js chooseStance`, `ffa.js firstShotOk` | `ffaTwo` | FFA | final +0.1 to +0.3; [A] | none in practice | sim FFA league seeds 411-430 | WAIT (R3b #1) |
| W2 | Shadow positioning (levers 6A) | score cells where the second shooter's line passes through the first one's body; 50 / 60 / 75 m keep-off; FFA weight 1.0 | fight / peek cell scorer (`tactics.js makePosEval`) | `shadow: off / ffa / all` | FFA (all = practice experiment) | final +0.1 to +0.3; board +0.05 to +0.2; [E] | O(n^2) rays, about 0.05 ms | levers 6A tests | WAIT (R3b #2; `all` gets its own practice draw) |
| W3 | Pull-through (levers 6B) | drag a nearest-target chaser past a bystander; abort rules as in 6B | `ffa.js`, new leg kind | `pull` | FFA | final +0.1 to +0.4; [E] | exposure | 6B tests | WAIT (R3b #3) |
| W4 | Zone side (Z2) | enter the next circle on the side away from the mechs' centroid, up to 60 deg; goal 0.6 nr (SQUAD), 0.65 nr (FFA) | `mover.js zoneGoal`, `brain.js holdLegs` | `zoneSide` | both (changes practice) | final [R]; practice [N] | path length; checked | Z2 tests | WAIT (own practice draw) |
| W5 | Final point (Z5) | 375-390 s: stand on `next_center`, on the current-centre side if pushed; from 405 s shoot the mech whose E is just above ours | `mover.js zoneGoal` late branch, `selectTarget` | `finalPoint` | both | final; [A] | rare | collapse tests | WAIT |
| W6 | Identity probes | `env: 'squad'` (latch leak) and `beamClue: 'on'` (squad friendly fire), each on the best arm | no code | existing presets | probe | 0 to +0.3 if the latch leaks | 2 slots | equal score = no leak | WAIT (hours 2-3) |
| W7 | Outside budget / cheap crossing (Z3, levers 6E) | only in a fight: s_out <= min(cap, 0.15 x hp / dps), caps 12 / 7 / 4 / 2 / 0 / 0 s | `okStatic`, `walkable`, `bulletDodge` | `outsideBudget` | both | 0 to +0.1; [A] | zone deaths | sim zone-death counter | WAIT |
| W8 | Last-gasp kill (6F), late kill (Z7), FFA zone gate (Z10), edge-back (Z4), sound lure (6C) | as in the panel notes | various | one preset each | various | small each | - | - | WAIT |
| - | Z1 band fit | needed only if we go back to the far band | `bandFor` | `bandFit` | both | - | - | - | WAIT (moot with N1) |
| - | Rust port, drone drag, stadium lure | - | - | - | - | about 0 | high | - | DROPPED |

**Bundle estimate (N1-N5)** [A, not additive]: +0.15 to +0.6, centre about +0.3. With 16-32 draws on top, the board lands
at 5.6-6.0. The cut forecast for Sunday is 5.8-6.0, so qualifying is roughly a coin flip. That is why every slot is used
and the second practice candidate (W2 `all` or W4) is ready on Sunday morning.

## 3. Engineer spec for the NEXT items

General rules:
- Every new number goes in `PARAMS`, and every switch in `PRESETS` + `SELECT`.
- With `{ laserRange: 'far', farmHp: '90', killFrac: '100', chargeBoost: 'off', upg: 'std', ffaDropGate: 'off',
  lateUpg: 'off' }` the bot must be **byte-identical to S01-full** (da88060b) on all 14 identity streams.
- Add an `r3` bundle switch after `pass2b` (pattern of `pass2b`): `r3: 'off'` sets only the new keys back to their old
  behaviour (killFrac 1.0, chargeBoost false, the std upgradeOrder, ffaDropGate false, lateUpg false). laserRange and
  farmHp stay their own presets.

### 3.1 N1 laserRange mid, N4 farmHp 50: SELECT edits only
- `SELECT.laserRange = 'mid'` (hold 115 m, lo 100, hi 130, backOff 100, boostAway 70).
- `SELECT.farmHp = '50'`.
- Nothing else changes.

### 3.2 N2 killFrac (firecontrol.js, laser block, the `killNow` line)

```
dmg  = laserFrac(charge, lz.full, lz.minFrac) * lz.damage * mult                // mult already has rear and cook-off
rem  = tgt.hp - dmg
gunOk = g && g.reload <= 0 && g.ammo >= 2 && tgt.dist <= g.range * P.gunRangeFrac && tgt.losOut
killNow = charge >= (lz.st.min_charge || 0.15) &&
          (dmg >= tgt.hp || (P.killFrac < 1 && dmg >= P.killFrac * tgt.hp && gunOk && rem <= 3 * g.damage * me.dmgMult))
```

- PARAMS: `killFrac: 1.0`.
- Preset: `killFrac: { '100': { killFrac: 1.0 }, '70': { killFrac: 0.7 } }`.
- Keep the existing `gate && clear` requirement for the release.
- Worked numbers (0 cubes, not rear):

  | Target hp | Beam-alone release at | killFrac 0.7 release at | Left for the gun |
  |---:|---:|---:|---|
  | 200 | 0.33 s | 0.15 s | 49 hp, 2 rounds |
  | 300 | 0.70 s | 0.37 s | 90 hp, 2 rounds |
  | 400 | never (315 max) | 0.62 s | 120 hp, 3 rounds |

- Do not feed this into `tactics.js burstDamage` / `finishable`: target choice stays unchanged, this is a release rule
  only.

### 3.3 N3 chargeBoost (brain.js `legs()`, after the `switch (B.mode)`, before the bulletDodge line)

```
if (P.chargeBoost && B.env !== 'FFA' && B.mode === MODE.FIGHT && me.laser && me.laser.charge > 0 && me.grounded &&
    B.target && !B.target.npc && ['standoff', 'isolate', 'zonestrafe', 'zonefight'].includes(B.legKind) &&
    (B.nLos >= 1 || me.t - me.lastHurtT <= 1.0)) {
  if (me.energy < P.cbStop) B.cbLow = true; else if (me.energy >= P.cbResume) B.cbLow = false
  if (!B.cbLow) cmd.boost = true
}
```

- PARAMS: `chargeBoost: false, cbStop: 30, cbResume: 60`. Preset `chargeBoost: { off, on }`.
- **Order matters.** `bulletDodge` reads `cmd.boost` for its speed (mover.js line 193). Setting it before the dodge makes
  the dodge plan at 9.75 m/s (boost 19.5 x charge 0.5) instead of 5.85 m/s.
- `finishLegs` still vetoes: the lightning reserve, energy < 2, airborne, and the FFA `boostVeto`.
- Energy: 0.75 s x 17/s = 12.75 per charge. The tank regenerates 18/s after 0.6 s, and the cycle is 2.4 s, so it
  sustains itself. With the hysteresis, boost-away (> 30) and the retreat boost (`boostReserve` 25) keep their reserve.
- Cost: O(1).

### 3.4 N5 upg speed, S1 lateUpg (economy.js `pick()`)

- Preset `upg`:
  - `std` = the current `upgradeOrder`.
  - `speed` = `['plating', 'armor', 'servos', 'nanites', 'laser_damage', 'laser_charge', 'jets', 'lightning_efficiency',
    'gun_damage', 'gun_rate', 'lightning_range', 'lightning_chain', 'gyros', 'gun_mag', 'capacitor', 'reactor',
    'gun_velocity', 'sensors', 'mortar_damage', 'mortar_splash', 'mortar_rate', 'laser_pierce']`.
  - Arrays are assigned by reference: never mutate them.
- S1, if built:
  - Store `B.aliveN` from `obs.alive` in `act()`, sanitised as in `ffa.js` line 118.
  - In `pick()`, use `P.upgradeOrderLate` when `P.lateUpg && (me.t >= 265 || (B.aliveN > 0 && B.aliveN <= 4))`.
  - `upgradeOrderLate` = `['plating', 'nanites', 'laser_damage', 'laser_charge', 'servos', 'armor', ...rest]`.

### 3.5 F1 ffaDropGate (economy.js `chooseDrop()`)

- `const late = P.ffaDropGate && B.env === 'FFA' && B.aliveN > 0 && B.aliveN <= 3`.
- The contest radius is `late ? 150 : P.dropContestR`.
- When `late`, also skip the drop if any listed non-NPC mech with conf >= 0.3 is within 150 m of us.
- `chooseDrop` runs every 0.5 s, so a mech that comes within 150 m drops the task.
- SQUAD: unchanged by construction.

### Compute budget
- All of the above is O(1) per decision, or O(tracks) for F1.
- The runtime panel's cap for new code is +8 ms, at most 2 extra path searches and 5,000 ray casts. We use none.

## 4. Tests and the release check (engineer builds, checker verifies independently)

| Test | What it shows | Pass |
|---|---|---|
| T1 | test_brain scenario: a laser target at 140 m, then 95 m, no other threat | moves in to 100-130 m, backs off at 95 m; gun fires at 115 m (flight 0.46 s) |
| T2 | firecontrol unit cases: the three rows of 3.2, plus gun reloading, ammo 1, no gun line | release at 0.15 / 0.37 / 0.62 s only when gunOk; with killFrac 100 the old behaviour |
| T3 | scenario: charging with a gun line on us at energy 80, then 25, then 55, then 65; airborne; FFA env | boost on / off / off / on; off airborne; off in FFA |
| T4 | scenario: hp 0.6, out of contact, crate at 80 m | LOOT chosen (with farmHp 90: not) |
| T5 | offer [nanites, servos, gun_damage] | servos (std: nanites) |
| T6 | FFA, alive 3, drop 120 m from another mech | no DROP task; alive 5: task kept |
| T7 | t = 270 s offer [armor, nanites, gyros] | nanites |
| ID | `CORE=1 bash tools/rc/identity_rc.sh` with the old-behaviour SELECT of section 3 | **14/14 byte-identical to S01-full** |
| ID-F | identity with only `ffaDropGate` on, env squad | 14/14 identical in SQUAD |
| Suites | test_brain (85 + new), test_world 39, test_counters 15, test_requests 12 | all pass |
| Sim sanity | 8 squad + 4 FFA matches (taskset -c 0,1) | 0 errors / stuck / fuse; zone deaths 0; worst decision < 10 ms; boost share in fights reported (expect 10-25%) |
| Release | `tools/package.sh` (hygiene, conformance with and without the map), `GATE_WAIVE=H9-method-exposure tools/release_gate.sh dist` | GO; R3 p99 < 5 ms |

Two notes on these tests:
- The simulator is a sanity tool only. It predicted the wrong order for core against full, so no simulator delta gates
  a change.
- Record the four dist/bot.js sha256 values (one per SELECT) in `notes/submissions.md` before the push.

## 5. Submission slate (owner's go; 4 per hour; best score counts; ties go to the earlier entry)

Hour 1: one code state, four commits, each differing only in SELECT.

| Slot | SELECT changes against S01-full | Reads |
|---|---|---|
| R3a-1 | laserRange mid, farmHp 50, killFrac 70, chargeBoost on, upg speed, ffaDropGate on (+ lateUpg on if built), salt 0 | the bundle |
| R3a-2 | laserRange mid only, `r3: 'off'`, farmHp 90 | range alone; zero new code |
| R3a-3 | R3a-1 with chargeBoost off | the only new movement code |
| R3a-4 | R3a-1 with salt 1 | re-roll noise of the bundle |

Decision rules:
1. Bundle real if max(R3a-1, R3a-4) >= 5.32 (5.02 + 0.3).
2. Keep chargeBoost only if R3a-3 is below the bundle mean by 0.3 or more. Below 0.3 is noise: keep both arms in the
   salt rotation.
3. If R3a-2 >= the bundle, the extra items are neutral or negative. Then run the next candidate on top of R3a-2, not the
   bundle.

Hour 2 on:
- Salts of the leading arm (3 per hour).
- One W6 probe on it per hour: first `env squad`, then `beamClue on`.
- Sunday morning: the second practice candidate (W2 `shadow: all`, then W4 `zoneSide`), one draw each, then their salts
  if they lead.

Lock:
- Choose the final entry from the strongest arm, judged by its mean over 2 or more draws, not by its luckiest draw.
- Submit R3b = that entry's exact SELECT and salt + the FFA-only R3b items. Its practice score must reproduce to the
  hundredth (identity). If it does not, enter the pre-R3b commit instead.
- Lock by 15:15 UTC Sunday.

Release steps: HANDOFF step 5 and REPO_HYGIENE.md.
1. Build with `tools/package.sh`.
2. Copy dist/* into the public repo.
3. Run the hygiene grep.
4. Commit with a neutral message and push in the minute of the submission.
5. Give the owner the URL plus the 40-character hash.

Log each submission in notes/submissions.md before the push.

## 6. Build R3b (final), Sunday, in this order

1. W1 (Z8 + Z9).
2. W2 (FFA weight).
3. W3.
4. S1 if not built.
5. W5.

Each item has an FFA-league check in the simulator (seeds 411-430, information only) and an ID-F identity check. W4 and
W7 change practice and go only as their own draws.

## 7. Time budget for R3a (one engineer + one checker)

| Step | Engineer | Checker |
|---|---|---|
| N1, N4 SELECT, N5 preset | 15 min | - |
| N2 killFrac + T2 | 35 min | reviews the diff, T2 |
| N3 chargeBoost + T3 | 50 min | reviews the diff, T3 |
| F1 + T6, presets + r3 switch | 30 min | T6, ID-F |
| identity 14/14, suites | 20 min | reruns independently |
| sim sanity, package, gate, four builds | 30 min | gate review |
| **Total** | **about 3 h** (S1 adds 15 min) | in parallel |

## 8. Slot: `top5_synthesis.md` (absent at writing)

When it lands, check these six points and change only what they touch:
1. Hold range: is it 120 m in all three top bots? If they hold under 100 m, add a `near` preset (hold 95, band 80-110)
   as an extra arm.
2. Lethal fraction and its guard.
3. The boost rules (kyoto v38-v44: jinking at energy > 40, dodge boosts at > 25, threatened at > 30, hysteresis 30 / 60).
   A positive read adds a `boostFight` preset to R3b; it is not added to R3a.
4. Opening: kyoto has had no opening mode since v32. Our farm-first gate stays (core 4.90 against full 5.02, confounded).
   Add an `openFarm: 'off'` draw only if the synthesis shows all three top bots fight from the start.
5. Engagement radius: kyoto/giddy fight anything closing, aiming or weak within 240 m after 20 s. Compare with our D5
   candidates (band + 40 = 170 m with mid).
6. Late-circle positions and 2-alive behaviour: fold into W4 / W1.

None of these may copy code or constant tables: re-implement the behaviour in our own code.
