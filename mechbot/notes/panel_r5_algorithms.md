# Panel R5: algorithms expert (concrete upgrades on the V4 build, ranked by gain per hour)

Written Sat 21 Nov 2026, about 19:30-21:00 UTC, by the panel's algorithms expert (Opus sub-agent).
- Read: HANDOFF, DOCTRINE V4, `notes/panel_r5_research.md` (the brief), `panel_r4_gameplay.md`, `build_spec_r4.md`,
  `top5_synthesis.md`, `intel_synthesis.md`, `mechanics_deep.md`, `measured_deltas.md`, `submissions.md`,
  `kit/protocol.md`, and the V4 source `variants/V4/bot/lib/{brain,tactics,firecontrol,mover,senses,aim,scan,params}.js`.
- Read-only on `bot/`, `sim/` and `variants/`; `intel/` not opened. Everything new is under `tools/panel_r5/`.

Tags: [M] official one-change result; [S] our simulator (V4 build, squad seeds 1-20; behaviour only, its within-bot
deltas have had the wrong sign six times); [A] our own model or arithmetic; [T] a 6+ bot's choice; [N] no evidence.

New tools (P = mechbot; all run in under 10 s, stdlib Python or `$P/bun`; outputs next to them):

| Tool | What it computes | Output |
|---|---|---|
| `gait_model.py` | House gun (exact linear lead, 0.30 s cadence, 12-round magazines, 0.6 deg spread) against six movement policies, with lockstep timing | `gait_model_out.txt` |
| `order_model.py` | Kill order against 2-4 hunters with lines: the V4 focus cost against Smith, SPT, budget-aware Smith and the exhaustive optimum | `order_model_out.txt` |
| `lead_model.py` | Our gun lead against house strafers with the replay's log-normal reversal times | `lead_model_out.txt` |
| `incoming.js` | V4 in the simulator: damage taken by weapon and range, rear share, laser charges at us and whether a shadow was reachable before release | `probes_out.txt` |
| `gunrate.js` | Our gun hit rate by band in the simulator, V4 lead against full lead | `probes_out.txt` |
| `abandon.js`, `abandon2.js` | FIGHT exits on near kills, and the weapon state at those exits | `probes_out.txt` |
| `postkill.js` | What V4 does in the 3 s after a kill | `probes_out.txt` |
| `raycost.js` | Cost of `world.shotClear` | `probes_out.txt` |
| `proto_ft/bot` | Copy of V4 with item 1 part (a) patched in (tactics.js `losing`, params) | prototype only |

## 0. What the measurements say before any design

1. **Damage we take** [S, 20 matches, V4]:
   - By weapon: gun 57-60%, lightning 20-25%, laser 8-13%, mortar 4-6%, drones 2-6%.
   - Gun damage by shooter range: under 40 m 23%, 40-80 m 40%, 80-130 m 28%, beyond 130 m 8%.
   - Rear hits (x1.5) are 13-19% of everything we take.
   - The simulator's house loadouts are guesses. The real hunter in the kit stream carried gun + laser, so lasers may
     matter more on the real scorer than these shares say.
2. **No movement makes a linear-lead bullet miss inside about 78 m** [A]. Our velocity change is limited by
   58.5 m/s^2, so a bullet flying under 0.31-0.34 s still arrives within 2.8 m of us. 63% of the gun damage we take
   comes from inside 80 m [S]. Dodging can only address the other 37%.
3. **Near kills we walk away from** [S]:
   - V4 left FIGHT for a retreat 10-13 times in 20 matches while the target was a near kill. A near kill here means
     the target at a median of about 20% hp, our hp 41-50%, and the damage of every line until the kill affordable.
   - In 7 of 10 such exits our magazine was empty (reload 0.25-2.4 s left), in an eighth one round was left, and no
     laser was ready.
   - 4 of 10 such targets were never killed by us.
   - About 15% of all the damage we deal goes into mechs that never die.
4. **Our gun lead is not the problem** [A, S].
   - In the toy model with the replay's log-normal reversal times (p10 0.4 s, p50 1.1 s, p90 2.7 s), full lead is
     the best rule: 0.68 hit rate at 115 m against V4's 0.63, a fixed 0.6 lead's 0.65 and an online virtual gun's
     0.64.
   - In the simulator, V4's rule against full lead: 65% vs 67% at 100-125 m and 83% vs 81% at 75-100 m. That is noise.
   - The brief's "75% -> 86%" came from a narrow U(0.8, 1.4) s reversal interval. Brief item 5 is dropped (section 3).
5. **The textbook kill order lowers our score** [A]. Smith's rule (Attack-Value: highest threat / time-to-kill
   first) minimises the damage needed to kill everyone. Our score counts kills before *we* die.

   | Rule | Damage to kill every hunter vs V4 | Kills before death, J (scale below) |
   |---|---|---|
   | Pure Smith (brief item 1 as written) | 6-13% less | worse in 5 of 6 cases: 1.15 vs 1.19 (3 hunters, laser), 0.61 vs 0.73 (4 hunters, laser); better only with 2 hunters and a laser (1.87 vs 1.79) |
   | Smith when we can kill them all, else quickest kill first | about the same | 1.91 vs 1.79 (2 hunters, laser), 1.28 vs 1.19 (3 hunters, laser), 0.78 vs 0.73 (4 hunters, laser) |
   | Exhaustive search over all orders (the model's optimum) | | 1.91, 1.30, 0.80 for the same three cases |

   The budget-aware rule gets almost all of the gain, so item 2 uses it, not pure Smith.
6. **Compute** [S]. `world.shotClear` costs 2.1-2.3 us per 60-160 m ray, warm. Every item below together adds under
   about 2 ms to the worst decision. The planner of item 8 costs about 0.7 ms per evaluation. All loops use fixed
   counts, never wall-clock time (D10).

## 1. Ranked list (expected gain per hour of engineer work)

Gains are on the official practice score against the V4 leader: a centre and a range, not additive.

| Rank | Item | Preset (old value first) | Hours | Gain centre (range) | Gain per hour |
|---|---|---|---|---|---|
| 1 | FIN: finish-or-flee by exact time-to-kill, and no heal break away from a near kill | `finish: off / ttk` | 1.5 | +0.08 (-0.05 .. +0.20) | 0.05 |
| 2 | AVO: budget-aware Attack-Value order (exhaustive over at most 5 hunters, rear arc included) | `focus: add / av` | 1.5 | +0.05 (0 .. +0.12) | 0.035 |
| 3 | HAND: no overkill; hand the torso and laser to the next target while the kill is in flight | `handoff: off / on` | 1.0 | +0.03 (0 .. +0.08) | 0.03 |
| 4 | SYNC: stop-and-go phase-locked to the main gun shooter, reactive dodge kept | `gait: d4 / sync` | 3.0 | +0.06 (-0.20 .. +0.20) | 0.02 |
| 5 | PRE: laser pre-charge when a line is about to open | `precharge: off / line` | 1.5 | +0.03 (0 .. +0.08) | 0.02 |
| 6 | ARC: torso facing during dead time (front arc over the threats, vision kept) | `deadYaw: off / arc` | 1.5 | +0.03 (0 .. +0.06) | 0.02 |
| 7 | SHADOW: break the charging laser's line on its release tick | `beamStep: d4 / los` | 2.0 | +0.02 (-0.10 .. +0.08) | 0.01 |
| 8 | ARB: short-horizon arbiter over 5-6 leg plans (2.5 s closed-form playout) | `legs: std / arb` | 5.0 | +0.05 (-0.20 .. +0.20) | 0.01 |

Draw order on the real scorer, one preset per submission on the V4 SELECT:
- FIN, then AVO, then HAND (code all three in one 4-hour block; each is its own draw).
- Then SYNC and PRE.
- ARC and SHADOW if slots remain.
- ARB only if FIN or AVO is adopted and time remains before the 09:00 SQUAD code freeze.

Every item acts only while `B.env !== 'FFA'`, keeps V4 byte-identical with its preset off (identity streams), and
uses no clock.

Shared machinery: items 1, 2, 3 and 8 need the same two functions.
- TTK(tr): exact time to kill from our weapon state.
- IN: expected incoming dps from every line.

`build_spec_r4.md` 2.2 specifies both for lib/hunt.js. If hunt.js is merged, reuse them. If it is not, put them in a
new `lib/r5.js` (pure functions of B):
```
TTK(tr): k = me.dmgMult, rm = tr.rearOn ? me.rearMult : 1, step 0.05 s to 6 s
  gun:   rounds at 1 per max(cd, 0.25) from t = gun.cooldown (or after reload: reload left, then mag rounds),
         each worth damage x k x rm x gunStat.q(dist); reload reloadS when the magazine empties
  laser: first beam at cooldown + max(0, full - charge) + latency, then every cd + full,
         worth damage x k x rm x (hasMortar ? 1 + cookoff : 1) x 0.92
  light: within range x 0.92: 60 x k x rm every 0.25 s while energy > lightReserve
  -> first t with cumulative >= tr.hp, else 99;  + 0.3 s if tr is not the current target (slew); + 1.0 s if no line out
IN = max(30, B.A)   (B.A = sum of tr.a over tracks with a line on us in the last 1 s; tr.a = measured 3 s rate with
                     >= 3 samples, else the D1 prior x line x conf; already computed in tactics.assess)
```

## 2. The items

### Item 1. FIN: finish-or-flee by exact time-to-kill, no heal break away from a near kill (`finish: 'ttk'`)

**Problem (measured above):**
- V4's finishing exception is a fixed threshold: target under 20% hp and at most 2 threats (`losing()`, `finishHpf`,
  `finishThreats`).
- With three lines on us and a target at 13-25%, the D3 table starts LOSING (3 threats and hp < 60%).
- The 6 s `afterLose` clause then turns the retreat into a HEAL toward 90% (70% after the 6 s), left only when a line
  opens and we are not LOSING. The kill is gone.
- The exits cluster at the moment our magazine runs dry. A retreat during the 2.4 s reload is fine. Not coming back
  when the gun is loaded again is the loss.

**Algorithm:**
- **Near kill** (test it every decision on the current mech target, or on the last target if it was seen within 3 s):
  `TTK(tgt) <= 3.0 s` and `IN x (TTK(tgt) + 0.3) <= me.hp - M`, where `M = max(150, 0.10 x maxHp) + 0.5 x IN`.
  - IN here is the larger of the current B.A and its maximum over the last 3 s (lines on us drop out of sight while we
    hide).
  - TTK includes the remaining reload when the gun is empty, and 1.0 s of regain when there is no line out.
- **(a) `tactics.losing()`:** `finishing ||= nearKill` (added to the existing `finishing` line). The D3 table is
  untouched for everything else.
- **(b) `tactics.decideMode()`:**
  - While a near-kill target is known (`hp <= E_mag`: one full magazine at its range plus a ready beam, cube bonus
    included), the afterLose HEAL entry (`healAfterLoseHp`) is off.
  - The moment the gun holds `ceil(hp / (damage x k x q))` rounds, or a beam is ready that kills (`killNow`), and the
    near-kill test passes, the mode goes to FIGHT at once. This is an urgent switch: no `modeHold`.
  - FIGHT's existing regain leg brings the line back.
- HEAL below 55% (`healEnterHp`) and everything else stays as in V4.
- Off in FFA, in the late zone (`nr <= 70`), and at 3 or fewer alive.

**Effect:**
- In the simulator about 0.5 such exits per match, 40% of them never killed: up to +0.2 kills per match there.
- The evidence agrees in sign:
  - finishable-first +0.39 (G01 [M]);
  - fight-or-flee by time-to-kill +0.34 (A32 [M], a bundle);
  - the 5.19 and 5.58 bots' "never retreat from a finish" rules [T].
- Part (a) alone was prototyped (`tools/panel_r5/proto_ft`). Exits moved to the reload moment, and kills were 87 ->
  87-88 in 20 matches (noise). So part (b) is the active half, and the two ship as one preset.

**Risk:** more deaths in 3+ line fights at 40-50% hp. The margin M bounds it: a return needs the whole kill to be
affordable at the current incoming rate plus half a second.

**Tests:**
- T1: target 200 hp at 90 m, three lines (B.A 250), our hp 700, ammo 6 -> not LOSING.
- T2: the same with ammo 0, reload 2.4 s -> DISENGAGE. After the reload (ammo 12), target still at 200 hp ->
  FIGHT within one decision, no HEAL.
- T3: our hp 300 -> HEAL as in V4.
- T4: FFA, late zone and 3 alive -> identical to off.
- T5: identity of preset off on the 14 streams.
- T6: simulator behaviour run, `tools/panel_r5/abandon2.js 1 20` with `BOT` set to the build. Near-kill exits that
  are never killed fall from 4 of 10. Zero errors.

### Item 2. AVO: budget-aware Attack-Value order (`focus: 'av'`)

**Problem:** V4's additive cost (distance + 0.1/hp, -200 finishable or under 30%, -200 current) is close to
"quickest kill first". It has no threat term, so a laser carrier counts the same as a gun-only bot. It also ignores
which choice leaves the other hunters behind our torso (x1.5).

**Algorithm (`tactics.selectTarget`, after the existing candidate filter and the V4 'add' cost):**
1. Take the up to 5 lowest-cost non-NPC candidates with a line either way in the last 1 s.
2. Threat on us:
   - gun: `a_i = 93 x pH(d) x k_i x (carries laser ? 0.6 : 1)`, with pH = 0.94 / 0.58 / 0.31 / 0.12 under 40 / 80 /
     130 m / beyond, from S05 (the real server);
   - laser: `+ 78 x k_i` (315 x 0.67 / 2.7 s);
   - lightning: `+ 190 x k_i` inside 45 m;
   - k_i = 1 + 0.04 x min(cubes, 10);
   - x 0.35 when it is not hostile, as `assess` does;
   - use `max(prior, measured tr.a)`.
3. Time to kill: `ttk_i = TTK(tr_i)` from section 1.
4. Rear factor: while we face target i, any j more than 90 deg from i's bearing hits us x1.5.
5. Search all orders of the set (at most 120 orders x 5 steps). For each order:
   - walk the kills in order: while killing k, every living j deals `a_j x rear_j(k) x ttk_k`;
   - stop when our hp runs out, or at a 15 s horizon;
   - J = kills + spare hp / 500 (spare counts only when all of them die; one kill per about 500 hp taken over a life).
6. Target = first element of the best order.
7. Hysteresis:
   - keep the current target if the best order that starts with it is within 0.08 of the best J;
   - always keep it under 25% hp (D5);
   - always keep it while it is finishable and we hit it in the last 1 s;
   - the torso veto and drone rules are unchanged.

**Effect:**
- The model gains +0.07 to +0.12 kills per engagement with a laser, +0.01 to +0.02 gun-only (section 0.5).
- It agrees with the measured value of finishing (G01) and of giddy's kept focus retunes, which keep a strong hp term.
  The rule keeps it, because time-to-kill is proportional to hp.
- Expected +0.03 to +0.10 when it lands in the 2-4 line fights that decide our deaths.

**Risk:**
- Flicker from noisy threat or line estimates. Mitigated by the hysteresis and by a once-per-0.3 s re-order (the
  posEval cadence) unless the current target dies or loses its line for 1 s.
- A wrong order costs at most the model's 6-13% damage difference.

**Tests:**
- T1: two hunters at 110 m with lines, A gun + laser 1400 hp and B gun 900 hp:
  - our hp 1300 (both killable) -> picks A;
  - our hp 500 -> picks B.
- T2: on a tie, the choice that keeps the other hunter inside the front arc wins.
- T3: the current target at 40%, a fresh hunter appears -> kept (J difference < 0.08).
- T4: n = 5 -> at most 600 inner steps, under 0.1 ms.
- T5: identity of preset off.

### Item 3. HAND: no overkill, hand-off while the kill is in flight (`handoff: 'on'`)

**Problem:**
- Our own rounds are not in `obs.projectiles`. At 100-130 m the last 1-3 rounds fly 0.4-0.5 s.
- The torso stays on a target that is already dead.
- A full beam may still be released into it. The R4 stretch item covers only the beam.

**Algorithm:**
- Senses: on each ammo decrement, push `{eta = t + dist / 252 + 0.05, p = q(dist), dmg = damage x k x rm}` for the
  current target. Drop entries 0.1 s after their eta.
- `P_kill` = probability that at least `ceil(hp / dmg)` of the n rounds in flight hit (binomial with p; n <= 3).
- If P_kill >= 0.85:
  - mark the target dying and drop it from the candidates until its last eta + 0.15 s;
  - the gun holds fire at it;
  - no laser release at it, and a charge is kept for the next target;
  - the torso turns to the next target (item 2 order, or the V4 cost).
- If it is still alive after the last eta + 0.15 s, it is a candidate again (top priority by its low hp).

**Effect:** about 0.3-0.5 s faster onto the next hunter per kill made with others present, and an occasional beam
saved (a 2.4 s laser cycle). Expected +0.01 to +0.05.

**Tests:**
- T1: target 80 hp at 100 m, two rounds in flight, q 0.9, dmg 50 -> P = 0.81 -> no switch.
- T2: three rounds -> P(at least 2 of 3) = 0.97 -> the torso commands the second hunter on the same decision, gun
  holds, full charge held.
- T3: target alive after its eta -> back to it.
- T4: identity of preset off.

### Item 4. SYNC: stop-and-go phase-locked to the main gun shooter (`gait: 'sync'`)

**Mechanism [A, `gait_model.py`]:**
- A house bot aims from its obs at tick E, with our velocity v(E). Our command from the same obs acts from E on.
- A brake or a start commanded on exactly that decision puts its bullet more than 2.8 m off once the flight exceeds
  0.34 s (walk) or 0.31 s (boost). That is 86 m or 78 m.
- House bots fire every 6 ticks inside a 12-round magazine, so their aim decisions are predictable from one seen
  bullet.

**Algorithm:**
- Cadence tracker (`senses.attribute`, which already attributes each new bullet to a listed gun mech, counts its
  magazine and sees magazine starts):
  - launch tick `F = t_obs - (|bullet - shooter muzzle| - 3) / 252`, snapped to the tick grid;
  - next aim obs `= F + 0.25 s` while its magazine count is under 12 and its last round is at most 0.35 s old;
  - `F + 2.5 s` after the 12th round.
- Sync shooter: the gun track with a line on us, 80-170 m away (75-170 m while boosting) and a cadence seen within 1 s,
  that maximises `pH(d) x k x |sin(angle between our strafe axis and its line)|`.
- `mover.standoff` and `leashStrafe`: on the decision whose obs is the sync shooter's aim obs, toggle a strafe gate g
  between 1 (move) and 0 (stand) along the strafe component only.
  - The radial band term is unchanged.
  - The U(0.8, 1.6) reversal timer is applied only on a 0 -> 1 toggle, so we never reverse on the fire schedule.
  - Without a sync shooter, the V4 strafe.
- `bulletDodge` stays on top.

**Effect:**

House gun hit rate on us (12 paired seeds, about 3000 bullets per cell; s1 = the shooter we sync to, s2 = a second
shooter on the same bearing with its own phase):

| Range (m) | 85 | 100 | 115 | 130 | 150 |
|---|---|---|---|---|---|
| V4 strafe + dodge, s1 / s2 | 0.81 / 0.80 | 0.60 / 0.61 | 0.35 / 0.36 | 0.46 / 0.47 | 0.47 / 0.46 |
| sync + dodge, s1 / s2 | 0.50 / 0.78 | 0.36 / 0.54 | 0.28 / 0.28 | 0.24 / 0.28 | 0.21 / 0.28 |
| sync + dodge one decision late, s1 / s2 | 0.75 / 0.74 | 0.54 / 0.48 | 0.29 / 0.34 | 0.28 / 0.31 | 0.25 / 0.32 |

- At 100-150 m both shooters' hits fall by about 40% (0.49 -> 0.29 on average), even with the tracker one decision
  late.
- At 85 m only the synced shooter gains, and only when the tracker is exact to the tick.
- Without the dodge on top the gait is fragile: one decision late, the second shooter hits 0.55-0.67 at 100-150 m.
  So keep `bulletDodge`.
- Mean lateral speed 9.4 -> 7.7 m/s (7.1 when late).
- Only the 37% of gun damage from 80 m and beyond is affected [S]: about 5-8% less damage taken overall, more in
  laser-band fights (100-130 m).

**Risk:**
- A movement change. Open-loop fast flips measured -0.69 (M03 [M]); this gait has no fast flips and keeps progress.
- The real house hit rates on bots at 80-130 m (31%, S05) are lower than the toy's baseline, so the absolute saving
  shrinks in proportion.

**Tests:**
- T1: a synthetic 0.30 s cadence; the tracker predicts the aim obs within 1 tick from bullets first seen 1-3 ticks
  old.
- T2: the gate toggles exactly on those decisions.
- T3: no toggling inside 75 m.
- T4: simulator: gun damage taken from shooters beyond 80 m per second of FIGHT (`incoming.js`), and kills.
- T5: identity of preset off.

### Item 5. PRE: laser pre-charge when a line is about to open (`precharge: 'line'`)

**Problem:**
- V4 starts a charge only with a line, within 1 s of losing it, or on `peekSoon`. So the first beam of every
  engagement and every regain leaves about 0.85 s after the line opens.
- The house first gun shot comes a median 1.15 s after a line opens (p25 0.65 s).

**Algorithm:**
- `lineSoon(tr)` for the target (or, with no target, the nearest hostile track seen within 4 s and 220 m):
  - predict our muzzle at +0.4 s and at +0.75 s from the leg command (half speed while charging);
  - predict its centre dead-reckoned to the same times;
  - lineSoon if either predicted line is clear (`shotClear`) while there is none now. 2-4 rays.
- `firecontrol.run`: in the laser branch `expected ||= lineSoon`; in the memory branch, start or keep a charge on
  lineSoon (the torso already pre-aims at the remembered point).
- A full charge is held up to 1.9 s. Then it is released at any mech, drone or crate with a line, else wasted (the
  engine fires at 2.0 s).

**Effect:**
- The first beam lands at line + about 0.1 s, before the house reacts.
- Worth about 0.4 s of time-to-kill per engagement with a laser, about 6% of a 6.4 s kill.
- Laser held 24-33% of life [S] -> +0.02 to +0.06 overall. Larger if R4's laser grab raises laser time.

**Tests:**
- T1: regain leg toward a cell 6 m away with the target behind the corner -> charge starts on the first decision
  lineSoon is true; beam within 0.15 s of the first decision with a line.
- T2: no line after 1.9 s at full -> released at a crate in view.
- T3: identity of preset off.

### Item 6. ARC: torso facing during dead time (`deadYaw: 'arc'`)

**Problem:**
- Rear hits are 13-19% of the damage we take [S].
- While the gun reloads (2.4 s of every 5.15 s in a gun-only fight) and no laser or lightning is ready, the torso has
  nothing to aim.

**Algorithm (`firecontrol.run`, target branch):**
- Dead time: reload with more than 0.6 s left (or ammo 0), laser absent or more than 0.6 s from ready and not charging,
  and no lightning target.
- Then aim at the yaw y that maximises `sum_j a_j x [j within 90 deg of y]`:
  - candidates are the target bearing +-k x 15 deg (k <= 5);
  - j runs over non-NPC tracks with a line in the last 1 s, with the target counted twice;
  - subject to |y - target bearing| <= 80 deg.
- Swing back when the reload has 0.4 s left or the laser will be ready within 0.4 s (80 deg at 4 rad/s = 0.35 s).
- Hunters brought into the 120 deg wedge stay listed, which is a vision gain.

**Effect:** about 1/3 of the rear damage taken during dead time is saved, roughly 2-3% of all damage. +0.01 to +0.05.

**Tests:**
- T1: target ahead, a 90 dps hunter at 150 deg, reload 2.0 s -> torso at +75 deg, back on the target by reload end.
- T2: no second hunter -> no change.
- T3: identity of preset off.

### Item 7. SHADOW: break the charging laser's line on its release tick (`beamStep: 'los'`)

**Mechanism:**
- A house laser releases on the obs that shows a full charge: about 0.75 s after its flag is first seen, beam 16 ticks
  after.
- The beam is aimed at our position on that obs. We move at most 1 m in the remaining tick, so no sidestep dodges it.
- Only a line break dodges it, and a beam with a line hits (4 of 4 in the kit stream).

**Algorithm (replaces D4's reaction in `brain.fightLegs`, which needs a hide cell hidden from every threat within
6 / 9 m):**
- Search cells once per charge aimed at us (within 0.25 rad, with a line on us):
  - 7 rings of 2-12 m x 16 directions;
  - passable, with a walk line, inside the zone, not toward the charger;
  - the charger's muzzle has no clear line to the cell centre.
- Take the nearest cell reachable by `chargeT0 + 0.65 s`. Accelerate at 58.5 m/s^2 to walk speed, or to boost speed
  with energy >= 25; add 1.5 m to clear the edge.
- Go there, firing at anything with a line. Resume the stand-off on the beam, or at the predicted release + 0.2 s.
  The charger's laser is then dead for 2.4 s.
- No reachable cell: no reaction.

**Effect:**
- In the simulator, 31 charges at us in 20 matches; a shadow was reachable in time for 29% walking and 39% boosting.
- That saves about 0.5 beams per match (about 2% of damage there).
- More if real hunters carry lasers more often than the simulator's.

**Risk:** the cover, peek and hide-from-laser bundle measured -0.71 (A17 [M]). Keep it a reaction, never a position.

**Tests:**
- T1: charger at 110 m, wall corner 5 m away -> we arrive before the release; the beam hits the wall; back in the
  open within 0.3 s.
- T2: corner 14 m away -> no reaction.
- T3: identity of preset off.

### Item 8. ARB: short-horizon arbiter over a few candidate leg plans (`legs: 'arb'`)

This is the brief's portfolio search (ABCD / PGS), in a closed form that fits the budget.

**Algorithm:**
- Every 0.3 s (posEval cadence), score up to 6 macro plans over 2.5 s in 10 steps:
  - STAY (stand-off);
  - ISOLATE (posEval cell);
  - HIDE (B.hide);
  - GRAB (B.grab);
  - FINISH (close 20 m on a target with TTK <= 2.5 s);
  - SHADOW (item 7 cell).
- Each step:
  - one ray per threat (at most 4) and one to the target;
  - incoming = `sum a_j x rear x dt`, with the gun part x 0.7 while our velocity changes in that step (gait model);
  - outgoing = the TTK schedule while the line holds (x 0.8 while walking a path).
- `J = out - in + 300 x [kill within horizon] + value (cube 60, laser 400) - 1500 x [in >= hp]`.
- Pick the best with a 40 hp hysteresis for the current plan, and commit for at least 0.6 s.
- About 300 rays, about 0.7 ms, fixed counts.
- It replaces three fixed rules:
  - isolate whenever `B.A - tgt.a > 20 && nLos >= 2`;
  - the in-fight grab radii;
  - the hide-cell choice under LOSING. The LOSING decision itself stays the gate.

**Effect:**
- The walking legs lose 72-73 hp/s against 42 in a stand-off (V1 [S]).
- R4's I3 / I4 cut them by hand; this prices each walk.
- Expected +0 to +0.2. Five hours and model risk put it last.

**Tests:**
- T1: isolate cell 25 m away under two lines -> STAY.
- T2: isolate cell 8 m away with no line from others -> ISOLATE.
- T3: cube 10 m away, one line -> GRAB.
- T4: worst decision <= V4 + 2 ms on one core.
- T5: identity of preset off.

## 3. Not recommended (with the reason)

- **Segmented or adaptive gun lead** (brief item 5). Toy: full lead is best against log-normal strafers. Simulator:
  V4's rule and full lead are within noise (section 0.4). No engineer time.
- **Pure Smith / Attack-Value order** (brief item 1 as written). It minimises damage to kill everyone but lowers kills
  before death in 5 of 6 model rows. Use item 2's budget-aware form.
- **Fight-or-flee that also retreats earlier when the kill is far.** Measured early retreat -1.10 (A25) and combined
  caution -0.60 (A06). Item 1 only ever adds fighting.
- **Post-kill "shot by something unseen" DISENGAGE.** It occurs after 8 of 87 kills, 0.6 s per match [S]: not worth a
  slot.
- **Reloading early for the finish.** The time to fire N rounds does not depend on when the reload happens. The value
  is in coming back (item 1b).

## 4. Integration notes for the engineers

- Items 1, 2, 3 and 8 share TTK and IN (section 1). Write them once, in `lib/hunt.js` if R4a is merged, else in
  `lib/r5.js`.
- Under R4's hunt50, the committed-target rule replaces item 1(a). Item 2 still ranks the candidates that the hunt50
  gate admits.
- Firewall as R4: SQUAD posture only (`B.env !== 'FFA'`). Items 1-3 are also sound in the FFA, but the final needs its
  own check before anything is enabled there.
- Budget: TTK at most 120 steps per target; item 2 at most 600 steps; item 5 four rays; item 7 at most 112 cells once
  per charge (about 0.6 ms); item 8 about 300 rays every 0.3 s. Every count is fixed, so the 48-seed replay stays
  deterministic.
- Simulator checks are behaviour checks (exit counts, damage by band, timing). They are not score predictions.
