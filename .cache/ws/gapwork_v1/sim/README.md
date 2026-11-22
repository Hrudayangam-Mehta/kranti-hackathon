# Local match simulator (dev only, not shipped)

A lockstep simulator of protocol `mechfight/1`, written from `kit/protocol.md` sections 2-11 and the numbers of a
real `hello.config` (`notes/hello_example.json`). It exists to test and tune `bot/` between submissions: the real
`bot/lib/brain.js` runs in it unmodified, and any external bot can join through stdin / stdout.
Plain JavaScript ES modules, no dependencies, runs on Bun 1.4.4 and Node 22. Original code; map geometry, sight
lines and paths come from `bot/lib/world.js` and `bot/lib/nav.js`.

## Run

`P` is the project root, `bun` is `P/bun`. All commands from `P`.

```sh
bun sim/run.js --bot ours --mode squad --matches 40 --seed 1 --jobs 4 --json runs/ours.json
bun sim/run.js --bot sim/baseline_bot.js --mode squad --matches 40 --jobs 4
bun sim/run.js --bot "proc:python3 -u $PWD/kit/python/example_bot.py" --mode squad --matches 40 --jobs 3
bun sim/run.js --bot ours --mode ffa --matches 20 --opponents "proc:bun /abs/other/bot.js,house:expert,sim/baseline_bot.js"
bun sim/run.js --bot ours --mode squad --matches 40 --params my_house_table.json     # calibration
bun sim/test_sim.js            # all tests (about 40 s);  --quick (15 s);  --bench adds the speed test;  --only <text>
```

| option | meaning |
| --- | --- |
| `--bot` | `ours` (default: `bot/lib/brain.js` in-process through `createBrain(hello, {world, nav, log})`), a module path, `house:<type>`, or `proc:<command>` |
| `--mode` | `squad`: the team bot plus 15 house bots (4 easy, 4 medium, 4 hard, 3 expert) acting as one squad. `ffa`: everybody for itself |
| `--matches N --seed S` | match seeds `S .. S+N-1`. A seed fixes spawns, loot, drones, zone, drops, every random draw and the team bot's slot |
| `--jobs J` | J worker processes |
| `--opponents` | `ffa` only: comma list of bot specs for the other slots; the rest are house bots with the replay's roster |
| `--params FILE` | JSON merged over the house table: `{"house": {"easy": {"aimSigmaDeg": 4}}, "squad": {"huntersPerKill": 1}}` |
| `--json FILE` | every match record and the summary |
| `--latency L` | extra decisions between an answer and its application (default 0, see "Timing") |
| `--timeout MS` | answer timeout for `proc:` bots (default 200) |
| `--full` | keep playing after the team bot died (default: stop, its place is final) |
| `--config FILE`, `--old-balance` | rules from another hello / config json; the replay-era numbers |
| `--overrides FILE` | JSON passed to `createBrain` as its third argument (brain parameter sweeps) |

Output per match: seed, slot, place, score (`16 - place`), kills, seconds alive, damage dealt / taken, cause of
death with the killer (`gun:squad:easy`), late answers, wall time. Summary: mean score with its standard error,
fraction of matches won outright, cause-of-death counts split by the killer's squad role (`gun/hunt`, `gun/hold`).

A module bot exports `createBot(ctx)` (or a default function) returning `{ name, hello(h), act(obs) -> action }`,
or exports `createBrain` like our brain. `proc:` commands are started exactly as written, through the shell; their
stderr goes to `runs/simlogs/m<seed>_s<slot>.log` (`--log-dir` to change).

## Files

| file | content |
| --- | --- |
| `sim.js` | `class Match({ world, nav, seed, config, bots, mode, latency, focus, friendlyFire })`, `runSync()` for in-process bots, `async run()` when any bot is external. Returns `{ places, kills, deathT, mechs[], stats }` |
| `physics.js` | cylinder against the map: wall push-out and slide, step-up, slope limit, ceilings, eaves, roof edges; segment against cylinder |
| `house.js` | house-bot stand-ins, the squad controller, the parameter tables `HOUSE` and `SQUAD` |
| `procbot.js` | external process adapter (JSON lines, ready within 20 s, tick-matched answers, timeout, late counter, kill) |
| `ourbot.js` | in-process adapter for `bot/lib/brain.js` (own `Nav` instance because the brain calls `nav.setBody`) |
| `run.js` | command line, parallel workers, statistics. Also exports `makeContext`, `resolveBot`, `playMatch`, `summarize` |
| `baseline_bot.js` | trivial reference bot: walk at the next circle, shoot the nearest mech, no lead |
| `config.js` | loads the real config; `oldBalance(cfg)` gives the numbers the official replay was recorded with |
| `schema.js` | small JSON Schema checker for `kit/mechfight.schema.json` |
| `test_sim.js` | tests (below) |

## Timing

One decision = `decide_every` (2) ticks of 0.05 s. The loop is the protocol's lockstep: observations of tick `E`
go out, the answers are applied, ticks `E+1` and `E+2` are simulated. An answer therefore first shows in the next
observation, and a shot ordered on the observation of tick `E` leaves on tick `E+1` from where the mech stands
then. This agrees with the replay (fire events only on odd ticks, aim best explained by the observation one tick
before the shot) and with the recorded stream (cooldown read-outs 0.19, 0.09, 0 after a shot).
`--latency 1` (or `new Match({ latency: 1 })`) delays every answer by one more decision for robustness tests.

Order inside a tick: zone circle, per mech (torso slew, legs, jump / jet / gravity, collision), mechs pushed apart,
one-shot actions on the first tick of a decision (pick, reload, take / drop), weapons, drones, projectiles, cube
pickup, supply drops, zone damage or regeneration, offers, deaths and placement.

## Rules implemented (protocol section in brackets)

- [2] Lockstep, tick echo (other ticks are dropped), coast on a missing answer (move / boost / aim kept, one-shot
  parts dropped), idle after `coast_s`, a crashed process idles. `end` with place and kills.
- [4] Placement by death order, shared place for deaths on the same tick, survivors ranked by HP at the time cap.
- [5] Feet position, cylinder body, eye / muzzle / tube heights, shot origin `radius + 0.5` out (shortened by a wall).
- [6] `hello`, `obs`, `end` with the real field names, shapes and rounding; all ten event types; id ranges.
- [7] Movement: acceleration toward the commanded velocity (ground / air), walk and boost speed, energy drain and
  regeneration delay, jump, jet (capped rise speed), gravity, step-up, slope limit, wall sliding, map edge,
  overhangs (walk under when they clear the head, wall otherwise, underside stops a jet), eaves and roof edges with
  the 0.6 m per tick slide, mechs pushed apart. Torso yaw / pitch rates and pitch clamp.
  Health: regeneration after `regen_delay` without dealing or taking damage, never outside the zone.
  Rear armour by the direction the shot came from. Cube damage scaling with the cap.
  Gun (spread, exact cadence on a held trigger, magazine, reload, early reload, range), mortar (ballistic shell,
  ttl, direct hit, splash with wall blocking and falloff to the body surface, concussion throw and energy drain,
  self damage), laser (hold to charge, minimum charge, auto-fire after `hold_s`, damage fraction, cooldown, half
  speed while charging, `charge_turn_mult`, pierce, cook-off), lightning (cone, nearest target with a line, chain
  with falloff, energy cost, dry zap, short). Trees do not stop shots.
  Drones (wander on a leash, proximity aggro near home, answer attackers, chase leash, de-aggro range, bullets,
  two cubes, no zone damage), crates (HP, cube, weapon chance, a quarter on roofs), floor loot (weights, a quarter
  on roofs), take / drop / swap with every `take_failed` reason, equip delay, a dropped gun keeps its ammo, contested
  pickups go to the closer mech, death drops. Supply drops (called, fall, ring, capture clock with freeze and
  restart, cubes, repair, energy).
- [8] Vision: 45 m circle (canopy ignored) or 200 m in the 120 degree yaw wedge (canopy fades through
  `world.canSee`), line to the centre or the top of the object, 5 s memory for mechs and drones, own projectiles
  omitted, beams seen when an end or the middle of a segment is in view. Sound: all fourteen kinds with their
  ranges, bearing noise scaled by `hearing`, near / mid / far, age, own sounds omitted.
- [9] Zone: random nested circles, hold then linear shrink of centre and radius, phase damage from its hold through
  its shrink, `zone` block of the observation.
- [10] Cubes (+HP with healing, +damage, cap, size growth without cap), offers at the thresholds, three distinct
  choices, weapon upgrades only for held weapons, stack limits, queueing, `pick`, timeout default, and every upgrade
  effect of `config.upgrades` applied to `self.stats` / weapon stats by its `path`, `mul`, `add`.
- [11] Map through `World` (terrain, prisms, trees).

## Assumptions where the protocol is silent

Each one is a single place in the code; the ones that are options are named.

1. Deaths on the same tick share the *best* place of the group (option `shareTiedPlace: 'worst'` for the other reading).
2. Lightning `cone_deg` is the half angle: a target within 30 degrees of the aim yaw (option `lightningHalfCone`).
   The cone is horizontal only; range is measured from the muzzle point on the body axis to the target centre.
3. Lightning starts on the body axis at muzzle height with no forward offset (replay); gun, laser and mortar start
   `radius + 0.5` out, using the *scaled* radius of a mech that has cubes.
4. The directly hit target of a mortar takes 200 only (no splash on top); splash distance is from the blast to the
   nearest point of the body cylinder; a blast is blocked when neither the body centre nor a point near its top has
   a clear line; knock-back is added to the velocity; a shell explodes when its `ttl` runs out; a shell fired with
   the tube inside a wall explodes there.
5. Laser hits need the beam to cross the body cylinder itself (no extra beam radius); bullets use the body radius
   plus `projectile.gun_radius` (2.8 m, as measured in the replay). With `pierce`, the beam stops at the last target
   it is allowed to hit.
6. A held gun trigger carries the sub-tick remainder of the cooldown, so the long-run rate is exactly one shot per
   `cooldown`; a bot that fires only when the observation shows cooldown 0 gets one shot per 6 ticks (as in the
   recorded stream). Charge time counts the tick on which the trigger is first held.
7. Damaging a crate does not restart the regeneration timer; damaging a drone does (replay).
8. Upgrades that raise `mech.hp` heal the difference like cubes do; `capacitor` raises the maximum, not the current
   energy. `self.stats.hp` is the base value with plating; `max_hp` includes cubes.
9. Supply drop positions are drawn at the start, inside `spread` x the radius of the circle the zone is closing to
   at the call time; the ring is horizontal distance within `radius` and 6 m vertically; a capture also restores
   energy. The reward crosses several cube thresholds at once and queues that many offers.
10. Zone centres: uniform in the disc that keeps the next circle inside the current one. `zone.center` / `radius`
    in the observation are the current (interpolated) circle, as in the replay frames.
11. Spawns: on walkable open ground inside `spawn_zone_fraction` of the first circle, `arena_margin` from the map
    edge, `spawn_min_separation` apart (relaxed when the map is too crowded), torso facing the zone centre.
    Crates, floor loot and drones: uniform over walkable ground of the first circle; roof items 4-40 m above the
    terrain on building prisms.
12. Drones: wander at 60% of `speed`, shoot with a first-order lead and `spread_deg`, bullets live 150 m, eye and
    muzzle at 80% of the height, move toward the target only when they have no line to it, walk home after losing
    it. They do not collide with mechs. A dead mech's cubes land 1-2.5 m around it.
13. Sounds: `jet` once at the start of a burn and then every `step_every`; `boost` in place of `step` while
    running; `laser_charge` once when the charge starts; walls do not muffle sound; distance is horizontal.
14. Vision distance is between feet positions; items (cubes, pickups) count as 1 m tall. `hp` of other mechs is
    listed while `show_enemy_hp` is true.
15. A pickup needs the horizontal distance to the mech axis within `pickup_radius`; `take` and `drop` are read on
    the first tick after the decision.
16. Practice squad: no friendly fire inside the squad (shots pass through squad mates, blasts and arcs skip them).
    Option `friendlyFire: true` turns it on. In `ffa` every shot hits whatever it meets.
17. A jet clamps the vertical speed to `max_rise_speed` (so jump + jet climbs at 8.9 m/s, apex 14.9 m, as in the replay).
18. The debug field of an action is ignored (never read, not checked against the caps).

## House bots (`house.js`)

Stand-ins, not the organisers' code. Built from `notes/forensics.md` and `notes/housebot_model.json`:
first-order gun lead on the body centre with a ballistic guess for airborne targets, fire only with a clear muzzle
line and only on "cooldown 0", log-normal strafe reversals, jinking, the fixed jump-jet hop, range bands per type
expressed as bullet flight time (so one table serves both balances), weighted target re-selection (nearest two
times in three, median run 1.9 s), laser tracked through the charge and released at full, mortar on a low arc to a
led ground point, lightning in bursts, loot nearest second weapon, cubes, crates and drones by type, early
rotation into the next circle, no retreat. One behaviour is *inferred*: in the replay the hit rate on grounded
targets falls from 86% at 0.3-0.4 s of bullet flight to 32% at 0.5-0.6 s and stays near 22% beyond, airborne
targets keep being hit, and (checked on `tools/forensics/out/gunshots.json`) it does not matter whether the target
had the shooter in its view wedge (0.5-0.7 s: 25% seen, 30% unseen). Random strafing cannot produce that step; a
reversal that starts within 0.1 s of the shot does. The stand-ins therefore brake / reverse across the bearing of
any gun they hear (`dodgeSound`, `dodgeSoundS`); `dodgeShot` is the alternative "side-step a bullet it sees",
off by default. With the current 252 m/s bullets this matters beyond about 115 m only.

Levels and types live in the exported table `HOUSE` (`easy`, `medium`, `hard`, `expert`, and the replay's
`brawler`, `sniper`, `thirdparty`, `farmer`, `ffa_medium`): aim error and its drift, lead fraction, reaction
time, trigger duty, opening range, range band, strafe / jink / dodge, hop rates, loot and crate habits, mortar and
laser use, upgrade preference. `easy` is not in the replay; its numbers and the softened practice `medium` were
set so the starter bot scores what it scores officially (the replay's own medium is kept as `ffa_medium`).

Squad controller (`SQUAD`): shared vision (what any member's observation lists; `knows: 'always'` makes it
omniscient), hunters chosen weakest tier first and nearest inside a tier, hunter count
`huntersStart + huntersPerKill * dead members`, everybody from `allFromS` (300 s) or in the last
`allInLastPhases` (2) zone phases, `passiveFactor` (0.5) while the team bot has hurt nobody for `passiveWindowS`;
`hunterCount(kills, t, info)` replaces that schedule when set from code.
Non-hunters loot, rotate and hold; they shoot back only inside `defendRadius` or for `fightBackS` after being hit,
at `holdFireMult` of their trigger duty and without their second weapon (`holdSecondary`). Hunters without a
sighting walk to the last shared position, then to search points inside the zone.

## Tests (`test_sim.js`)

24 tests (25 with `--bench`): 18 scripted scenes that check the rules numerically (movement, roof edge, torso, gun, laser, lightning,
mortar, regeneration and zone, cubes and all 22 upgrade ids, loot, drones, supply drop, vision and sound, timing,
placement); determinism (same seed, same match, bit for bit, in `ffa` and `squad`); schema (every hello, obs and
end the simulator emits and every action the bots return, about 35 000 messages, against the kit schema);
conservation (every tick of a full match: inside the map, out of solids, finite state, HP and energy in range;
sixteen idle bots are all killed by the zone before the time cap, in a valid order); replay sanity (below); our
brain in-process and the kit's python starter through `procbot.js`; `--bench` plays 4800 decisions with all 16 alive.
The real recorded stream (`kit/check/stream.jsonl.gz`) passes the same schema checker and has the same key sets.

## Calibration status

Numbers from this machine, default tables. They move when the tables or the brain change: rerun.

- Replay sanity, old balance, 10 free-for-alls of the stand-ins: first death median about 32 s (replay 42 s, one
  match), match over median about 225 s (replay 210 s), gun hit rate by range 0-40 / 40-80 / 80-130 / 130+ m about
  96 / 72 / 43 / 24 % (replay 98 / 78 / 29 / 18 %).
- Squad, current balance, 40 matches (seeds 1-40): kit python starter 1.08 +- 0.15 (official 1.15),
  `baseline_bot.js` 1.18 +- 0.14. Records in `runs/sim_starter40.json`, `runs/sim_baseline40.json`.
- Speed: 4800 decisions with all 16 mechs alive (our brain + 15 squad bots) in about 6 s on one core.

## Known gaps

- The house bots are a model. Practice-squad behaviour (who hunts, how holders react, how the tiers differ) is not
  observable in any data we have; only the starter's official score anchors it. Treat absolute scores as relative.
- The stand-ins still hit more often at 80-130 m than the replay's bots (43% against 29%), and how real house bots
  evade long shots is inferred, not observed (see "House bots").
- Drones use simple straight-line movement; house bots walk the ground graph only (no deliberate roof play, as in
  the replay) and use the base body size for path planning.
- Physics approximations: terrain taller than a step is a wall for an airborne body by a point test; roof-edge
  landings use the prism footprint only; mech-on-mech stacking is not modelled (only the horizontal push).
- Sound does not model occlusion; drop landing spots ignore the zone drift between call and landing.
- `debug` drawings are not validated. The 64 KiB line limit is checked in the tests only.
