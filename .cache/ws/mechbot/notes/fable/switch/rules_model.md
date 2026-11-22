# rules_model — the game model for the switching panel (Fable panel, analyst 1 of 5)

Written Sun 22 Nov. One author; nothing here is independent review. No simulator run was made for this note.
Sources, in order of authority: **[P]** kit/protocol.md + kit/README.md (official text), **[C]** notes/hello_example.json
(the config the server sends; read key by key), **[M]** official 48-seed results (notes/submissions.md,
measured_deltas.md), **[R]/[S]** our replay / stream / simulator measurements quoted from notes/mechanics_deep.md,
rules_audit.md, panel_r6_rewards.md, panel_r7_r1_game.md, panel_r7_r1_psych.md (behaviour only), **[A]** my arithmetic,
**[N]** unknown. Code = `r7work/ckpt_07_LG` (read only); line numbers are from that tree. SELECT = variants6/FNV_s1.

## 0. What the designers must hold in their heads

1. **Score = number of other mechs dead before us** (16 - place; place = `obs.alive` at our death) [P]. Who kills them
   does not matter. Nothing else scores. Target 9 = nine house deaths before ours; we are at 5.38.
2. **We die at about 80-100 s, in zone phase 1** [S 53/53 deaths in phase 1; M+A]. Phases 2-6, drops 2-3 and the
   480 s clock are never reached in practice. Time is not the scarce resource; hp is.
3. **Identity** [A]: kills = (damage out) / (about 1,450 per kill, waste included [S]); life = (hp budget) / (intake
   rate). Today about 7,800 damage out over a budget of about 2,100 hp taken: **390 hp spent per kill**. Nine kills
   need about 13,000 damage out, so either +1,400 hp of budget at today's exchange (exactly one full refill) or an
   exchange of about 233 hp per kill at today's budget.
4. **There is no "wait" action.** A pause is an ordinary answer with `move [0,0]` and/or `fire [false,false]`. A
   missed answer is not a pause: the server keeps the last `move`, `boost`, `aim` for up to 1.0 s and drops the triggers.
5. **Three different clocks are all called "pause"** and they have different conditions (section 5): hp regeneration
   (5 s without dealing or taking damage; movement is allowed), energy regeneration (0.6 s without spending), and
   silence (ground speed at or below 5 m/s). Standing still buys hp nothing that walking does not.

## 1. Scoring and match end [P]

| Fact | Value |
|---|---|
| Placement | order of death; last alive is 1st; same-tick deaths share a place (direction unknown [N]) |
| Points | 16 - place per match; score = mean over 48 practice matches (steps of 1/48 = 0.0208) |
| Dying | hp reaches 0 (weapons, drone bullets, own mortar splash at 50%, zone). After death: no more obs, only `end {place, kills}` |
| A crash / process exit | mech idles and is scored as a sitting target; never rejected |
| End | one mech left, or 480 s; at the clock survivors rank by hp. Unreachable: the zone is radius 0 at 415 s at 260 hp/s |
| Practice field | 15 house bots (4 easy, 4 medium, 4 hard, 3 expert) as one squad: shared vision, never fight each other, "hunt you weakest first (one early, more as you thin them out, all of them late)" (track page, quoted in rules_audit L7). Seeds private and fixed; slot and spawn vary. Server deterministic [M: KS s1 old tree = R7P s1 = 5.13] |
| Zone / drone deaths of house bots | count for us like kills [P]; in practice every house death before ours was our kill [S 49/49] |

## 2. Timing and the answer budget [P][C]

| Fact | Value |
|---|---|
| `tick_hz` / `decide_every` | 20 / 2: one observation and one action per 0.1 s; about 800-1,000 decisions per life |
| Lockstep | server sends all 16 obs, waits for every answer or 50 ms, applies, simulates 2 ticks. A fast bot is never penalised |
| Budget | 50 ms wall time from sending obs to reading our line; 1 CPU. Ours: 1-8 ms, worst about 16 ms; brain deadline 27.5 ms (bot.js:139), fuse 30 ms (params.js:17) |
| Late or wrong-tick answer | dropped. Mech keeps `move`, `boost`, `aim`; drops `fire`, `jump`, `reload`, `pick`, `take`, `drop`. So: gun stops, a charging laser is released early at partial charge, boost keeps draining |
| After `coast_s` 1.0 s of misses | idle: no movement, aim held (starts up to 0.1 s later) |
| Backlog | answer only the newest obs (bot.js:160-170 does) |
| Effect latency | action on obs N acts on ticks N+1, N+2; visible in obs N+2. One-shot parts act on the first tick; `fire` is held both ticks. Minimum reaction 0.1 s |
| `hello` | `ready` within 20 s; `seed` fixed per slot, not the match seed |
| Result page "wait X ms" | queue time before scoring, not our latency [M: identical builds 9-527 ms] |

Observation contents: `self` (pos, vel, actual aim, hp, max_hp, energy, grounded, cubes, upgrades, in_zone, weapons with
cooldown / ammo / reload / charge and post-upgrade stats, post-upgrade mech stats); `mechs` = everything seen now or
remembered (mechs and drones: pos, vel, aim, hp, max_hp, cubes, weapons, charging); `projectiles` (enemy bullets and
shells with velocity); `crates` (hp), `cubes`, `pickups` (only while seen); `sounds`, `beams`, `events` since the last
obs; `drops` and `zone` always known; `offer`. **No delay on positions**: a listed mech is at its true current position,
including for 5 s after it leaves view, with live hp / aim / charging [S 2/2 expiries at 4.9 / 5.1 s]. Own beams are not in `beams`.

## 3. Bodies, weapons, damage [P][C]

Mech: cylinder r 2.5 m, h 9 m, eye +8, muzzle +7; all scale by 1 + 0.05 x cubes (no cap). 1,400 hp. Walk 11.7, boost
19.5 m/s, ground accel 58.5 (walk reversal 0.40 s), turn 4 rad/s yaw, 3 pitch. Shots leave along the ACTUAL torso aim,
3 m out. **Rear**: a hit from outside the 180 deg front arc of the torso yaw deals x1.5 (judged by bullet path, beam
origin, blast point). Legs are independent of the torso.

| Weapon | Damage | Rate | Range | Other | Ideal dps [A] |
|---|---|---|---|---|---|
| gun (slot 0 at spawn) | 45 | 0.24 s; mag 12, reload 2.4 s | 230 m, 252 m/s, spread 0.6 deg | lead needed; hit on a standing mech 99 / 92 / 82 / 76% at 100 / 150 / 200 / 230 m [R] | 187 burst, 107 sustained (540 per 5.04 s). 1,400 hp = 32 hits = 11.8 s |
| laser | 315 x (0.35 + 0.65 x charge/0.75) | charge 0.75 s, then cooldown 1.65 s | 280 m hitscan, no spread | half speed while charging; `charging` and aim visible; sound 140 m; +60% on a mortar holder; partial release from 0.15 s | 131 (one beam per 2.4 s). 1,400 hp = 5 beams = 10.4 s; gun + laser 238 = 5.9 s |
| lightning | 60, chain x0.7 to 2 more within 14 m | 0.25 s | 45 m, cone 30 deg, needs a line | 3 energy per shot (12/s; energy does not regenerate while firing); hits the NEAREST target in the cone, crates and drones included; shorts a laser for 2 s | 240 single; 100 energy = 33 shots = 2,000 damage in 8.3 s |
| mortar | 200 direct + splash 160 falling to 30% at 7 m | 2.6 s | 72 m/s, gravity 22, about 235 m max | own splash 50%; knock 16 m/s + 45 energy drain; walls block splash | 77-138 |

Triangle: laser beats mortar, mortar beats lightning, lightning beats laser; gun neutral. Cubes multiply all damage
(section 6). Trees stop sight, never shots. Equip delay after `take`: max(1 s, cooldown).

House bots as shooters [R][S][M-other]: first-order lead with no noise; fire on the first obs showing cooldown 0 (0.30 s
cadence, we fire at 0.24-0.25 by holding the trigger: params.js:30 `readyCd`, firecontrol.js:226); 12 rounds then 2.5 s
silent, never reload early (72/72); first shot 0.25 / 0.65 / 1.15 s (p10 / p25 / p50) after a line opens; laser released
only at full charge, 2.4 s between beams; never retreat, never heal, under 20% hp they still close; aim at body centre.
**Their gun dps on us by range: 51 / 51 / 27 / 11 at 40 / 75 / 110 / 150 m; a house laser adds about 35** [M S05/S07 via
panel_r6]. A velocity reversal during the bullet flight cuts their hit rate from 84% to 22% beyond 75 m; under 75 m
nothing dodges a gun.

## 4. Hp, energy, boost [P][C]

| Fact | Value |
|---|---|
| Hp regeneration | 45 hp/s after 5 s **without dealing or taking damage**, only inside the zone. Zone damage restarts the 5 s. Empty to full = 5 + 31 s |
| What resets it | any damage taken; any hit we land on a mech or drone [S][R]; crate hits: old build no, current build unknown [N]; misses never |
| What does not matter | moving, boosting, aiming, charging a laser, looting. Regeneration runs in every mode |
| House bots regenerate by the same rule | a hunter that is hitting us never regenerates; one that lost its line and is not shot for 5 s gets 45 hp/s back |
| Instant heals (ignore the timer) | cube: +4% max hp, healed (+56); plating: +15% max hp, healed (+210 at base) [R]; supply drop: full hp |
| Energy | 100; regenerates 18/s from 0.6 s after the last spend. Boost 17/s on the ground (5.9 s = 115 m of boost), jet 15/s (60 m climb), lightning 3 per shot |
| Armor | upgrade only (-8% each, max 3); reduces weapon damage, not zone damage |

## 5. The three "pause" clocks (for the wait-type design)

| Pause | Condition | What it buys | What breaks it |
|---|---|---|---|
| Trigger pause | no hit landed on a mech or drone and no damage taken for 5 s, inside the zone | 45 hp/s (225 hp per 5 s once running) | one gun hit (45 damage) costs up to 5 s x 45 = 225 hp of our regeneration; being hit; stepping outside |
| Energy pause | 0.6 s without boost, jet or lightning | 18 energy/s | a single boosted decision restarts the 0.6 s |
| Sound pause | ground speed <= 5 m/s (stick <= 0.42) or standing | no `step` sound (heard to 40 m); boost and jet are heard to 90 m, gun 320 m, laser charge 140 m | walking at full stick |

Evidence on pausing, all official [M]: hide-and-heal rules lost every time they were tried on a fighting bot (ours:
healDoc on -0.21, FHE40 -0.09, FNV "never leave" = best 5.38; others: A01 -0.50, A02 -0.44, A13 -0.69, A25 -1.10, quiet
walking off +0.21). Reasons that follow from the rules: the squad shares vision and the server gives every viewer our
true position for 5 s after the last sighting, so cover stops bullets but not pursuit; hunters never retreat, so a
pause lets several arrive together instead of one after another; lulls are short [S: median 6.3 s, 14% last 13 s].
So the pause that the rules actually pay for is narrow: **a trigger pause in a true lull** (no line on us, no kill in
reach) and never a movement pause. Whether a lull exists officially after a kill ("next hunters walk in from 150-400 m,
13-35 s" [A, schedule N]) is the open question; the simulator cannot answer it.

## 6. Cubes, upgrades, crates, drones, drops [P][C]

| Item | Facts |
|---|---|
| Cube | auto-pickup within 3.5 m (4 m vertical), closest mech wins. +4% max hp (healed) and +4% damage each up to 10 (1,960 hp, x1.4 damage); +5% size each, no cap |
| Sources | crate 1 (36 crates, 300 hp = 7 gun hits or one full beam; 50% also drop a weapon); drone 2 (12 drones, 350 hp, shoot back 25 per s, hits on them reset regeneration); **dead mech: all its cubes + 2**, scattered up to 5 m round the corpse, plus its non-gun weapons; supply drop 3 |
| Offers | at 1, 3, 6, 10, 15, 21 ... cubes: 3 choices, `pick` 0-2, default choice 0 after 5 s; weapon upgrades only for kinds held when the offer is drawn; upgrades stay with the mech |
| Upgrades (max) | plating +15% max hp (3); armor -8% damage taken (3); servos +8% speed (3); capacitor +30 energy (3); reactor +30% energy regen (3); jets -25% drain (2); nanites +60% regen, delay -1.5 s (2); gyros +30% turn (2); sensors +15 m near, +25 m vision (2); gun_damage +15% (3); gun_rate cooldown x0.87 (3); gun_velocity +25% speed, +15% range (2); gun_mag +8, reload x0.8 (2); mortar_splash (2), mortar_reload (3), mortar_velocity (2); laser_charge x0.75 (2); laser_damage +18% (3); laser_pierce (1); lightning_chain +1 (2); lightning_range +20% (2); lightning_efficiency -35% cost, +10% damage (2) |
| Floor weapons | 40 at start, a quarter on roofs, mortar : laser : lightning 1:1:1 (about 10 ground lasers; mean distance to the nearest about 125 m [A]); `take` within 4 m; never despawn |
| **Supply drops** | called at 70 / 140 / 210 s, land 25 s later (**95 / 165 / 235 s**) on open ground inside the circle the zone is closing to (within 0.7 of it); position known to all from the call. Stand in the 8 m ring **alone** for 4 s: **+3 cubes, full hp, full energy**. Two or more in the ring freeze the clock; an emptied ring or a new sole occupant restarts it. `holder` / `progress` visible to all. Nothing in the rules lets damage interrupt a capture [N, assumed] |

## 7. Zone [P][C]

Start radius 560 m at (41.3, -72.8). Hold / shrink (s): 0-60 / 60-110 to 380 m at 20 hp/s; 110-155 / 155-195 to 240 at
35; 195-230 / 230-265 to 140 at 60; 265-295 / 295-325 to 70 at 100; 325-350 / 350-375 to 25 at 160; 375-390 / 390-415 to
0 at 260. Outside: that dps, no armor, no regeneration. The edge moves at most 7.2 m/s (phase 1), below walk speed.
In our lifetime only phase 1 exists: 20 hp/s is less than half of one house gun line at 75 m.

## 8. House squad: what is known and what is not

Known [track page]: tiers 4/4/4/3, shared vision, never fight each other, weakest hunter first, one early, more per
kill, all late. Individual habits: section 3. In the simulator the chance that the next fight has two or more lines is
0.34 / 0.55 / 0.64 / 0.88 after 0 / 1 / 2 / 3 kills; a one-line fight costs 221 hp for 0.75 kills (death 6%), two lines
893 hp for 1.04 kills (death 70%) [S, behaviour only]. **Unknown [N]**: how many hunters after k kills, what "late"
means, whether non-hunters return fire or walk into a supply ring, whether tiers differ in aim or only in order.
Board reading [M]: 4 easy bots die for most teams (cluster at 4.0-4.25); 5.38 is about 4 easy + 1.4 medium.

## 9. Facts our code uses wrongly or not at all (ckpt_07_LG)

| # | Rule fact | Code | Status |
|---|---|---|---|
| 1 | Supply drop = full hp + full energy + 3 cubes, at 95 s, position known from 70 s | `lib/tactics.js:487-489`: DROP ranks below FIGHT, so with any target (always, under 15 hunters) it never runs. `lib/economy.js:222-249`: also refused when any tracked mech is within `dropContestR` 60 m of the ring (params.js:86), when we would arrive more than 3 s early, or when hp <= A x (tApp + 4) + 200; `lib/steal.js:227`: never when a mech is in the ring. No fight-leg term pulls the fight toward the ring (`dropTask` is read only at brain.js:227, hunt.js:304) | **not used in practice**. Sim: alive at the first landing in 5 of 40 |
| 2 | Regeneration clock: 5 s without dealing or taking damage | `me.lastDealtT` is written at `lib/senses.js:278` and never read; `me.regenDelay` / `regenPerS` (senses.js:97-98) never read. HEAL entry uses a 1.5 s line-quiet test (`tactics.js:471`), fire is held only inside HEAL (`tactics.js:500`), the gun gate has no regeneration term (`firecontrol.js:226`) | **not modelled**. No decision knows whether regeneration is running, or what the next hit costs (up to 225 hp) |
| 3 | A kill counts only at hp 0; damage left in a wounded mech at our death is worth 0 | Selected focus 'mult' scores `100 / (dist + 20)` (`tactics.js:319`); target hp enters only through `finishable` (current burst kills) and the 25% keep rule (`tactics.js:335`). "Quickest kill" scoring exists only under `B.lastStand` (`tactics.js:302, 330`), which needs hp < 25%, >= 2 attackers and no cover within 3 s: `tCover > 3` is a literal at `tactics.js:476`. With loseCover 'never' and a cell within 3 s we neither leave nor switch to quickest-kill (dead band, already noted by r2_game) | **used late and narrowly**. Sim: the last 10 s hold about one kill of damage spread over 2.5 targets |
| 4 | Rear x1.5 from outside the 180 deg front arc; legs independent of torso | Reactive only: `lib/scan.js:34, 114` (face a rear hitter for 1.5 s) and the torso veto `tactics.js:340-351` (attacker >= 60 dps and > 80 deg off the target). No term in `tactics.js` exposure / position evaluation places us so that all lines fall inside one 180 deg arc; `damaged.rear` share is not counted anywhere | **partly used**; the size of our rear intake is unmeasured |
| 5 | House gun: 12 rounds then 2.4 s silent, never reloads early | `lib/brain.js:459-460`: the window only shortens the band, and only when we hold no laser. Not in the veto, not in LOSING; the sensor fires about 0.5 times per match in the sim (fable/r1_psych) | **barely used** |
| 6 | Upgrade ids | `lib/params.js:194-196`: `mortar_damage`, `mortar_rate` do not exist (real ids: `mortar_reload`, `mortar_velocity`); unknown ids score 100, so harmless. `nanites` is ranked 3rd although the selected doctrine never leaves a fight, where regeneration never runs | **minor / questionable order** |
| 7 | Lightning hits the nearest target in the cone, crates and drones included | `lib/firecontrol.js:337-349` tests mechs (and drones that hit us) only: a nearer crate or drone in the cone takes the arc and we pay 3 energy | **wrong in a corner case** |
| 8 | Phase-1 zone is 20 hp/s | `lib/tactics.js:480` ZONE outranks everything; `lib/mover.js:367-374`: "far" from 0.8 x next radius with a 12 s lead, released only inside 0.6 x (literal). 12% of mech intake is taken in ZONE mode [S]. A sim check of a later rotation showed about 0 | **over-cautious, low value** |
| 9 | Config is the rule set | `lib/params.js:20-21` `latency 0.10`, `tickS 0.05` are constants; `anchorToConfig` (`lib/brain.js:151-179`) does not derive them from `match.tick_hz` / `decide_every` | fine today; wrong after a config change |
| 10 | Kill drop = corpse cubes + 2, i.e. at least +112 hp instantly and +8% damage | `lib/params.js:82`: `killCubeR 200`, `killCubeThreats 1`, `grabHpf 0.5`; the selected laser band is 125-185 m (`laserRange: 'far'`), so a laser kill leaves its cubes 125-185 m away among the hunters. I did not trace `economy.js:160-220` line by line: treat the gate reading as to be verified | **range and cube income pull against each other**; collection rate unmeasured |
| - | Used correctly | trigger held at cooldown <= 0.10 (firecontrol.js:226); partial laser release when it kills, rear and cook-off in the estimate (firecontrol.js:267-268); gun fires during a laser charge (same file); newest-obs rule and sanitiser (bot.js); 5 s server memory via `tr.listed`; mortar never taken in SQUAD (economy.js:36) | |

## 10. The three mechanics with the largest kill-before-death gain

Ranked by size from the identity in section 0.3. None is verified officially; sizes are arithmetic, not predictions.

**1. The exchange ratio by range and weapon: a laser held from the first seconds.** [A on M-derived rates]
House gun dps on us falls 51 -> 27 -> 11 from 75 to 110 to 150 m (their spread and first-order lead), while a laser has
no spread to 280 m. Toy table (panel_r6 2.1): gun vs gun costs 532-915 hp per kill; gun + laser vs gun 138-376. Our
average is 390. We hold a laser in only 15-18% of decisions before the third kill [S]. If the first three kills cost
250 hp each instead of about 500, the same 2,100 hp budget carries 2-3 more kills. Counter-evidence [M]: LG wide read
5.04 against 5.23 (one draw, sd 0.24), and other teams' laser detours are mixed (+0.33, +0.33, -0.06, -0.11). The
mechanism is sound; the detour (time unarmed, walking into hunters) is what has cost. Design question for the panel:
get the laser inside the opening 20 s, when "nothing can hurt us" (first hurt at a median 32 s [S]), not mid-fight.

**2. Supply drop 1 as a second life.** [P for the facts; N for squad behaviour]
It lands at 95 s, where we die, inside the circle we must rotate into anyway, and gives full hp + 3 cubes (about 1,570
max hp) + full energy: roughly +1,000 to +1,400 hp of budget = 2.5-3.5 kills at 390 hp per kill, for 4 s alone in an
8 m ring. Standing in it under three lines costs about 4 s x 150 = 600 hp, so it pays only when entered with more than
that. Today it is unreachable by construction (row 1). Risks: a house bot in the ring freezes the clock and a house
capture heals a house bot; other teams' drop chases read -0.21 / -0.08 / +0.02 [M]. It is the only single mechanic of
the size of the gap to 9, and drops 2 and 3 (165, 235 s) repeat it for a bot that survives the first.

**3. Converting damage into deaths before ours: finish order and kill cubes.** [A][S]
(a) Damage in a mech that is still alive when we die scores nothing; the simulator shows about one kill of it at
every death. A quickest-kill target rule below a set hp (not only when "doomed") is worth up to about +0.5-1.0.
(b) Each kill drops at least 2 cubes = +112 hp healed at once and +8% damage, with no regeneration delay; five kills
collected would be +560 hp and x1.4 damage (the cap). This conflicts with fighting at 125-185 m (row 10).

Smaller, real, cheap: rear geometry (x1.5 on every line outside our front arc); the trigger pause in a true lull
(section 5); their 2.4 s reload and 2.4 s laser gaps.

## 11. Limits of this note

- I ran no simulator job and read no official replay myself; every [S]/[R] number is quoted from the notes named.
- Hunter assignment, non-hunter behaviour at a supply ring, crate hits versus regeneration, same-tick deaths and
  damage during a capture are unknown. Each mechanic in section 10 rests on at least one of them.
- Section 9 row 10 and the claim "no rear term in position evaluation" come from grep and partial reading, not a
  full trace of `economy.js` and `tactics.js:547-752`.
