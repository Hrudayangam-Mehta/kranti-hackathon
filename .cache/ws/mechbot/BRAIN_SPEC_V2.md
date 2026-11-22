# >>> DOCTRINE V4 (team lead, 05:50 UTC) — AUDITED EVIDENCE; OVERRIDES EVERYTHING BELOW IT <<<

Sources: `notes/measured_deltas.md` (97 official one-change results from 27 teams, with an audit of our
earlier amendment), `notes/intel_synthesis.md` (house-bot forensics + 12 bot studies),
`notes/showdown_profiles.md` (recorded real free-for-alls), and the experiment log of the bot holding the
top score (5.58). Evidence grades: [S] strong (several teams), [T] the top bots' own choice (5.58 / 5.19),
[1] one team's A/B, [C] contested, [N] no measurement. This block replaces "Amendment V3". Where it is
silent, sections 0-8 below stay valid. Every number is a `PARAMS` default; presets are named so that a
real submission can change exactly one of them.

## D0. Two postures, one bot
`env = SQUAD` (default, practice) or `FFA` (latched by D12). While unlatched the bot's behaviour must be
bit-identical to a SQUAD-only build. Opening guard for both (first 40 s): never start a fight with a mech
that is not hostile (hostile = damaged us in the last 4 s, or aims within 12 deg of us with a line of fire
inside 160 m); shoot back at once when hostile. [recorded free-for-alls: the bottom half of the field died
after a median 21 s; in practice the hunter comes to us anyway]

## D1. What the opposition is [S, replay + kit stream]
House bots aim with an exact first-order intercept, no noise, no reaction delay, and fire only with a clear
line: a target moving steadily is hit 84% of the time, one that changed velocity during the bullet's flight
22%. Hit rate by today's range: under 75 m about 100%, 75-100 m 86%, 100-126 m 57%, 126-151 m 32%, beyond
16-30%. Magazine rhythm: 12 shots in about 3 s, then 2.5 s silent. They never retreat or heal, take the
nearest target, hop (jump + 1.5 s jet, apex 15 m) a third of fight time, and the practice hunter carries
gun + laser, fights at 100-150 m and does not close inside 45 m. Their laser needs a sight line at release.

## D2. Fighting range (SQUAD) — replaces every stand-off number below
- Gun only: hold 75 m (dead band 55-95). Full stick to approach, 0.7 to back off, always strafing. [S/T]
- Holding a laser: preset `laserRange`. Default `far`: hold 150 m (band 125-185), back away firmly when a
  mech comes inside 125 m and boost away when one is inside 90 m with energy > 30 [T: the 5.58 bot; gun fire
  can be dodged there while the beam still lands]. Preset `mid`: hold 115 m (band 100-130) [T: the 5.19
  bot; one sweep on a mid-table bot: 110 m best]. [C between the two: decide on the real scorer]
- Holding lightning and no laser: close to 28 m, boosting in from under 90 m when energy > 70; only against
  a target with no other threat in sight. [1]
- No special distance rule against lightning carriers in SQUAD. [1, negative]
- Gun fire gate at range: do not fire the gun at a target whose bullet flight exceeds 0.55 s unless it has
  kept a steady velocity for 0.6 s or is airborne on a ballistic arc. [S: beyond about 130 m gun duels lose]

## D3. Retreat, heal, re-engage (SQUAD) — replaces "Heal discipline" and "Finish-or-flee" thresholds
- LOSING (break the line of fire, keep shooting, keep charging the laser at any health): not finishing
  (finish = target under 20% hp and at most 2 threats) and one of: 1 threat, hp < 35% and the target's hp
  fraction >= ours + 0.10; 2 threats and hp < 50%; 3-5 threats and hp < 60%; 6 or more threats. [T: both top
  bots; removing low-health retreat from the 5.58 bot cost 0.41; retreating at 72% cost 1.1 elsewhere]
- Retreat goal: a reachable hide cell away from every tracked mech (few directions can see it), zone first.
- HEAL state: out of contact (no line of fire on us for 1.5 s) and hp < 55%, or hp < 90% within 6 s of a
  LOSING retreat: stay in cover, stand or creep (stick <= 0.42), fetch cubes within 40 m, torso scanning the
  approaches, return fire when shot, never shoot crates or drones. Leave at hp >= 70% (preset `healExit`),
  or when a mech has a line of fire and we are not LOSING. [T; hold-fire while being shot cost 0.34 [1]]
- Do not hide when not LOSING and hp >= 55%: hiding and waiting lost 0.5 [S]. Travel at full speed (quiet
  walking while travelling lost 0.2 [S]).

## D4. Dodging — replaces "Jink"
- Bullet-aware dodge is the main defence [T: weighted up twice on the way to 5.58]: for every enemy gun
  projectile whose closest approach to our predicted position in the next 0.9 s is under radius + 1.2 m,
  change velocity: sidestep perpendicular to the bullet path (the side that is walkable and inside the
  zone), or brake / reverse when the sides are blocked. Blend with the tactical move (dodge weight 0.9).
- Baseline strafe while a gun has a line on us: reversal interval U(0.8, 1.6) s (preset `strafe`), plus an
  extra reversal when an enemy magazine starts (first bullet seen after a silence >= 2 s). Never faster
  than 0.8 s [1: fast flips lost 0.7]. Stay grounded: no jump dodging (airborne mechs are hit more).
- Use their reload: after 12 bullets from one mech there are 2.5 s without gun fire from it: approach,
  cross open ground or peek then. Track bullets seen per shooter.
- Laser charging at us (charging flag, aim within 0.25 rad): their beam needs a sight line at release, so
  step behind hard cover if a hide cell is within 6 m (9 m boosting); otherwise keep the velocity changing.
- Mortar shells: as in section 3.

## D5. Target choice — replaces the target index weights
Candidates: hostile mechs (D0 definition), mechs inside our range band + 40 m, or anything when we have
been unengaged for 20 s at hp >= 90%. Score: nearest first, plus strong bonuses for (a) a target the
current burst can finish (hp <= expected damage of the remaining magazine + a ready laser) [1: +0.39],
(b) the mech that hit us in the last 3 s [1: +0.23 hostile-first], (c) the current target (stickiness 30%).
Never leave a target under 25% hp for a fresh one. With a laser, prefer mortar holders (cook-off +60%).

## D6. Economy — replaces section 5 "Opening" and E6
- Crates and drones are worth 0.3-0.6 [S]; farther or longer farming lost 0.1-0.2 each time [S]. Rules:
  farm only out of contact and at hp >= 90% (preset `farmHp`; the 5.19 bot uses 50%); ground crates within
  150 m of path (approach to 30 m, shoot, walk onto the cube); drones within 170 m (approach to 38 m, stand
  and shoot; leave to 75 m when hp < 50%); stop all farming at t >= 210 s or once we hold 10 cubes and a
  laser. No roof loot (more than 2 m above terrain). [S: roofs lost 0.2-0.9]
- Power grabs in contact [T: the change behind 5.19 and part of 5.58]: detour to a remembered cube (memory
  40 s) within 70 m (hp > 50%), 40 m (lower), 12 m (LOSING); to a laser pickup within 60 m when we have
  none (35 m for other wanted weapons). Collect the cubes of our kills at once.
- No long pickup detours (three small negatives). No waiting in a drop ring before the landing.
- Supply drops: take only a drop no other mech holds, within 250 m, timed to arrive no more than 3 s
  before landing, never contested (leave if a mech is within 60 m of the ring), not beyond 70 m once landed.

## D7. Loadout and upgrades
- Always want a laser. Empty slot takes laser > lightning > mortar (mortar only if nothing better was seen
  for 60 s and never keep it once anything else is available: cook-off). SQUAD: keep the gun (gun + laser)
  [T: 5.19; hunters stay outside lightning range]. FFA latched: laser + lightning allowed, gun dropped
  (preset `ffaPair`) [six of seven recorded free-for-all winners]. Never swap a charging laser.
- Upgrades: plating > armor > nanites > laser_damage > laser_charge (laser held) > lightning_efficiency
  (lightning held) > gun_damage > gun_rate > lightning_range > lightning_chain > gyros > servos > gun_mag >
  capacitor > reactor > jets > gun_velocity > sensors > mortar_* > laser_pierce. [T, no A/B]

## D8. Fire-control execution
Keep `fire` true whenever the gate passes and cooldown <= 0.1 s (the trigger must already be down when the
cooldown ends inside the decision window). Fire as the aim swings on: gate on the aim the torso will have
after this decision's slew. Aim-point ladder: body centre, +2 m, +3.6 m (scaled by size), first with a
clear line; allow little upward error when only the top shows over cover. Lead with the target's motion
relative to ours. Hand the torso to the direct laser aim from 80% charge. Keep charging while retreating.
Trees hide but never stop shots: fire at a dead-reckoned target behind canopy for up to 1.5 s.

## D9. Zone and endgame
Zone outranks cover and loot. Head for the point at 50% of the next radius on our side when: outside, or
beyond 90% of the current radius, or beyond 80% of the next radius while the circle shrinks or
time-to-shrink < path time + 12 s. From next_radius <= 70 converge on the next centre and fight from there;
in the final shrink stand on the moving centre. [N for the endgame]

## D10. Engineering (measured to matter as much as tactics: +-0.2 to 0.4)
- Determinism: all randomness from the match seed; NO wall-clock-dependent behaviour. Work per decision is
  bounded by fixed operation counts (ray casts, path expansions, candidates), sized so a decision takes
  under 8 ms; `deadlineMs` stays only as an emergency fuse that must never trip in normal runs (count trips
  in `debugState`). A bot whose planning depended on the clock scored 3.67-3.90 with identical code.
- One-CPU runtime: the JavaScript engine's helper threads (JIT compiler tiers, garbage-collector markers)
  can eat the single CPU allowance and stall answers past 50 ms. The Dockerfile must limit them through
  the engine's documented environment options, and the bot must rehearse a few hundred synthetic decisions
  during start-up (inside the 20 s budget) so compilation is finished before the match.
- `PARAMS.salt` is mixed into the RNG seed: a different salt is a legitimate fresh draw of the 48 matches.

## D11. FFA posture (only when latched)
Hide-first: fight from cover, never walk at an enemy, no voluntary fight before 90 s, farm only when the
nearest mech is beyond 150 m, never be visible below 55% hp, shoot first only at a mech that is busy with
someone else and under half hp, third-party the survivor of a duel within 4 s if it is under 50% hp and
nobody else is within 120 m. Stay about 0.4-0.5 of the zone radius from the centre until the last phases;
boost rarely. Counters keyed on what is visible (weapon kinds, charging flag, range, speed):
- laser carrier at 100+ m: fight only from a corner or as third party; break its sight line at release time;
- lightning carrier closing under 60 m: keep 50+ m along cover, shoot while backing;
- shoot-on-sight strafer: break sight for 5 s (memory length), let it find someone else;
- boost rusher (about 19 m/s, gun only): corner ambush;
- motionless hider: pass beyond 55 m, out-farm it, finish it late.
Patient heal (no fire, silent) applies here. Playbook manoeuvres M5, M9, M11 apply here.

## D12. FFA latch
Latch when `(16 - alive) - ourKills >= 3` (deaths we did not cause), counted only for t < 200 s. Optional
second clue, OFF by default (preset `beamClue`): a beam by another mech that ends within 6 m of a third
mech which then loses hp, twice. Log the latch time. A wrong latch in practice is very costly (a public
bot carrying a looser latch scored 3.56 against 5.19 for its sibling without one): when in doubt, SQUAD.

# >>> END OF DOCTRINE V4 <<<

# Brain spec v2: decisions of the team lead after the panel (read together with BRAIN_SPEC.md)

Where this file and BRAIN_SPEC.md differ, this file wins. Where a panel memo and this file differ, this
file wins. Everything numeric lives in the single `PARAMS` object and is overridable through
`createBrain(hello, ctx, overrides)`; numbers below are the defaults.

## 0. What decides our score

Practice match = us against 15 house bots that never fight each other, share vision and send hunters at us
(one early, more as they thin out, all of them late). Our score in a match is the number of house bots that
die before we do, i.e. **our kills before death** (15 if we are the last alive). The current leaderboard top
is about 5.6, the cut for the final is about 4.2. A passive survivor scores 0. So the bot is a **ranged
duellist**: efficient kill cycles while at most one hunter has a line of fire on us, heal between cycles,
grow with cubes/upgrades, stay inside the zone. The real free-for-all (FFA) final is second priority: it is
handled by the stance layer (section 7) which changes parameters, not the machinery.

Layers, in build order. **A layer must work and be tested before the next is started. A working layer 1-4
bot is worth more than a half-working layer 1-7 bot.**

1. Senses, tracks, bookkeeping (BRAIN_SPEC step 1).
2. Fire control: gun, laser, lightning, mortar.
3. Movement: path following, stand-off range keeping, jink, zone constraint, stuck recovery, shell dodge.
4. Engagement logic: target choice, finish-or-flee, heal discipline, cover (position evaluation, peek/hide).
5. Economy: loot, crates, weapons, upgrades, supply drops.
6. Corner ambush and shoot-and-relocate (playbook M2, M3), bastion last stand.
7. Stance layer + environment detection (playbook A, B), then FFA manoeuvres M5 (third party), M9, M11.

## 1. Balance warning

The official replay was recorded with an OLDER balance (bullets 140 m/s, walk 9.0, accel 45, gun cadence
0.40 s, laser charge 0.65 s). Never hard-code replay-derived numbers; read every physical number from
`hello.config` / `obs.self.stats` / `obs.self.weapons[i].stats`. Replay-derived behaviour facts (how house
bots react) are priors only.

## 2. Fire control (layer 2)

- **Latency model.** The action we send for observation tick k is applied by the server after it is
  received; assume the shot leaves `tl = 0.10 s` after the observation time (PARAMS.latency; range to sweep
  0.05-0.15). Predict shooter and target forward by `tl` before solving: `S = self.pos + self.vel*tl +
  (0,0,muzzle_height)`, `C = tgt.pos + v_est*tl + (0,0, 0.5*height_t)` with `height_t = 9*(1+0.05*cubes_t)`
  (use the config's `size_per_cube`). Then `intercept(S, C, v_est, gun.speed, self.radius + 0.5)`.
  Vertical target velocity: use 0 when the target is grounded-looking (|vz| < 0.5) else its vz with gravity
  ignored for t < 0.3 s (airborne targets are rare; do not over-engineer).
- **Target velocity estimate.** `v_est` = observed `vel` (the server gives it). Keep an EMA (alpha 0.5) and a
  reversal counter (sign change of the velocity component perpendicular to our bearing, with |v_perp| > 3).
  House bots almost never jink, so the default gun is full linear lead with the raw observed velocity.
  If a target reversed >= 2 times in the last 2 s, scale the lateral lead by 0.5 (aim nearer the midpoint).
  Virtual-gun statistics (playbook/panel R10) are layer 7, not now.
- **Commanded aim** every tick with a target = the lead solution (yaw, pitch), recomputed each tick. Because
  the torso slews at `turn_rate` (4 rad/s = 0.4 rad per tick) the commanded aim is reached within one tick
  when the error is small.
- **Fire gate (actual aim).** Set `fire[slot]=true` for the gun only when all hold: weapon ready
  (`cooldown <= 0.05`, `ammo > 0`, not reloading); distance to the lead point <= 0.97*range; the error
  between the solution and the aim the torso will actually have when the shot leaves is inside the gate:
  `yawErr <= max(0.004, (r_t + 0.3)/R - 0.0105)` and `pitchErr <= max(0.004, (0.5*height_t + 0.3)/R - 0.0105)`
  where the predicted aim = current `self.aim` moved toward the command by at most `turn_rate*0.1` /
  `pitch_rate*0.1`; and `world.shotClear(muzzle point pushed (radius+0.5) along the aim, lead point)`.
  If the world is missing skip the clear test. `fire` is `[slot0, slot1]` booleans, indexed by weapon slot.
- **Reload.** `reload:true` when ammo == 0 (auto) or ammo <= 4 and (no enemy with a line of fire for 0.4 s or
  we are in a hide phase), never while a target under 300 HP is in the sights.
- **Laser.** Holding `fire[slot]` charges; releasing fires (see protocol section 7 "Weapons" for the exact
  semantics: read it, and read `charge`, `stats.charge_s`/names from the live weapon object instead of
  guessing). Charging halves move speed (`charge_move_mult`). Start charging only when a target is visible or
  expected within 1 s (peek/ambush) at distance <= 0.93*range. Aim = target centre predicted `tl` ahead
  (hitscan, no lead beyond latency). Release when charge is full (>= 0.97 of full), the gate passes with
  k = 0.6 and the shot is clear; also release early for a kill-secure (`laserFrac`-scaled damage >= target
  hp); if full for 1.5 s without a gate, release anyway. A laser hit on a mortar holder does +60%: prefer
  mortar holders as laser targets when otherwise equal. Never charge when ZONE or DODGE needs full speed.
- **Lightning.** Fire while a target mech is within 0.92*range and within (cone/2 - 3 deg) of the torso yaw
  and `energy >= 15`. It needs no lead. Keep `energy >= 35` reserve unless the target is a kill-secure.
  Never spend energy on boost when lightning is our only short-range answer and an enemy is inside 60 m.
- **Mortar.** Lowest priority; the mortar shares the torso direction with the gun so they conflict. Use only
  (a) target stationary or flight <= 0.9 s (about d <= 65 m) and d >= 20 m, and the gun is reloading or the
  target has no line of fire from us but was seen within 1 s; (b) never when the predicted impact is within
  `splash + 8 m` of us; (c) `rayShot` clear over the first 12 m of the arc. Being a mortar holder makes
  enemy lasers hurt +60%, so never pick a mortar up when we already hold two weapons, and drop it for any
  laser or lightning.
- **Torso without a target** (priority): face the highest-dps attacker of the last 3 s (rear hits x1.5,
  never show the back) > pre-aim the last known position of a lost target for 4 s > loot being shot >
  scan: sweep toward the likeliest threat bearing (recent `damaged.bearing`, sounds, last tracks), else
  rotate at 1.6 rad/s. The vision wedge is 120 deg: a moving torso is our radar.

## 3. Movement (layer 3)

- `moveTo(x, y)`: `nav.findPath` from the current position (use `nav.nearestPassable` on both ends), cache
  the path, follow with `nav.nextWaypoint`, replan every 0.5 s / goal moved > 4 m / stuck. `move` is a world
  frame vector, length <= 1 (legs are independent of the torso). When `nav` is missing, steer straight.
  Path planning may take up to 25 ms in the worst case: never plan more than one path per tick, never when
  less than 12 ms of the deadline remain (keep following the old path or steer straight).
- Call `nav.setBody(radius, height)` when our cubes change (body grows 5% per cube).
- **Stand-off.** With a selected target and no cover plan: radial speed command
  `clamp(0.5*(R - Rpref), -1, 1)` toward/away from the target plus a perpendicular strafe, normalised.
  Defaults `Rpref`: gun only 115 m (band 85-140); with laser 120 m; with lightning and target alone and
  energy >= 80 and our hp fraction >= 0.7: rush to 38 m; never closer than `50 + radius` m to a lightning
  holder unless rushing. Shrink the band to the longest sight line available (if no cell in the band has a
  line of fire, the position evaluator picks the best compromise).
- **Jink.** While a mech with a gun has a line of fire and R > 60 m: strafe perpendicular to it and reverse
  at intervals drawn from U(0.5, 1.0) s (seeded RNG), reversing early when `nav.walkLine` fails 5 m ahead or
  the strafe would leave the next zone circle. Under 60 m jinking does not work: prefer breaking the line
  of fire or backing off along cover.
- **Zone (hard constraint).** `margin = timeUntilCellIsOutside(pos) - pathTime(to next circle) `; if
  `margin < 4 s` or `in_zone == false` the legs belong to ZONE: go to the nearest passable point at
  0.8*next_radius from the next centre (boost if margin < 1.5 s or outside). All goal cells of every other
  behaviour must be inside the next circle at arrival time (inside the current circle while the shrink has
  not been announced). In the last phases (next_radius <= 70) stay within 0.5*radius of the centre. Keep
  shooting while moving for the zone.
- **Boost** only: outside the zone, zone margin < 1.5 s, shell dodge, breaking a line of fire when
  `hp/A < 4 s`, crossing an exposed gap <= 40 m under fire, finishing a kill-secure runner. Keep
  `energy >= 25`. **Jump** only for stuck recovery. Jets (jump held in the air) only to cross an obstacle in
  stuck recovery; no rooftop play in this version (navigation is ground-only).
- **Stuck recovery** as in BRAIN_SPEC step 6. Also treat "path not found" as: go to `nearestPassable`, then
  straight-line steer toward the goal with wall sliding for 1 s, then abandon the goal for 8 s.
- **Shell dodge.** For each mortar projectile predict the impact (`shellImpact` with `world.ground`); if it
  lands within `splash_radius + 5 m` of where we will be at impact time, move along the direction that
  maximises distance from the impact point among 8 candidates that are walkable (`nav.walkLine`), with
  boost. This overrides everything except ZONE with margin < 1 s.
- **Laser charging at us** (`mech.charging` and its aim within 6 deg of our bearing): if a hide cell is
  within 6 m (9 m with boost), go; otherwise keep jinking (a velocity change beats a locked lead) and shoot.

## 4. Engagement logic (layer 4)

- **Threat bookkeeping** per tracked mech i: `a_i` = dps it puts on us = measured 3 s moving average from
  `events.damaged` when >= 3 samples exist, else prior by weapon and range (gun: 107*p(d) with
  p = 0.85/0.7/0.45/0.25 for d < 40/90/160/230 m; laser 92; lightning 240 inside 45 m + radius; mortar 60)
  times `losIn`. `A = sum a_i` over mechs with a line of fire in the last 1 s. Our dps on i: `b_i` from our
  weapons at that range (gun 107*q(d) with q = 0.95/0.9/0.75/0.5 until measured: measure `hit` events per
  shot fired in 25 m bands; laser 131*0.8 when held; lightning 240 inside its range), x1.5 if we are outside
  its front arc (|bearing from it to us - its aim yaw| > 90 deg).
- **Target index** (panel R4): `I_i = V_i / tau_i`, `tau_i = hp_i / b_i`, `V_i = 1 + min(2, (hp/A) * a_i /
  ((A - a_i + 1) * tau_median))` (V = 1 when A = 0). Kill-secure override: any mech we can kill within 3 of
  our gun hits or one laser. Switch target only if `I_new >= 1.3*I_cur`, the current target has had no line
  of fire for 1 s, or it is dead. Drones are targets only when they damaged us in the last 3 s or the loot
  task farms them.
- **Finish-or-flee** (panel R2 simplified): `H_esc = A*(tCover + 1) + 150` where `tCover` is the path time to
  the best hide cell (use 3 s when unknown). Fight target 1 if `hp - H_esc >= tau_1 * A` or (`hp_1 <= 400`
  and A <= 120) or no hide cell is reachable; otherwise DISENGAGE: legs to the hide cell blocking the
  highest-dps attacker, torso on the attacker, keep firing while a line exists.
- **Never reset a winning duel** (regen is symmetric: house bots regenerate 45 hp/s after 5 s too): while
  `(max_hp_t - hp_t) > (max_hp - hp)` keep hitting the target at least once every 4 s; chase a fleeing
  target that is below 50% hp (boost allowed) for up to 6 s without a line of fire, then drop it.
- **Heal discipline.** HEAL mode when `hp/max_hp < 0.4`, or `< 0.7` with no fight worth taking (rule above),
  or after a kill with `hp/max_hp < 0.9` and nobody has a line of fire. In HEAL: hide cell (no line of fire
  from any tracked mech, > 50 m from drones, inside the next circle for >= 20 s), **no firing at all**
  (dealing damage restarts our own 5 s regen delay; exception: a kill-secure), move <= 0.42 stick (silent),
  torso sweeps the approaches. Leave when `hp >= 0.9*max_hp`, or a mech gets a line of fire (then fight or
  relocate per finish-or-flee). Regen only works inside the zone.
- **Position evaluation** (BRAIN_SPEC step 4) is the shared engine for FIGHT, DISENGAGE, HEAL, HOLD. Extra
  terms: candidates within `splash + 3 m` of a predicted shell impact are discarded; `wRange` uses the
  stand-off band (zero penalty inside the band); a candidate that has line of fire to the target but none
  from any OTHER tracked mech gets a bonus (isolate the duel); a candidate hidden from everyone with a
  peek cell within 5 m that sees the target is the ideal "corner". Cache per-cell results for 0.3 s; spread
  the work over ticks if the deadline is near.
- **Peek/hide cycle** when a corner exists (BRAIN_SPEC step 5): exposure obeys the stance (`peekMax`,
  `hideMin`); relocate to another peek cell >= 10 m away during the reload when one exists (M3).

## 5. Economy (layer 5)

- **Opening.** Until the first enemy mech is tracked (and whenever `A = 0`, no tracked mech within 150 m,
  `hp >= 0.9*max_hp`): collect cubes within a 60 m path, open crates within 80 m (300 hp: shoot them, 7 gun
  hits; they give 1 cube and a weapon half the time), take weapon pickups by the ranking below, all inside
  the next circle. Loot value = cubes gained / (path time + shoot time); weapon upgrade counts as 3 cubes.
  Never farm drones in this version (they shoot back and block regen); route around their 45 m aggro disc.
- **Kill drops**: collect cubes dropped by our kills when no mech has a line of fire.
- **Weapons.** Slots: 2. Ranking for the second slot: laser > lightning > nothing > mortar. Keep the gun
  always. `take: <pickup id>` when within reach (see protocol "Weapon loot" for reach and `drop` semantics).
- **Upgrades** (`pick` index into `obs.offer`, answer on the tick it appears). Priority: `nanites` (first two
  offers) > `gun_damage` > `laser_damage` (if holding a laser) > `plating` > `armor` > `gun_rate` >
  `gun_mag` > `laser_charge` > `capacitor`/`reactor` (if holding lightning) > `lightning_range` > `servos` >
  `gyros` > `sensors` > anything else. In FFA: `plating` first.
- **Supply drops** (panel R9 gate): go only if `hp > A*(tApproach + 4) + 200`, no tracked mech can reach the
  ring before `lands_in + 6 s`, and the path fits `11.7*(lands_in + 8)`. Capturing needs us alone in the
  8 m ring for 4 s: stand still at the centre, torso scanning. Otherwise ignore drops.

## 6. Corner ambush, relocation, last stand (layer 6)

Implement playbook M2 (corner ambush on a single pursuer after sight is broken), M3 (shoot and relocate),
M10 (disengage) and the LAST-STAND bastion (wall <= 4 m behind, open arc <= 100 deg; found by the position
evaluator with a "back to the wall" term using `nav.wallDistAt` and 12 rays) exactly as the playbook
states them, on top of the layer 4 machinery (they are goal-cell and timing policies, not new systems).

## 7. Stance layer and environment (layer 7)

Implement playbook sections A (stances DEFENSIVE / OPPORTUNIST / OFFENSIVE / LAST-STAND as parameter sets:
range band, peekMax/hideMin, first-shot policy, loot radius), B (environment counters `F`, `Q`, default
SQUAD, FFA latch) and D (channel arbitration: legs / torso / triggers / hands each have one owner per tick,
with the listed vetoes). **Deviation from the playbook for SQUAD:** in SQUAD the default stance while we are
healthy (`hp/max_hp >= 0.7`) and `n1 <= 1` is OPPORTUNIST-like: we fire first at any hunter inside range,
because kills are the score and silence hides nothing from a shared-vision squad; and "SQUAD idle" (nobody
has had a line of fire for 20 s at `hp >= 0.9`) moves us toward the nearest tracked or last-known house bot
at stand-off range to start a duel on our terms (M4 pull), preferring isolated ones. FFA manoeuvres M5, M9,
M11 come last and only run when the FFA latch is set.

## 8. Engineering rules

- Files: `bot/lib/brain.js` exports `createBrain`; split helpers into `bot/lib/*.js` modules as you see
  fit (plain ES modules, no dependencies, no build step). Do not edit `bot/bot.js`, `aim.js`, `world.js`,
  `nav.js` (report needed changes instead); you may add functions in new files.
- Per-tick cost: mean <= 4 ms, p99 <= 15 ms, max <= 25 ms on ONE CPU (`taskset -c 0`), measured in the test.
  `act(obs, deadlineMs)`: `deadlineMs` is a `performance.now()` timestamp; check it before each optional
  stage. No unbounded loops, no per-tick large allocations, typed arrays for candidate buffers.
- Robustness: every field of `obs` may be missing or null (weapons slot null, `offer` null, empty arrays);
  mechs appear and vanish; our own weapons change. Guard everything; a stage that throws is caught inside
  the brain and the previous good output for that channel is reused (count and log the first 5 errors).
- Determinism: all randomness from `makeRng(hello.seed ^ constant)`.
- Debug: `brain.debugState()` returns `{mode, stance, env, target, goal, hp, counters}`; `PARAMS.debug`
  false by default (no `debug` field in actions unless enabled).
