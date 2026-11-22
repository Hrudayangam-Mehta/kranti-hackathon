# Panel R5: game-design expert (the design as intended, its dominant strategies, phase rules, hunt50)

Written Sat 21 Nov 2026, 19:35-20:15 UTC, by the panel's game-design expert (Opus sub-agent). Read-only on
`variants/V4/bot` (four greps: `params.js` SELECT/PRESETS, `tactics.js` `losing` / `decideMode`); `bot/`, `sim/` and
`intel/` were not opened or edited. Inputs: HANDOFF.md, DOCTRINE V4, `kit/protocol.md`, `notes/hello_example.json`
(config), `notes/{panel_r5_research,top5_synthesis,measured_deltas,mechanics_deep,intel_synthesis,rules_audit,
showdown_profiles,panel_r4_gameplay,panel_r4_past_events,build_spec_r4,submissions,panel_5_game_design}.md`,
`notes/intel/top5_kyoto_max.md` (our own black-box study).

New arithmetic: `tools/panel_r5/design_arith.py` (stdlib; output `tools/panel_r5/design_arith_out.txt`; run
`python3 -I -B tools/panel_r5/design_arith.py`, under 1 s). It uses only the config and numbers from our notes. Its
models are toys: they rank options and they do not predict scores.

Tags:
- [R] rules text (protocol, track page);
- [M] official one-change result;
- [T] a 6+ bot's choice;
- [S] our simulator (behaviour only; within-bot deltas have had the wrong sign six times);
- [rec] statistics from recorded public free-for-alls (showdown_profiles.md);
- [A] arithmetic (`design_arith.py`, `arith.py`, `burst_table.py`);
- [L] literature (research brief);
- [N] no evidence.

Clean room: no other team's code or identifiers. Everything about the 6+ bots comes from our own notes (black-box
runs, commit subjects, prose).

---

## 0. Verdict in brief

1. **HP is the currency.** The designers built one loop: kill, walk onto the corpse (its cubes + 2, and every non-gun
   weapon it held), grow, kill again. Regeneration refunds HP only to a mech that stays 5 s without dealing or taking
   damage. In practice the squad's intake rate is fixed: about 1,300-1,400 HP per minute alive for kyoto, the 5.58 bot
   and us alike [S]. So the score is roughly (damage dealt per exposed second / damage taken per exposed second)
   x (HP budget) / (HP of output per kill, about 1,430) [A §3].
   - Every rule below raises one of these terms: output while exposed, less intake while exposed, or HP refunded while
     not exposed.
2. **The weapon triangle is range-gated, and the squad's range breaks it.** Lightning counters only inside 45 m.
   House hunters fight at 100-150 m and never close inside 45 m. So in practice the triangle collapses to
   "gun + laser, never mortar". All three 6+ bots play that. The triangle comes back in the final, where mechs close:
   six of seven recorded winners held laser + lightning.
3. **The squad is a director (an AI that paces the threat) running a known script.**
   - Weakest first, one hunter early, more per kill, all of them late.
   - The pressure comes in waves, so each kill opens a lull before the next token holder arrives.
   - The two dominant plays are: convert each wave quickly, and spend the lull on free HP.
   - V4's heal breaks (+0.17 reading) are with the grain; the 16% of our life spent roaming is against it.
4. **Our largest misfit is the weapon economy, not the fight.**
   - In the simulator V1 holds a laser in 1 of 6 matches; kyoto holds one by 24-50 s in 4 of 6.
   - At 110 m a fresh hunter dies in 19.7 s to our gun alone and in 7.7 s to gun + laser [A §1].
   - Weapon upgrades are offered only for held weapons, so a late laser also loses the laser upgrades.
5. **Second misfit: walking under fire.** Isolate and hide legs lose 72-73 HP/s against 42 in a stand-off [S]. V4
   still disengages at 6+ threats even with no hide cell; only the pulse variant fights on without one.
6. **hunt50 is native to the final, not to practice.**
   - The "other 50%" of the kill is supplied by the duel we join, and breaking the line really sheds pursuit when
     nobody shares vision.
   - In practice its retreat pays only when cover is within about 0.6 s (7 m) [A §6]. The R4 spec allows 1.5 s;
     at that distance the walk out and back eats the whole saving.
   - So in practice it fits only the escalation phase, with the pulse capped at 7 m.
7. **Phase rules:** section 4 (practice) and section 5 (final). Every rule names a preset; old value = V4 byte for
   byte. Recommended single-change draws on V4 are in section 7.

---

## 1. The design as its designers built it

### 1.1 The core loop and its currency

| Design element | Rule [R] | What it rewards |
|---|---|---|
| Kill drop | all cubes + 2, every non-gun weapon, on the surface within 5 m of the corpse | the corpse run: kyoto picked up 56 of its 84 cubes within 8 s of its own kills [S] |
| Cube | +4% max HP (healed) and +4% damage, cap 10; +5% size, no cap | snowball to 10 (x1.4 HP, x1.4 damage = x1.96 power), then a rubber band (bigger target, no stats) |
| Regen | 45 HP/s after 5 s without dealing or taking damage, inside the zone | finish what you start (spread damage heals); free HP in any quiet 5 s |
| Rear armour | x1.5 outside the torso's 180 degree front arc | facing the threat; flanking a busy target |
| Torso | one yaw is the aim, the 120 degree view wedge and the front-armour arc | dead-time torso use (scan and face threats while nothing can fire) |
| Laser | hitscan, 0.75 s visible and audible charge, 1.65 s cooldown, damage 35-100% by charge | range without spread; partial release when it kills |
| Gun | 252 m/s projectile, 12-round magazine, 2.4 s reload | the always-present filler; it decays with range against a mover |

HP ledger, from our own black-box runs on the same six seeds [S, A §3]:

| Bot | output / intake | HP taken per match | output per kill | damage into mechs never killed |
|---|---:|---:|---:|---:|
| kyoto v43 (6.31) | 4.30 | 2,216 | 1,445 | 852 (0.59 kills) |
| 5.58 bot | 4.02 | 2,071 | 1,517 | 1,493 (0.98 kills) |
| ours 5.02 | 2.58 | 2,184 | 1,425 | 1,349 (0.95 kills) |

All three take about the same HP before they die (2,100-2,200) at the same rate. The squad sets both numbers. What
separates the bots is output per exposed second and waste.

Sensitivity on a V4-like profile [A §4, upper bounds]:

| Change | Kills |
|---|---:|
| +10% output | +0.59 |
| 500 less waste | +0.35 |
| 225 HP refunded in a lull that had no target | up to +0.58 |
| 8% less intake | +0.51 |

### 1.2 The weapon triangle

Intended [R]:
- Laser beats mortar: cook-off x1.6 makes a full beam 504 on a mortar holder, and the laser outranges the shell
  (280 m against about 235 m).
- Mortar beats lightning: knock 16 m/s plus 9 up throws the carrier out of 45 m, and the drain of 45 energy is
  15 zaps.
- Lightning beats laser: a short cancels the charge and blocks a new one for 2 s, and it deals 240 auto-aimed dps
  inside 45 m.
- The gun is neutral.

How it plays:
- **Practice.** The counters are range-gated: lightning works at 45 m or less, and the mortar is slow (72 m/s
  shell, 2.6 s cooldown). House hunters fight at 100-150 m and never close inside 45 m [R, one source], so only the
  laser keeps its full strength. Its hitscan has no spread and no flight time.
  - At 100-130 m the house gun lands 31% on real bots [M S05]: a gun-only hunter at 110 m deals about 27 dps, less
    than our regen.
  - A gun + laser hunter deals about 105 dps [A §2]. The laser is 3.8x the threat and the right target first.
  - Dominant: gun + laser at 100-130 m, never a mortar (a liability against laser hunters: cook-off). This is the
    play of all three 6+ bots [T x3].
- **Final.** Mechs close in. Recorded winners are 6 of 7 laser + lightning, with laser 70% and lightning 15% of
  their damage [rec]. Lightning becomes the counter to a laser kiter inside 40 m.

### 1.3 The regen and zone economy

- Regen is the design's anti-chip rule:
  - a target left alone for 5 s heals 45 HP/s, so a 50% hunter is full again 20.6 s later;
  - a mech that keeps shooting never regenerates (dealing damage resets its own timer), and neither do we while we
    shoot crates or drones (drones certainly; crates unverified on this build).
- Retreats longer than 5 s gift HP to every damaged hunter that loses its line. This is the reason for the 4 s cap on
  any pulse.
- Lull refunds [A §5]:

  | Lull length | Our regen | With nanites (72 HP/s after 3.5 s) |
  |---:|---:|---:|
  | 6 s | 45 HP | 180 HP |
  | 10 s | 225 HP | 468 HP |
  | 13 s | 360 HP | 684 HP |

  Nanites double the value of every lull.
- Zone:
  - Phases 1-2 (20 and 35 HP/s) cost less than one second of regen, so early zone edges are soft.
  - From phase 3 (60, then 100, 160, 260 HP/s) the zone outruns regen.
  - At 415 s the circle is a point. Death order is then HP order (armour does not count), so max HP decides the
    last places.
  - Practice matches end for us at about 95-140 s, so in practice the zone only shapes where the squad parks: house
    bots sit at 0.41 of the next radius and arrive 33-58 s early.

### 1.4 The squad's hunting schedule

[R] 15 house bots (4 easy, 4 medium, 4 hard, 3 expert), shared vision, never fighting each other. They "hunt you
weakest first (one early, more as you thin them out, all of them late)". The script is known [R, our forensics]:
- exact first-order lead, a shot every 0.30 s, 12-round magazines, then 2.5 s silent;
- strafe reversal about every 1.1 s, hop 32% of fight time;
- laser released 16 ticks after the charge starts;
- first shot a median 1.15 s after a line opens;
- nearest target; no retreat or heal.

Design reading:
- It is an attack-token director, a difficulty ramp with no designed relax phase.
- Each kill raises the pressure and calls a harder tier. Kills 1-4 are the easy tier; the cut (about 5.3-5.9)
  means converting 1-2 medium bots; kyoto's 6.31 is about 2.3 mediums.
- **The marginal point for us is a medium-tier kill made while 2-3 hunters have lines on us.** Our gains will come
  from rules that act under 2-3 lines and in the lull after each kill.
- Shared vision plus the 5 s memory means breaking contact does not hide us. It only blocks shots.
- What escalates (kill count, clock, or both) is unknown [A2 open]. Fighting earlier +0.38 and heal breaks +0.17
  (both our readings, sd 0.24) fit both: the opening cost output without saving intake, and the heal refunded HP
  without exposure.

### 1.5 Cubes and upgrades

- Thresholds 1, 3, 6, 10 (then 15, 21, ...) give four offers by 10 cubes [R].
- Each offer draws 3 choices from upgrades for the weapons **held when it is drawn**. This is a design coupling:
  hold the laser before cubes 1, 3 and 6, or laser_damage cannot appear.
- Values for score = (output / intake) x budget [A §11, toy]:

  | Upgrade | Gun only | Gun + laser (gun 40% of damage) |
  |---|---:|---:|
  | gun_mag | +30% | +12% |
  | gun_damage | +15% | +6% |
  | laser_damage | 0 | +11%, and the breakpoint: a fresh 1400 HP mech dies to 4 beams instead of 5 |
  | plating | +9% | +9% |
  | armor | +9% | +9% |

  Nanites act only through lulls: +100-200 HP per 10 s lull.
- Our `upg: 'speed'` order (plating, armor, servos, nanites, laser_damage, ...) puts every output upgrade at 5th or
  later, and gun_mag 14th. No team has an A/B on this; it is a 0.1-level item.

### 1.6 Supply drops

[R] Called at 70 / 140 / 210 s, landing 25 s later inside 0.7 of the next circle. Holding the 8 m ring alone for
4 s gives 3 cubes, full HP and full energy. A second mech freezes the clock; damage does not interrupt it. Every mech
sees every drop.

Design: scheduled conflict magnets carrying a second life. From 45% HP a drop is about 770 HP plus 168 max HP, about
40 s of squad intake [A §9].

In practice:
- Drop 1 lands at 95 s, exactly when every top bot dies.
- It lands inside the circle where the squad parks.
- The 4 s capture costs about 240 HP under one line and about 1,200 under three.
- Measured: chasing drops -0.21 and -0.08, uncontested and in time +0.02 [M]. Take one only at one line or none.

Final: winners averaged 1.0 drops. A ring holder is a stationary target whose position everyone knows, which makes it
the vulture's prey.

### 1.7 What the practice format rewards

- Score = mean house deaths before ours over 48 fixed seeds [R].
- Deterministic play repeats exactly; a salt re-rolls the draw (sd about 0.17).
- Only the best score counts, and ties go to the earlier submission.
- So the format rewards a **best response to a fixed script**: in the RTS literature a best response wins 95-100%
  against a fixed script [L]. It also rewards many one-change draws.
- It does not reward survival as such. Our death time is set by the pile-up; the kills before it are the score.

### 1.8 What the final rewards

- Place, not kills: 16 - place, means over 16 and then 64 matches; winner takes all.
- The bottom half dies after a median 21 s. Those mechs deal damage as fast as the winners but take it 4.6x
  faster [rec].
- Crowding is the killer: deaths per minute are 0.36 alone, 2.02 with one mech within 60 m and 4.58 with two. Over
  60 s that is survival of 70%, 13% and 1% [A §10].
- Winners keep 187 m from the nearest mech, aim 47% of their hits at targets under half HP, peak at 26 cubes, and end
  with 0.90 of their HP.
- At 415 s HP is place.

---

## 2. Dominant strategies the design allows

| # | Strategy | Design reason | 6+ bots | Ours (V4) |
|---|---|---|---|---|
| S1 | Gun + laser held at 100-130 m; gun fills the cooldown; never a mortar | hitscan does not decay with range; the house gun hits 31% there | kyoto, giddy, Kanyaraasi (laser hold 120 m) | band 115 m yes; laser in hand rarely [S] |
| S2 | Laser in hand before cube thresholds 1-3 (about 25-50 s) | TTK 7.7 s against 19.7 s; laser upgrades become drawable | kyoto 4 of 6 by 50 s; giddy laser-first kept [M] | seek out of contact only (13% of life) |
| S3 | Corpse run within 8 s of a kill (cubes + its weapons) | kill drop + 2; cubes go to the nearest mech within 3.5 m | kyoto 56 of 84 cubes | cubes yes (to 200 m); weapons lost (victim loadout not kept) |
| S4 | Lethal partial laser release; backstab x1.5 | damage scales with charge; rear arc | kyoto 16 lethal partials, v35-v36 kept | partial yes; rear in the kill check yes |
| S5 | Fight from about 20 s against the weakest-first hunter | the cheapest kill of the match comes first | all three (first damage 16-30 s) | yes since R3a2 (+0.38 reading) |
| S6 | Focus: never leave a damaged target for 5 s | regen erases spread damage | kyoto waste 852; giddy kept three focus retunes [M] | focus 'add' (hp + distance, not threat) |
| S7 | Constant velocity changes and energy spending | exact linear lead misses any velocity change once flight exceeds 0.31-0.34 s | kyoto boosts 20% of the time (v38-v43 kept) | boost spend yes; dodge open-loop |
| S8 | Recover in the lull between token holders | passive regen after 5 s; the next holder must walk in | none (kyoto rejected walled-cell heals: -0.08) | V4 heal breaks (+0.17 reading): with the grain |
| S9 | Exploit the script's timing: first shot 1.15 s after a line opens, 2.5 s gun silence, 2.4 s laser dead window, fixed 0.30 s cadence | known fixed script | partly (kyoto hearing v34, charge sidesteps) | D4 reload window yes; cadence and laser window no |
| S10 | Final: go quiet after the first foreign death; vulture, do not start | crowding; place scoring; 5 s memory sheds pursuit | all three latch 0.5 s after the first foreign death | latch at 3 foreign deaths; D11 hide-first |

S8 and S9 are open to us. No 6+ bot uses S8; S9 is used only in part.

---

## 3. Where our bot plays against the grain (ranked by design weight; numbers from the notes)

| # | Against the grain | Evidence | Design reason it costs | Preset that fixes it |
|---|---|---|---|---|
| G1 | **No laser most of the match** | V1: laser in 1 of 6 [S]; 3.5-4.2 laser shots per match against kyoto's 11.7; R3a2's laser seek runs only out of contact, and fighting from 20 s removed most such time | TTK x2.6 slower; laser upgrades never drawn; a 1.65 s laser lock after a late take | `laserGrab: 'arm'` (R4b `wide` plus a spawn sweep, 4.1) + `killDrop: 'weapons'` (GP I8) |
| G2 | **Lull wasted** | HOLD/roam 16% of life; 7 of 20 kill-to-hit gaps last 10-17 s [S] | the token director brings the next hunter; roaming meets it on its terms, unaimed and uncharged | `seek: 'lull'` (4.3) |
| G3 | **Walking legs under fire** | isolate 10% of life at 73 HP/s, hide 9.4% at 72 HP/s, against stand-off at 42 HP/s and 175 dealt [S]; V4 `decideMode` disengages even with no hide cell (only the pulse variant fights on) | shared vision: cover blocks shots, never knowledge; the walk is intake without output | `isolate: 'near'` (GP I3) + `loseCover: 'near'` (4.4) |
| G4 | **Target order by HP, not threat** | the focus cost d + 0.1 x hp picks the gun-only 900 HP bot over the gun + laser 1400 HP bot; damage taken 2,173 against 2,007 [A] | Smith's rule: kill in decreasing threat / TTK; the laser hunter is 3.8x the threat at 110 m | `focus: 'av'` (research item 1) |
| G5 | **Waste** | V1 puts a mean 1,123 damage per match into mechs it never kills (about 0.8 kills); kyoto 852 [S] | regen refunds the target every 5 s of neglect | `focus: 'av'` (no-overkill) + the 4 s pulse cap |
| G6 | **Retreat in the pile-up** | d3 LOSING at 6+ threats sends DISENGAGE with or without cover; kyoto's fatal fights start at 70-100% HP and convert 1.7 kills [S] | "all of them late" is a deadline: fleeing under shared vision buys no time | `loseCover: 'near'` + `lastGasp: 'on'` (GP I7) |
| G7 | **Defence-first upgrades for a gun-heavy bot** | servos 3rd, laser_damage 5th, gun_mag 14th | gun_mag +30% output gun-only; laser_damage removes one beam per kill | `upg: 'kill'` (GP I9) [no A/B] |
| G8 | **Final: slow latch; mid band in FFA** | latch at 3 foreign deaths against the top bots' first death; the 115 m band applies in FFA (GP R7) | the bottom half dies after a median 21 s; kyoto-type bots are strongest at 70-120 m | `ffaOpenGuard: 'on'`, `laserRangeFfa: 'far'` (R4b) |

With the grain, keep these:
- V4 heal breaks;
- bullet-aware dodges;
- the D0 hostile answer;
- the gun kept in SQUAD;
- zero zone deaths;
- determinism.

---

## 4. Practice phase rules

Phases are keyed on observable state. Times are typical, not triggers. `k` = our kills, which in practice equals
house deaths, because house bots die only to us or the zone. "Lines" = non-NPC mechs with a line of fire on us within
the last 1 s.

### 4.1 P0 Opening (0-30 s, k = 0, no hostile yet). Preset `laserGrab: 'arm'` (new option: R4b `wide` + spawn sweep)

Rules:
- 0-1.6 s: one full torso turn (360 degrees at 4 rad/s) to list pickups and crates in the 200 m wedge.
- Goals, by value / path time:
  1. a laser pickup within 240 m of path (ground: no more than 2 m above terrain); boost toward it beyond 150 m when
     energy >= 90;
  2. if no laser is known, a lightning within 80 m (swap it out for the laser later, never while charging);
  3. crates within 60 m of the path (7 rounds, or one beam; each crate is a 1-in-6 laser chance);
  4. drones only within 80 m with no mech listed.
- No voluntary mech fight before 20 s. Answer any D0-hostile mech at once.

Numbers [A]:
- About 15 lasers lie at ground level: about 10 of the 40 floor spawns (a third are lasers, three quarters on the
  ground) plus about 4.5 inside the 27 ground crates. Over about 0.6 km² of open map the nearest is about 100 m away
  (140 m of path).
- At 110 m, TTK on a fresh hunter is 19.7 s with the gun alone and 7.7 s with gun + laser.
- Thresholds 1 and 3 usually come by 30 s (kyoto: 3-4 cubes and 2 upgrades by 30 s in 4 of 6 matches).

Design reason: the first hunter comes at about 20-30 s and nothing can hurt us before. A laser held by then makes the
match's two cheapest offers drawable as laser upgrades.

Evidence: [T x3] laser-first kept (kyoto v32, giddy); [M] three laser-first walks at weaker bots -0.06 to -0.11;
[S] V1 holds a laser in 1 of 6.

### 4.2 P1 First hunter (k = 0, its first hostile sign until its death; one line; easy tier). Presets: kept `fightEarly: 'on'`; new `dodge: 'sync'`; GP I8 `killDrop: 'weapons'`

Rules:
- Commit. With one line, retreat only under 35% HP with its HP fraction >= ours + 0.10 (D3, as in V4).
- Range: gun + laser hold 115 m (100-130); gun only 75 m (55-95).
- Use its script:
  - close in or cross open ground during its 2.5 s silence after the 12th bullet;
  - release our beam inside its laser's 2.4 s dead window;
  - **`dodge: 'sync'`**: brake or start on its predicted fire ticks (0.30 s cadence) whenever its bullet flight is
    at least 0.34 s (86 m or more). Phase-locked, every bullet misses from 85 m; open-loop the miss rate is 20-73%
    [A arith §1-2]. Never reverse on the cadence.
- Trigger held at cooldown <= 0.1 s. Lethal partial release.
- After the kill, corpse run within 130 m of path while at most one other line is open:
  - its cubes (+2, within 5 m: walk a 5 m circle);
  - its laser if we have none (practice hunters carry gun + laser; a corpse keeps every non-gun weapon).

Design reason: weakest first makes this the cheapest kill and the only 1v1 of the match. Lanchester's linear law
applies: output decides. Every HP it costs is budget missing at kills 5-7.

### 4.3 P2 Escalation (k = 1-4; 2-5 hunters assigned; usually 1-2 lines; about 40-100 s). Presets: new `focus: 'av'`; GP I3 `isolate: 'near'`; kept `retreat: 'd3'`; new `seek: 'lull'`; new `hunt: 'esc'`

Rules:
- **Target (`focus: 'av'`).** Cost = ttk_i / threat_i, where threat_i is the hunter's dps on us now:
  - gun line 93 x hit(range) x its cube multiplier;
  - +78 if it carries a laser and has a line.

  Keep the -200 m stickiness and the finishable bonus. No overkill: never release a full beam into a target that
  bullets already in flight will kill.
- **Two lines (`isolate: 'near'`).** Take an isolating cell only within 12 m and with zero exposure to the
  non-target. Otherwise hold the band and fight. Never walk more than 25 m to cover under fire.
- **The lull after a kill (`seek: 'lull'`).**
  - At 70% HP or more: seek, walking (regen runs on the way when nobody shoots). Search order:
    1. the memory track;
    2. the loudest gun / laser / lightning sector of the last 3 s, 120 m along it ('mid') or 200 m ('far');
    3. the last enemy fix;
    4. the 0.41 r house ring.

    Torso on the predicted emergence point; start the laser charge 0.75 s before the line opens (house first shot
    comes 1.15 s after a line opens).
  - Under 70%: V4's heal break. Stay within 15 m of hard cover with the torso on the approach bearing, and shoot no
    drone, until 70% or a line.
- **hunt50, practice form (`hunt: 'esc'`, section 6).**
  - Commit when burst3 >= 0.5 x the target's current HP.
  - Pulse only when all of these hold:
    - the burst is spent (gun reloading or under 3 rounds, and the laser cooling for more than 1 s);
    - at least 2 lines are open;
    - cover is within 0.6 s (7 m).
  - The pulse ends at laser ready + 8 rounds, or at 4 s.

Design reason:
- Square law: two lines halve the kills we make before death.
- The token director makes the post-kill lull predictable.
- Regen is passive: a lull returns 225 HP in 10 s (468 with nanites).

### 4.4 P3 Late hunt (k >= 5, or >= 3 lines, or >= 5 hostile tracks within 200 m; about 80-140 s). Presets: new `loseCover: 'near'`; GP I7 `lastGasp: 'on'`; kept `boost: 'spend'`

Rules:
- **`loseCover: 'near'`** (acts in every phase; matters most here).
  - Any LOSING (d3 thresholds unchanged) goes to DISENGAGE only when the hide cell is within 1.5 s of travel
    (B.tCover), or when we are under 25% HP and any hide cell has been found.
  - Otherwise stay in FIGHT.
  - This is the pulse variant's no-cell rule, carried into d3 with V4's heal breaks kept.
  - The under-25% clause protects against the A05 loss: removing low-HP hiding from the 5.58 bot cost -0.41.
- **`lastGasp: 'on'`.** When hp / incoming dps < 2.5 s and no cover lies within 10 m:
  - target the quickest kill (min hp / burst3);
  - release any lethal partial beam;
  - fire every gun round past the 0.55 s flight gate;
  - ignore the lightning reserve.
- Grabs: kill cubes within 40 m only. No crates, no drones.
- **Drop 1 (lands 95 s).** Only with at most one line, holder null, no mech within 60 m of the ring, and arrival no
  later than lands_in + 3 s (D6 as is).

Design reason: intake per minute is set by the squad (1,300-1,400 per minute for every style), so fleeing buys no
life. The fatal fight is where kills 5-7 are made: kyoto converts 1.7 kills inside it. A drop is a refund only at one
line or none (about 240 HP to capture against 770-1,400 back).

### 4.5 P4 Last circles (next radius <= 70 m, or t >= 265 s, or <= 4 alive; rare in practice; 11-15 points when reached). Presets: existing D9 late rules; no new draw

Rules:
- Zone first. Leave when time to shrink < 1.45 x path time + 12 s. Spend 0 s outside: 60-260 HP/s beats regen.
- Offers: plating first (max HP is the only stat the zone respects).
- From 375 s stand on next_center, with full HP on arrival (5 s without damage events inside the circle).
- Shoot only mechs that have a line on us. Every house bot with less HP at 415 s dies before us.

Design reason: the zone converts HP into place. The rules exist; they are not reached in about 95% of matches.

---

## 5. Final rules (free-for-all, by mechs alive and circle size)

All of these act only in the FFA posture or before the latch (practice-inert). Where a rule is new it carries a new
preset.

### 5.1 F1 Cull (16-12 alive; circle 560 -> 380 m; t < 110 s). Presets `ffaOpenGuard: 'on'` (R4b) + D11

Rules:
- From the first foreign death until the latch, answer only mechs that hit us within 100 m.
- Latch FFA by D12 (3 foreign deaths before 200 s).
- No voluntary fight before 90 s.
- Keep every mech beyond 60 m (target 150 m). Break a shoot-on-sight strafer's sight for 5 s.
- Farm only while the nearest known mech is beyond 150 m. A laser by about 45 s is fine: a laser taken after 15 s
  did better than one taken earlier [rec S02].

Design reason: 0.36 deaths per minute alone against 2.02 with one mech within 60 m (survival over 60 s: 70% against
13%). The bottom half dies of exposure, not of passivity.

### 5.2 F2 Vulture (11-6 alive; circle 380 -> 140 m; t 110-265 s). Presets: new `ffaHunt: 'h50'` (hunt50, section 6); R4b `laserRangeFfa: 'far'`, `laserForceFfa: 'on'`; F1 `ffaDropGate`

Rules:
- Start only on one of these:
  - (a) a mech busy elsewhere (torso more than 0.5 rad off us, damage events in the last 2 s), when burst3 >= 0.5 x
    its current HP and no third mech within 120 m has a line on us; prefer its rear arc (a full beam is 472 there);
  - (b) any mech under 50% HP inside our laser reach;
  - (c) our attackers.
- After the burst, break the line for at least 5 s (its memory runs out), until the laser is ready and 8 or more
  rounds are loaded.
- Patient heal to 70-90% (D11). Re-peek only if the target is still under 50% and no new mech is within 120 m.
- Laser band 125-185 m. Hold a full charge to 1.9 s for alignment.
- Drops: uncontested only (holder null, no mech within 60 m of the ring), within 250 m, arriving no more than 3 s
  early.
- Farm toward 10+ cubes with the nearest mech beyond 150 m. Never visible below 55% HP.

Design reason: winners finish, they do not start. 47% of their hits land on targets under half HP, from 187 m away.
The duel supplies the other half of the kill. Breaking the line sheds pursuit because nobody shares vision.

### 5.3 F3 Edge (5-3 alive; circle 140 -> 70 m; t 195-325 s). Presets: existing `ffaThree`, `ffaGate`; counters module

Rules:
- Hold 0.45-0.55 of the next radius from the next centre, on the side away from the centroid of known mechs. Never be
  the nearest mech to two others.
- Against a laser kiter (kyoto type), deny its 70-120 m: stay beyond 150 m, or come inside 40 m under cover with
  lightning (a short blocks its laser for 2 s).
- At 3 alive: start nothing. Third-party a duel's survivor within 4 s if it is under 50% and nobody else is within
  120 m.
- Plating first; take cubes freely.

Design reason: the zone now outruns regen (60-100 HP/s). The first shooter in a 3-way usually loses. Max HP is the
coming tiebreak.

### 5.4 F4 Finale (2 alive, or next radius <= 25 m; t >= 350 s). Presets: existing `finalPoint: 'on'`, `ffaTwo: 'on'`

Rules:
- From 375 s stand on next_center. Arrive with full HP (5 s without damage events). No boost after 380 s.
- At 2 alive, trade only when our E = hp - dps x metres off the final centre exceeds the rival's, or when it is under
  60% within 45 m.
- Lightning reaches across the whole last circle: it shorts the rival's laser and stops its regen.

Design reason: at 415 s death order is HP order (armour does not count; max HP and cubes do).

---

## 6. hunt50 (the owner's rule): where it fits

The rule: attack when our burst can take 50% of the target, then retreat until reloaded.

What the design says about each half:
- **The 50% gate** [A §7, burst_table.py]:
  - gun only (405-486 burst) it refuses a fresh 1400 HP bot from the front and accepts up to 810-972 HP front, or
    1,215-1,458 from the rear;
  - gun + laser (720-864) accepts almost anything up to 1,440-1,728 HP.

  So in practice it acts only as "hostile or already damaged first" for a gun-only bot (the measured +0.23 rule G02),
  and hardly binds once a laser is held.
- **The retreat until reloaded** saves intake only during our own dead time, about 2.4 s [A §6]:

  | Cover distance | Saved per cycle (110-220 dps of lines) |
  |---|---:|
  | 0.3 s (3.5 m) | 200-400 HP |
  | 0.6 s (7 m) | 130-260 HP |
  | 1.0 s (12 m) | 45-90 HP |
  | 1.5 s (17.5 m; the R4 `h50CoverS` value) | nothing |

  Measured: cover cycles -0.6 to -0.94 and "break off at two lines" -0.60, all at weaker bots [M].

Where it fits:
1. **Best: the final's middle game (F2, 11-6 alive, circles 380-140 m), as `ffaHunt: 'h50'`.**
   - The other 50% is dealt by the mech our target is duelling.
   - A target losing a duel cannot regenerate, because it keeps taking damage.
   - Our reload window is exactly when vultures strike, so stepping out of sight then protects us.
   - Without shared vision, a 5 s line break really sheds pursuit.
   - This is the winners' profile: they finish rather than start, 187 m from the nearest mech.
   - Practice-inert (FFA posture only).
2. **Practice: escalation only (P2, k 1-4, 2+ lines), as `hunt: 'esc'`.**
   - It is R4's `h50` with `h50CoverS` 1.5 -> 0.6 s and the pulse armed only at k >= 1.
   - In P0-P1 one line makes the retreat pointless: their reload overlaps ours.
   - In P3 every pulse is a walk under 3 or more lines; use `lastGasp` instead.
   - Draw it after `hunt: 'lite'`. If H or HL already scored, `esc` replaces `h50` as the cover-cycle arm.
3. **Never in P0** with gun only against non-hostile fresh bots. This is moot: the first hunter comes to us and is
   answered as hostile.

---

## 7. Single-change draws on V4 (one preset each; ordered by design weight x evidence x cost)

| Order | Preset | Phase | Design weight | Evidence | Cost |
|---:|---|---|---|---|---|
| 1 | `focus: 'av'` (+ no-overkill) | P2-P3 | G4, G5 | [L] optimal for 1 vs n; [M] finishing +0.39 | about 30 lines (research item 1) |
| 2 | `laserGrab: 'arm'` | P0-P2 | G1 (largest) | [T x3]; [M] small negatives at weak bots | R4b `wide` + 10 lines of sweep |
| 3 | `loseCover: 'near'` | P3 | G3, G6 | [S] 72 HP/s legs; pulse variant's rule | 1 line in `decideMode` |
| 4 | `seek: 'lull'` | P2 | G2, S8 | [S] 16% roam; [L] Raven HuntTarget (the textbook "hunt the last known position" goal) | R4a seek + HP split + pre-charge |
| 5 | `killDrop: 'weapons'` | P1-P2 | G1, S3 | [A]; kyoto corpse cubes | GP I8 |
| 6 | `lastGasp: 'on'` | P3 | G6 | [S] kyoto 1.7 kills in its fatal fight | GP I7 |
| 7 | `hunt: 'esc'` | P2 | owner | [A] 7 m cap; [M] cover cycles negative | R4a `h50` with `h50CoverS` 0.6 |
| 8 | `dodge: 'sync'` | P1-P2 | S9 | [A] every bullet misses from 85 m when phase-locked | `senses` cadence + `legs` (research item 2) |
| 9 | `upg: 'kill'` | all | G7 | [A] only | GP I9 |

Final-only, practice-inert (ride in any build; verify identity): `ffaOpenGuard: 'on'`, `laserRangeFfa: 'far'`,
`laserForceFfa: 'on'`, `ffaHunt: 'h50'`.

---

## 8. Design traps (things the rules invite and the evidence punishes)

- **Cover as a base** (the Killzone default). The squad shares vision and keeps coming, so cover blocks shots and
  never knowledge. Use cover only for steps of 7 m or less: a laser release tick, the pulse.
- **Long stand-off with the gun.** Projectiles decay with range against a mover, ours too. Gun only, hold 75 m.
- **Mortar in practice.** Laser hunters cook it off (x1.6).
- **Chasing drops.** They land where the squad parks, at the death time of every top bot.
- **Random flips** to beat linear lead (-0.69). Phase-lock velocity changes to the shooter's cadence instead.
- **Cubes past 10** cost size and give no stats. Take them only on the way, unless it is the final and after 300 s.

## 9. Reproduction

```
cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot
python3 -I -B tools/panel_r5/design_arith.py      # writes nothing; the saved copy is tools/panel_r5/design_arith_out.txt
python3 -I -B tools/panel_r5/arith.py              # research assistant's arithmetic (stop-and-go, Attack-Value, lead)
```
