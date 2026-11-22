# Owner requests R1-R3: merge patch (prototype on a frozen copy)

Written 08:45 UTC Nov 21 by the R1-R3 prototype agent. R4 (mechanics study) is not in this patch.

- **Reference implementation (keep, do not edit):** `scratchpad/req_bot/` = `mechbot/bot` frozen at 07:37 UTC
  (base hashes: `scratchpad/req_work/base.sha256`; pristine copies of the five hooked files, recovered by hash:
  `scratchpad/req_work/base/lib/`). Final hashes of the changed files: `scratchpad/req_work/final.sha256`.
- **Three new modules (copy as they are):** `req_bot/lib/steal.js` (R1, 500 lines), `req_bot/lib/scan.js` (R2, 130),
  `req_bot/lib/aimcal.js` (R3 calibration, 80). They reach the brain only through `B` (`B.steal`, `B.scanner`, `B.aimcal`).
- **Five hooked files (small hunks):** `brain.js` (13 changed lines), `params.js` (19), `firecontrol.js` (71),
  `economy.js` (47), `tactics.js` (6). Unified diff against the 07:37 base: `scratchpad/req_work/requests_hooks.patch`
  (also reproduced in full at the end of this note).
- **Every request is behind PARAMS switches, default on:** `stealOn`, `crateGateOn` (R1), `scanOn` (R2), `headAimOn`,
  `aimCalOn` (R3); presets `R1`, `R2`, `R3` = `on` | `off` in `PRESETS`/`SELECT` (one string per A/B submission).
  **With all five switches off the brain is behaviour-identical to the base:** `test_brain.js` gives 57/57 with the
  same per-scenario numbers as the base copy (only timings differ).

## Merge in under an hour

1. `cp scratchpad/req_bot/lib/{steal,scan,aimcal}.js mechbot/bot/lib/`
2. `cd mechbot/bot && patch -p1 < ../../req_work/requests_hooks.patch` (paths: `scratchpad/req_work/requests_hooks.patch`).
   Dry run against the live bot at 08:40: `params.js`, `brain.js`, `firecontrol.js`, `tactics.js` apply (small offsets);
   `economy.js` 6 of 8 hunks apply, **hunks 1 and 3 fail** because the live file gained `killReachOk` / `killCubeR`.
   Apply those two by hand as shown in "economy.js by hand" below (keep the live kill-cube reach, add the R1 lines).
3. Tests: copy `req_bot/test_requests.js`, `req_bot/arena_req.js` to `mechbot/tools/`, and in `tools/arena_micro.js`
   change one line in `_tick` (enemy height for scripted hops; test tool only):
   `e.z = this._ground(e.x, e.y) + (e.hz || 0)`. In `test_requests.js` change the three `./lib/` imports to
   `../bot/lib/` and `ROOT` to the project root. Run `taskset -c 3 bun tools/test_requests.js` (12 checks, ~60 s)
   and `taskset -c 3 bun tools/test_brain.js` (57 checks).
4. Release gate / conformance as usual (the new code adds nothing to stdout/stderr; no allocation per tick beyond small
   objects; work per decision is bounded, see "Cost").

## R1 smart crate shooting + loot stealing (`lib/steal.js`, switches `stealOn`, `crateGateOn`)

New module `makeSteal(B, mover, econ)`; functions:

| function | called from | what it does |
| --- | --- | --- |
| `sense(obs)` | brain.js, stage `req` (after `sense`) | our `hit` events per target; "mech heard nearby" clock (step/boost/jet/reload/gun/laser/lightning/mortar `near`, laser_charge `mid`); death sound; for every listed crate (obs.crates hp) and drone (track hp): hp drop minus our hits = damage by others -> watch record (rate = damage / max(1 s, window)); beams by others ending on a crate/drone; the shooter = listed mech whose torso points at it (or the beam's `by`); `senseDeaths`; breaks of the steal target (gone from the list while we would see it) |
| `senseDeaths(obs)` | sense | `alive` dropped and a mech we saw last observation (sight test from our previous position) is gone, or a death sound on its bearing -> death record {spot, cubes + `death_drop_extra`, survivor = nearest other mech}; pushes the spot into `B.killDrops` (so `isKillCube` / the live `killReachOk` treat those cubes as kill cubes = R1c), deletes the dead track (no 5 s ghost) |
| `farmOk(kind)` / `crateFireOk()` | economy.chooseLoot / firecontrol | **smart shooting:** no crate or drone farming while a mech is tracked within `crateMechR` (conf > 0.3) or heard nearby within `crateQuietS`; a drone is not started while regeneration is pending (hp < `regenNeedHpf`, not hurt for 1 s); per-decision crate fire gate (a mech appearing mid-farm stops the crate shots at once); D6 gates (hp, out of contact, t < 210 s) stay in chooseLoot |
| `beingShot(id)` | chooseLoot | crates / drones others are shooting are not farmed by us (they spend the ammunition) |
| `choose(bestV, relaxed)` | end of chooseLoot (out of contact, D6) and, FFA only, its in-contact branch with `relaxed` | **R1a:** best crate/drone others shoot within `stealMaxD`, reachable (no roofs), shooter >= `stealShooterMinD` from it, no lightning shooter within 60 m, shooter not aiming at us, FFA: no other mech within `ffaThirdR`; time to break = hp / rate; skip when we cannot be there by break + `stealLateS`; zone slack at arrival; value (cube + 0.5 weapon) / time must beat `stealPrefer` x best ordinary loot; hysteresis 1.5x. `relaxed` (FFA): the only lines of fire on us are busy loot shooters (aim explained, not hostile). Gates: hp >= `farmHp` (SQUAD, D6) / `stealHpfFfa` (FFA), SQUAD t < `farmStopT` and not (10 cubes + laser), not hurt for 2 s, not LOSING / last stand / zone urgent |
| `planSpot()` | choose (start) | pickup spot `stealSide` m beside the crate off the shooter's line and `stealBehind` m behind it (crate catches the shooter's bullets, we are within the 3.5 m cube radius and the 4 m take radius); cover cell 8-18 m from the spot that the shooter cannot see and from which we see the crate (36 candidates x 3 rays, once per task, re-planned when the shooter moves 12 m) |
| `legs(l)` | economy.lootLegs for `type: 'steal'` | approach the cover cell, wait still (hidePhase); dash (boost if > 6 m) when time-to-break <= dash time + `stealLeadS`; stand on the spot; if the shooter stopped with the crate at <= 2 bullets, finish it ourselves (`B.stealFinish` bypasses the fire gate); after the break walk onto the cubes, stand for the weapon (hands() takes a wanted one), done; abandon on damage (not from the drone being stolen), stall, timeout `stealTimeout` (20 s skip) |
| `keep()` | chooseLoot in-contact branch | a started steal continues while no mech is hostile or aiming at us (aim at the crate is explained), hp gate holds, not hurt for 1 s |
| `busyWith(tr)` | tactics.selectTarget | during the dash / collect the non-hostile shooter is not a target candidate |
| `aimExplained(tr)` | tactics.assess (D0) and keep | a mech whose torso points at the crate / drone it is shooting (closer than us, smaller aim error) is not "aiming at us" -> not hostile from aim alone (damage still makes it hostile) |
| `deathItem(x, y, dist)` | economy chooseLoot `consider` and chooseGrab `tryOne` | **R1b:** items within 8 m of a recent foreign death (`deathDropS`): our path time (boost speed past 25 m) + `deathRushMargin` < survivor's -> 1 (bonus 1.5x, reach `deathRushR`, grabLegs boosts), else -1 (leave it; survivor gets the D11 third-party flag); 0 while LOSING (normal 12 m rule) |
| `thirdParty(tr)` | selectTarget (FFA candidates) | survivor of a duel next to a death within `ffaThirdS`, under 50% hp, nobody else within `ffaThirdR` of us |
| `race(x, y, ourEta)` | chooseLoot `consider` / chooseGrab `tryOne` for cubes and pickups | **R1d:** a mech walking at it (velocity within acos(`raceCos`)) that gets there first (+`raceMargin`) -> skip; contested but ours -> value x `raceBonus` |
| `dropOk(d, tApp)` | economy.chooseDrop | **R1e:** never a drop with a holder or progress, never a ring with a mech in it (+`dropRingPad`), never when a mech heading there arrives before us + `dropRaceS` |

R1c: `deathCubeMemS` (90 s) memory for kill cubes in chooseGrab; the reach in chooseLoot was `deathCubeR` (110 m) in
the frozen copy - **in the live file keep `killReachOk(c) ? P.killCubeR : P.grabCubeHi`** (it is the same idea with a
safety test) and drop `deathCubeR`.

Interpretation notes (please check): D6 binds the **start** of a steal in SQUAD (the brain's own "out of contact":
no line of fire on us); once started it continues through the shooter's line of sight while nobody is hostile.
In SQUAD a shooter inside our D2 band + 40 m becomes a D5 target anyway (FIGHT outranks LOOT), so steals mostly happen
in the opening, with far shooters, and in FFA. "Deny lasers" is only possible when we can take the laser ourselves
(the server refuses a second laser: `take_failed have`).

New PARAMS (R1): `stealOn true, crateGateOn true, crateMechR 120, crateQuietS 2, regenNeedHpf 0.97,
crateResetsRegen false, stealHpfFfa 0.7, stealMaxD 90, stealShooterMinD 25, stealRateMin 20, stealLateS 1.5,
stealLeadS 0.35, stealSide 3.0, stealBehind 0.9, stealTimeout 15, stealPrefer 0.8, deathDropS 30, deathRushR 100,
deathRushMargin 0.6, deathCubeR 110, deathCubeMemS 90, raceCos 0.85, raceMargin 0.5, raceBonus 1.6, dropRaceS 1.0,
dropRingPad 4`. (`crateMechR` / `crateQuietS` were 200 / 4 in the main A/B below; 120 / 2 after the split run.)

## R2 late-game scanning (`lib/scan.js`, switch `scanOn`)

New module `makeScanner(B)`:

| function | called from | what it does |
| --- | --- | --- |
| `sense(obs)` | brain.js stage `req` | rear hits (`damaged.rear`, attacker id); `alive`; 12 sectors of 30 deg: a sector is covered when its centre is 15 deg inside the view wedge; round robin one sector per decision: sight distance probe (3 `canSee` rays at 50 / 110 / 190 m) -> open approach (> 50 m) or walled (the 45 m all-round sense covers it); `openSince` when a sector opens |
| `active()` | firecontrol.scan | `scanOn` and late game: t >= `scanLateT` (240 s), alive <= `scanLateAlive` (8), or next radius <= `scanLateR` (140) |
| `look(wish)` | firecontrol.scan, after the attacker / unseen-damage priorities | interest per sector: open 1 (walled 0.15), + heard sounds (`B.heard`), + last damage bearing (decays over 10 s), + remembered unseen mechs, + zone interior, + travel direction, + the old scan's wish (corner pre-aim, look hint); next look = max(unseen seconds x interest); **an open approach unseen for more than `scanBlindMax - scanForceLead` (2.1 s) is forced first and pre-empts a normal look**, dwell `scanDwell`, lean toward the staler neighbour; the wish is honoured when everything is fresh |
| `rearPick(pick)` | end of tactics.selectTarget | engaged or not: a mech that hit our rear in the last `rearFaceS` (1.5 s) takes the torso (phantom tracks are pre-aimed by the existing memory branch), unless the current target is finishable now with a line |

firecontrol.scan: inserted after the "unseen damage bearing" line (see patch). New PARAMS: `scanOn true, scanLateT 240,
scanLateAlive 8, scanLateR 140, scanBlindMax 3.0, scanForceLead 0.9, scanDwell 0.12, rearFaceS 1.5`.
`debugState().scan` = { forced, sweeps, maxBlind } (maxBlind counted only inside sweeps longer than 4 s).

## R3 laser at the highest clear body point + calibration (`firecontrol.js`, `lib/aimcal.js`, switches `headAimOn`, `aimCalOn`)

firecontrol.js (`makeFireControl`):
- `LASER_RUNGS = P.aimLadder` = [0.8, 0.65, 0.5, 0.35, 0.2] of the target height (the track height already includes
  cubes); `GUN_RUNGS` = rungs <= `gunLadderTop` (0.65) downward, then the higher ones (a target showing only its top).
- Laser block: lead `ltl = latency + aimcal.lat()`; aim at the first rung with a clear muzzle line (ladder evaluated
  only while charging, <= 5 `shotClear`); command = intended yaw/pitch minus `aimcal.yaw()/pitch()`; the pitch gate is
  asymmetric (room above = (1 - frac) h, below = frac h; at 0.5 identical to the old gate); on release a record
  (target state, intended beam, commanded aim, torso settled within 0.012 rad) goes to `aimcal.onRelease`.
- Gun: with `headAimOn` the gun solution starts at `GUN_RUNGS[0]` and walks the ladder when the line is blocked; pitch
  gate from min(frac, 1 - frac). `calGun` (false) would also subtract the laser aim bias from the gun.
- With `headAimOn` false both use the old code paths (0.5, old +2 / +3.6 m gun ladder).
  `gunLadderTop` 0.65 instead of 0.8 is deliberate (gun spread 0.6 deg: at 150 m 1.6 m sigma against 1.8 m of
  body above a 0.8 aim point); set it to 0.8 to follow the request literally.

aimcal.js (`makeAimCal`): `onRelease(p)`, `sense(obs)` (after the beam appears: own beam = `obs.beams` entry with
`by === self.id`), `yaw()`, `pitch()`, `lat()`, `state`:
- aim bias = beam direction - predicted torso aim at release (only when the torso was settled), running mean gain
  `calGain` (0.5), bounded `calMaxRad` (0.03 rad); gross deviations (> 0.08 rad) rejected;
- latency = release time from the beam `age` (protocol example and simulator: age = obs time - fire time + 1 tick)
  minus the lead used; integral gain `calLatGain` (0.4), bounded `calMaxLat` (0.08 s);
- miss vector against the target body at the release time (lateral / vertical m): running diagnostic
  (`state.missLat`, `state.missV`); beams stopped short of the target (cover), gross misses (> `calMissMax` 6 m) and
  manoeuvring targets are not used;
- everything decays to zero with `calDecayS` (30 s) without new beams.
New PARAMS: `headAimOn true, aimLadder [0.8, 0.65, 0.5, 0.35, 0.2], gunLadderTop 0.65, aimCalOn true, calGain 0.5,
calLatGain 0.4, calMaxRad 0.03, calMaxLat 0.08, calDecayS 30, calMissMax 6, calGun false`.

**Open question for R4:** the protocol text says `beams` are those "fired by other mechs"; the local simulator does
not list our own beams either, so the calibration learnt nothing in any simulator match (`calBeams` 0) and is inert
there. If the real server does list our beams (the owner says it does), it works as tested in the arena; if not, it
stays at zero and costs nothing. Check on the first real stream we can get.

## Tests (`req_bot/test_requests.js`, 12 checks, all PASS; `req_bot/test_brain.js` 57/57 on, 57/57 off)

Closed-loop scenarios in the micro-arena (`arena_req.js`: our own beams in obs, hidden beam bias, rear flags and rear
damage, other mechs shooting crates, scripted deaths with drops, closest-mech cube rule, injected sounds):

- PASS  R1a crate shot by another mech: no ammunition spent, on the spot at the break (+-1 s), cube + laser ours; FFA shooter 25.5 m away walking to the cube -> ours: SQUAD on: cube 1, laser true, crate shots 0, at the spot -0.1 s before the break, steals 1 | off: cube 1, laser true, crate shots 0, -0.9 s | FFA on: cube 1 (shooter 0), laser true, kept in its sight 14 | off: cube 0 (shooter 1), laser false
- PASS  R1b kill drops: first by path time -> cubes + laser are ours; survivor closer -> we stay away: first: cubes 4, laser true, survivor got 0 cubes, death seen 1 | off: cubes 4, laser true | survivor 8 m away: our closest approach 74 m
- PASS  R1d pickup another mech walks to: ours when first; left alone when it gets there first: first: laser true | it is 16 m away: they took it 1, our end x -15 m, closest to it 44 m | off: end x -14 m, closest 21 m
- PASS  R1e supply drop: free -> DROP; mech in the ring or racing there first -> no DROP: free DROP | mech in the ring HOLD | mech 80 m beyond the ring boosting at it HOLD (off: DROP)
- PASS  R1 smart shooting: no crate shot while a mech is heard nearby; no drone started while regeneration is pending: quiet: first crate shot at 0.1 s | steps heard until 6 s: 10.4 s (off: 0.1 s) | drone at 93% hp: first shot 6.0 s at hp 99.4% (off: 0.2 s at 93.0%)
- PASS  R2 idle sweep (30 s, late game): no open approach blind for more than 3 s: open ground: max blind 2.50 s | real map near the centre: 1.60 s
- PASS  R2 late game idle: a silent mech 120 m behind (sound in front) is seen within 3 s: on: 0.6 / 0.9 / 0.3 / 0.7 / 0.5 / 1.0 s | off: 99.0 / 3.8 / 99.0 / 99.0 / 99.0 / 0.6 s (99 = not within 10 s)
- PASS  R2 engaged: a 30 dps rear attacker (45 with the rear multiplier, under the 60 dps veto) is faced within 1.5 s: on: faced after 0.40 s, rear hits 5, damage taken 563 | off: never, rear hits 5, damage taken 563
- PASS  R3 low wall: target with only the top over cover at 100-170 m -> laser hits: at 113 m: on: beams 6/6 hit, gun 29/36 | off: beams 1/4 hit, gun 16/24
- PASS  R3 calibration: a hidden 0.02 rad yaw / 0.012 rad pitch beam error is learnt within 3 beams: on: beams 4-15 10/10 hit (1-3: 2/3), learnt yaw 0.0182 pitch 0.0109 latency -0.044 s | off: 0/10 | no bias: 10/10, learnt yaw 0.0000 | own beams absent: 0/10, learnt yaw 0.0000
- PASS  fuzz: 3000 x 2 rich perturbed observations (crates hit by others, own beams, rear hits, deaths, late zones, FFA) never throw, valid actions: threw 0, invalid 0, slowest 12.37 ms, internal stage errors caught 0
- PASS  decision time: stream replay with the map (warm pass) and all request scenarios: mean <= 4, p99 <= 15, max <= 25 ms: stream on: mean 0.08 p99 1.73 max 6.14 | off: mean 0.05 p99 0.47 max 0.52 | scenarios: 4892 decisions, mean 0.05 p99 0.36 max 8.85 ms

Also: `test_brain.js` (all 57 old checks) passes with the requests on; with all switches off its scenario outputs are
the same as the base copy's (diff of the outputs without timing lines is empty). The start-up rehearsal now also feeds
crates losing hp, our own beams and a beam by another mech on a crate.

## Measured in the simulator (matched seeds, sandboxed roster opponents)

Driver: `scratchpad/req_work/sim/ab.mjs` (imports `mechbot/sim/run.js` `playMatch`, our frozen brain as a module,
`taskset -c 3`, one match at a time, answer timeout 1000 ms, map dir `/srv/mech-sparring/_arena`). Raw records:
`req_work/sim2/{squad,ffa,ffa_split,ffa_soft,squad_split}.jsonl`; summariser `req_work/sim/summ.py`.
SQUAD = our bot + 15 house bots of the simulator's squad; FFA = 6 sandboxed roster bots (magic_53f6854,
proj1_kite200_b624765, ttun_ae1b122, kanyaraasi_83e4c93, r1ver_ts_af337d5, nexus_v281_312d591 via
`/srv/mech-sparring/run.sh`) + 9 house FFA types. ON = all requests on; R1off / R2off / R3off = one request off;
OFF = all off (= the frozen base). Score = 16 - place. "ON - X" > 0 means the request helps. These runs used
`crateMechR` 200 / `crateQuietS` 4 (see the soft-gate line below for the current defaults).

SQUAD, 12 seeds:
```
== squad: seeds [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
cfg     n  score    se kills  alive  dealt  taken cubes laser% steal done rearF deaths  beamHit maxBlind maxMs
ON     12   3.58  0.83  3.50   71.4   6322   2081  5.00     42     1    0     7      1    79/86      0.0   8.9
R1off  12   4.17  0.99  4.17   76.9   7293   2130  5.75     42     0    0     6      0    70/77      0.0   6.8
R2off  12   3.50  0.93  3.42   70.8   6280   2065  4.83     42     1    0     0      1    81/90      0.0   9.7
R3off  12   4.00  0.83  3.92   77.5   7055   2090  5.08     42     1    0     7      1    91/93      0.0   8.3
OFF    12   3.67  0.76  3.67   73.0   6907   2104  4.83     42     0    0     0      0    80/82      0.0   5.9
  ON - R1off : mean -0.58 +- 0.72 (paired se, n=12), better 2 / worse 2 / same 8; per seed [2, -8, -2, 0, 0, 1, 0, 0, 0, 0, 0, 0]
  ON - R2off : mean +0.08 +- 0.15 (paired se, n=12), better 2 / worse 1 / same 9; per seed [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, -1, 1]
  ON - R3off : mean -0.42 +- 0.31 (paired se, n=12), better 2 / worse 4 / same 6; per seed [0, 0, -2, -2, 0, 0, 0, 0, -1, -2, 1, 1]
  ON - OFF   : mean -0.08 +- 0.36 (paired se, n=12), better 4 / worse 4 / same 4; per seed [2, 0, -2, -2, 0, 1, 0, 0, -1, -1, 1, 1]
```
FFA, 6 seeds:
```
== ffa: seeds [1, 2, 3, 4, 5, 6]
cfg     n  score    se kills  alive  dealt  taken cubes laser% steal done rearF deaths  beamHit maxBlind maxMs
ON      6   6.33  2.03  0.83   85.4   1545   2566  3.17     17     0    0     7      1    10/13      2.5   5.6
R1off   6   9.33  2.42  1.17  135.6   2834   3539  5.67     17     0    0     5      0      8/9      2.5   9.4
R2off   6   5.00  1.00  0.33   45.1    963   1792  1.83     17     0    0     0      1      4/4      0.0   4.1
R3off   6   5.33  0.99  0.33   47.3   1087   1939  1.50     17     0    0     4      1      3/5      0.0   3.5
OFF     6   6.00  1.06  0.83   48.3   1157   1743  1.33     17     0    0     0      0      5/6      0.0   2.2
  ON - R1off : mean -3.00 +- 1.63 (paired se, n=6), better 1 / worse 4 / same 1; per seed [1, -8, -1, -8, 0, -2]
  ON - R2off : mean +1.33 +- 1.54 (paired se, n=6), better 1 / worse 1 / same 4; per seed [9, 0, 0, 0, 0, -1]
  ON - R3off : mean +1.00 +- 1.75 (paired se, n=6), better 2 / worse 1 / same 3; per seed [8, 0, 3, 0, 0, -5]
  ON - OFF   : mean +0.33 +- 2.01 (paired se, n=6), better 2 / worse 2 / same 2; per seed [9, -2, 1, 0, 0, -6]
```
Splits:
- FFA R1: crate gate off (steal on) 7.33, steal off (gate on) 6.67, both off 9.33, ON 6.33; ON - gate-off
  -1.00 +- 0.63, ON - steal-off -0.33 +- 0.42. Softer gate `crateMechR 120, crateQuietS 2` (now the default): 7.33 on
  the same seeds (paired against the old ON +1.00), mean cubes 2.2.
- SQUAD R3: gun centre-first (`gunLadderTop 0.5`, laser ladder kept) 3.58; laser centre-first (gun ladder kept)
  3.50; ON 3.58; R3off 4.00. Laser hits ON 79/86, R3off 91/93, gun centre-first 75/78, laser centre-first 81/84;
  gun hits on mechs 897/1036 (gun centre-first) vs 859/1031 (gun from the 0.65 rung).
- Micro-arena probe of R3 (`req_work/probe_hop.mjs`), target strafing at 11.7 m/s with reversals every 1.3 s, with and
  without house-bot hops (jump + 1.5 s jet every 3 s), at 110 / 150 / 180 m: laser 25/25 beams on and off in all six
  cases; gun hits, on / off (same shots): 67/72, 57/55, 24/25, 26/25, 28/27, 24/21 (of 96-140 shots each).

Honest reading: every paired difference is within about two standard errors; most seeds are identical and the rest
swing by up to 9 places because any change alters the whole match (chaotic divergence). Behaviour counts show what
fired: in SQUAD R1 started 1 steal in 12 matches (D6 + D5 keep it rare), R2's rear-face fired 7 times and its sweep
never ran long (the simulator squad rarely lets us reach the late game: mean 71 s alive); in FFA R2's sweep ran (max
blind inside sweeps 2.5 s) and rear-face fired 7 times; R3's calibration learnt nothing (no own beams in the simulator).
The only signal with a consistent sign is **R1 in FFA (negative, mostly the crate gate)**, now softened in the default;
**R3 in SQUAD is slightly negative (-0.42 +- 0.31)** but neither ladder alone reproduces it and the arena shows no
loss. Recommendation: merge with the presets, keep `R1`, `R2`, `R3` as one-string A/B presets for the real scorer
(local simulators mispredict, see HANDOFF), and if a submission slot is spare, try `R3: 'off'` against `on` first.

## Cost (one core, `taskset -c 3`)

Stream replay with the map, warm pass: on mean 0.08 ms, p99 1.7 ms, max 6.1 ms; off mean 0.05, p99 0.5, max 0.5.
All request scenarios: 4892 decisions, mean 0.05, p99 0.36, max 8.9 ms. Fuzz (6000 rich perturbed observations):
slowest 12.4 ms, never throws, always valid. Simulator: 132 matches, max decision 12.2 ms, 0 late answers,
0 errors. Bounded work per decision: R1 sense O(crates x beams + watch x tracks) (caps 64 / 16 / 48 / 64), sight
rays only when `alive` drops (<= 4) and 72 rays once per steal start; R2 3 rays; R3 <= 5 `shotClear` while charging.

## economy.js by hand (hunks 1 and 3 against the live file)

Hunk 1, `chooseLoot()`: replace `if (!quiet && B.everSawMech) return` with
```js
    const S = B.steal
    const quiet = t - B.lastContactT >= 3 && B.A === 0
    if (!quiet && B.everSawMech) {
      // R1: a steal in progress is kept; in FFA one may start while the only lines of fire on us are busy loot shooters
      const k = S && (S.keep() || (B.env === 'FFA' ? S.choose(0, true) : null))
      if (k) B.loot = k
      return
    }
```
and in its `consider` closure:
```js
      const d = pathEst(o.x, o.y)
      const di = S && (type === 'cube' || type === 'pickup') ? S.deathItem(o.x, o.y, d) : 0     // R1b kill drops
      if (di < 0) return
      if (d > (di > 0 ? Math.max(maxPath, P.deathRushR) : maxPath)) return
      // ... unchanged lines ...
      let v = value / (tt + 0.5) * (di > 0 ? 1.5 : 1)
      if (S && (type === 'cube' || type === 'pickup') && di === 0) { const r = S.race(o.x, o.y, tt); if (r < 0) return; if (r > 0) v *= P.raceBonus }   // R1d
      if (v > bestV) { bestV = v; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o, rush: di > 0 } }
```
Keep the live cube line (`killReachOk(c) ? P.killCubeR : P.grabCubeHi`) instead of the frozen copy's `deathCubeR`.
The other chooseLoot lines (crate / drone farm gates, `beingShot`, the final `S.choose(bestV)`) are in hunk 2, which applies.

Hunk 3, `chooseGrab()`: add `const S = B.steal` before `tryOne`, and in `tryOne` the same `di` lines (`deathItem`
before the reach test, the 1.5x factor, `race` when `di === 0`, `rush: di > 0` in the record); the live cube loop becomes
```js
    if (cubesWanted()) for (const c of B.cubes.values()) { const kc = isKillCube(c); if (t - c.seen <= (kc && P.stealOn ? P.deathCubeMemS : P.cubeMemS)) tryOne('cube', c, kc ? 1.5 : 1, kc && killReachOk(c) ? killR : cubeR) }   // R1c memory
```

## Things to know when merging

- `aimExplained` changes D0 hostility in both postures (a mech shooting a crate or drone near us is no longer
  "aiming at us"); damage still makes it hostile. `stealOn: false` restores the old rule.
- `rearPick` acts all game (not only late) when `scanOn`.
- The live `economy.js` now has its own long kill-cube reach; R1c adds only the longer memory there.
- `B.killDrops` entries from foreign deaths carry `foreign: true`; nothing else reads that flag.
- The simulator's FFA latch fired in 37/48 FFA match records (in the others the match ended for us before the latch).
- One 10 s micro-arena probe ran on core 2 by mistake (not a simulator job); everything else ran on core 3, one job at a time.
- Nothing under `mechbot/bot`, `mechbot/sim` or `mechbot/intel` was edited or opened for editing; the hooked-file base
  copies came from `mechbot/tools/fix2/` by hash.

## Full hook diff (base 07:37 -> req_bot), also `scratchpad/req_work/requests_hooks.patch`

```diff
--- a/lib/params.js	2026-11-21 08:14:26.339402015 +0000
+++ b/lib/params.js	2026-11-21 08:24:15.052742562 +0000
@@ -81,6 +81,20 @@
   dropMaxD: 250, dropEarlyS: 3, dropContestR: 60, dropLeaveR: 70, dropHpBase: 200, dropCaptureS: 4,
   idlePull: false, idlePullS: 20, idlePullHpf: 0.9, roamStep: 0.15,
 
+  // ---- owner request R1 (lib/steal.js): smart crate shooting + loot stealing. Switches: stealOn (a-e), crateGateOn.
+  stealOn: true, crateGateOn: true,
+  crateMechR: 120, crateQuietS: 2, regenNeedHpf: 0.97, crateResetsRegen: false,     // smart shooting gates
+  stealHpfFfa: 0.7, stealMaxD: 90, stealShooterMinD: 25, stealRateMin: 20, stealLateS: 1.5, stealLeadS: 0.35,
+  stealSide: 3.0, stealBehind: 0.9, stealTimeout: 15, stealPrefer: 0.8,                  // a) crates / drones others shoot
+  deathDropS: 30, deathRushR: 100, deathRushMargin: 0.6, deathCubeR: 110, deathCubeMemS: 90,   // b) kill drops, c) death cubes
+  raceCos: 0.85, raceMargin: 0.5, raceBonus: 1.6,                                       // d) pickups others walk to
+  dropRaceS: 1.0, dropRingPad: 4,                                                       // e) supply drops
+  // ---- owner request R2 (lib/scan.js): late-game torso sweep. Switch: scanOn.
+  scanOn: true, scanLateT: 240, scanLateAlive: 8, scanLateR: 140, scanBlindMax: 3.0, scanForceLead: 0.9, scanDwell: 0.12, rearFaceS: 1.5,
+  // ---- owner request R3: aim at the highest clear body point (headAimOn, firecontrol.js) + calibration (aimCalOn, lib/aimcal.js)
+  headAimOn: true, aimLadder: [0.8, 0.65, 0.5, 0.35, 0.2], gunLadderTop: 0.65,
+  aimCalOn: true, calGain: 0.5, calLatGain: 0.4, calMaxRad: 0.03, calMaxLat: 0.08, calDecayS: 30, calMissMax: 6, calGun: false,
+
   // ---- layer 6
   ambushRun: 50, ambushHpf: 0.5, ambushStallS: 3,
 
@@ -109,8 +123,12 @@
   gunlessClue: { off: { gunlessClue: false }, on: { gunlessClue: true } },
   idlePull: { off: { idlePull: false }, on: { idlePull: true } },
   env: { auto: { env: 'auto' }, squad: { env: 'squad' } },
+  // owner requests: one string turns a whole request off for an A/B
+  R1: { on: { stealOn: true, crateGateOn: true }, off: { stealOn: false, crateGateOn: false } },
+  R2: { on: { scanOn: true }, off: { scanOn: false } },
+  R3: { on: { headAimOn: true, aimCalOn: true }, off: { headAimOn: false, aimCalOn: false } },
 }
-export const SELECT = { laserRange: 'far', healExit: '70', farmHp: '90', strafe: 'd4', ffaPair: 'on', beamClue: 'off', gunlessClue: 'off', idlePull: 'off', env: 'auto' }
+export const SELECT = { laserRange: 'far', healExit: '70', farmHp: '90', strafe: 'd4', ffaPair: 'on', beamClue: 'off', gunlessClue: 'off', idlePull: 'off', env: 'auto', R1: 'on', R2: 'on', R3: 'on' }
 
 /** PARAMS <- presets (SELECT, then overrides.select) <- plain overrides. */
 export function resolveParams(overrides) {
--- a/lib/brain.js	2026-11-21 08:14:26.339326253 +0000
+++ b/lib/brain.js	2026-11-21 07:58:17.140106081 +0000
@@ -16,6 +16,9 @@
 import { makeFireControl } from './firecontrol.js'
 import { makeEconomy } from './economy.js'
 import { makeStance } from './stance.js'
+import { makeSteal } from './steal.js'
+import { makeScanner } from './scan.js'
+import { makeAimCal } from './aimcal.js'
 
 export { PARAMS, MODE }
 
@@ -101,8 +104,8 @@
         weapons: [wp('gun', { ammo: 12 - (i % 13), reload: i === 13 ? 1.2 : 0, cooldown: (i % 5) * 0.05 }), ph === 5 || ph === 6 || ph === 11 ? wp('laser', { charge: (i % 9) * 0.1 }) : ph >= 7 && ph <= 8 ? wp(ph === 7 ? 'lightning' : 'mortar', {}) : null], stats: m },
       mechs: ph === 0 || ph === 4 ? [] : ph === 3 || ph === 9 || ph === 12 ? [mech(5, ex, ey, 900, ['gun', 'laser']), mech(6, x - 60, y + 40, 1300, ['gun', 'mortar'])] : [mech(5, ph === 7 ? x + 30 : ex, ph === 7 ? y + 5 : ey, ph === 8 ? 250 : 1100, ['gun', 'laser'])].concat(ph === 8 ? [{ id: 120, kind: 'npc', pos: [x + 50, y - 20, z], vel: [1, 0, 0], aim: [0, 0], hp: 350, max_hp: 350 }] : []),
       projectiles: (ph === 5 ? [{ id: 400 + (k >> 3), kind: 'mortar', pos: [x + 40 - i * 2, y, z + 25], vel: [-40, 0, -2 * i] }] : []).concat(bullets),
-      crates: ph === 0 || ph === 8 ? [{ id: 1001, pos: [x + 20, y + 14, z], hp: 300 }] : [], cubes: ph === 0 || ph === 4 || ph === 6 ? [{ id: 5001, pos: [x - 12, y + 9, z] }] : [],
-      pickups: [{ id: 8001, kind: ph % 2 ? 'laser' : 'lightning', pos: [x + 2 + (ph === 6 ? 30 : 0), y + 1, z] }], sounds: [{ kind: 'gun', bearing: 1, dist: 'mid', age: 0.05 }, { kind: 'death', bearing: -1, dist: 'far', age: 0.1 }], beams: ph === 12 ? [{ by: 5, kind: 'laser', path: [[ex, ey, z + 7], [x - 60, y + 40, z + 4]], age: 0.05 }] : [],
+      crates: ph === 0 || ph === 8 ? [{ id: 1001, pos: [x + 20, y + 14, z], hp: 300 - (i % 10) * 25 }] : [], cubes: ph === 0 || ph === 4 || ph === 6 ? [{ id: 5001, pos: [x - 12, y + 9, z] }] : [],
+      pickups: [{ id: 8001, kind: ph % 2 ? 'laser' : 'lightning', pos: [x + 2 + (ph === 6 ? 30 : 0), y + 1, z] }], sounds: [{ kind: 'gun', bearing: 1, dist: 'mid', age: 0.05 }, { kind: 'death', bearing: -1, dist: 'far', age: 0.1 }], beams: ph === 12 ? [{ by: 5, kind: 'laser', path: [[ex, ey, z + 7], [x - 60, y + 40, z + 4]], age: 0.05 }] : ph === 5 || ph === 11 ? [{ by: 3, kind: 'laser', path: [[x + 3, y, z + 7], [ex, ey, z + 6]], age: 0.1 }, { by: 6, kind: 'laser', path: [[x - 60, y + 40, z + 7], [x + 20, y + 14, z + 1]], age: 0.05 }] : [],
       events: ph >= 1 && i % 3 === 0 ? [{ type: 'damaged', amount: 45, weapon: 'gun', bearing: 0.3, by: ph === 6 ? 9 : 5 }, { type: 'hit', target: 5, amount: 45, weapon: 'gun' }].concat(ph === 6 && i === 9 ? [{ type: 'kill', target: 5 }] : []) : [],
       drops: ph === 9 ? [{ id: 20000, pos: [x + 30, y - 30, z], radius: 8, lands_in: 3 - i * 0.1, capture_s: 4, progress: 0, holder: null }] : [],
       zone: { center: [x + (ph === 4 ? 700 : 0), y], radius: ph === 13 ? 60 : 500, next_center: [x + (ph === 4 ? 700 : 30), y], next_radius: ph === 13 ? (i % 2 ? 20 : 0) : 300, shrink_start: t + (ph === 13 ? -1 : 5), shrink_end: t + 40, dps: 20 },
@@ -175,6 +178,10 @@
   const posEval = makePosEval(B)
   const fc = makeFireControl(B)
   const econ = makeEconomy(B, mover)
+  // owner requests R1-R3: reached by the other layers through B (each behind its PARAMS switch)
+  B.steal = makeSteal(B, mover, econ)
+  B.scanner = makeScanner(B)
+  B.aimcal = makeAimCal(B)
   const stance = makeStance(B, mover, hideSearch, posEval)
   const now = () => performance.now()
   let lastEvalT = -9, actT0 = 0
@@ -439,6 +446,7 @@
       const cmd = B.cmd, out = B.out
       const pmx = cmd.mx, pmy = cmd.my, pb = cmd.boost, py = out.aim[0], pp = out.aim[1]
       if (!stage('sense', () => sense(B, obs))) { /* keep going with the previous model */ }
+      stage('req', () => { B.steal.sense(obs); B.scanner.sense(obs); B.aimcal.sense(obs) })
       stage('assess', () => {
         assess(B)
         let ch = -99
@@ -474,6 +482,7 @@
       leg: B.legKind, aim: B.aimKind, A: B.A, n1: B.n1, losing: B.losing, hide: B.hide.state, zoneMargin: B.zoneMargin,
       errors: { ...B.errorsByStage }, gun: B.gunStat.dump(), F: stance.F ? stance.F() : 0, Q: stance.Q ? stance.Q() : 0,
       selected: P.selected, rehearsal: warmInfo,
+      steal: B.steal.debug(), scan: { ...B.scanner.stats }, cal: { ...B.aimcal.state },
     }
   }
 
--- a/lib/firecontrol.js	2026-11-21 08:14:26.341152950 +0000
+++ b/lib/firecontrol.js	2026-11-21 07:58:51.072268129 +0000
@@ -8,6 +8,12 @@
   const ps = { x: 0, y: 0, z: 0 }                 // our predicted feet position when the shot leaves
   const sol = { ok: false, yaw: 0, pitch: 0, x: 0, y: 0, z: 0, dist: 0, t: 0, hi: false }
   const st = { scanDir: 1, scanFlipT: 0, dwellUntil: -1, dwellYaw: 0 }
+  // R3: aim-point ladders as fractions of the target height (cubes included): laser from the top down, gun from
+  // gunLadderTop down and then the higher rungs (a target showing only its top over cover)
+  const MID = [0.5]
+  const LASER_RUNGS = Array.isArray(P.aimLadder) && P.aimLadder.length ? P.aimLadder.filter((f) => f > 0 && f < 1) : MID
+  const GUN_RUNGS = LASER_RUNGS.filter((f) => f <= P.gunLadderTop + 1e-9).sort((a, b) => b - a).concat(LASER_RUNGS.filter((f) => f > P.gunLadderTop + 1e-9).sort((a, b) => a - b))
+  const rel = { t: 0, id: -1, tl: 0, frac: 0.5, yaw: 0, pitch: 0, pyaw: 0, ppitch: 0, settled: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, n: 0 }
 
   function predictSelf(tl) {
     const me = B.me, cmd = B.cmd
@@ -102,6 +108,13 @@
     const at = B.topAttacker
     if (at) { out.aim[0] = Math.atan2(at.y - me.y, at.x - me.x); out.aim[1] = pitchTo(at.x, at.y, at.z + at.height * 0.5); return 'attacker' }
     if (t - B.unseenHurtT <= P.faceAttackerS) { out.aim[0] = B.unseenHurtBearing; out.aim[1] = 0; return 'bearing' }
+    // R2 late game: sector sweep; the corner pre-aim and the look hint become wishes inside it
+    if (B.scanner && B.scanner.active()) {
+      const pre = B.lostTarget && t - B.lostTargetT <= P.preAimS
+      const wish = pre ? Math.atan2(B.lostY - me.y, B.lostX - me.x) : B.lookHint ? Math.atan2(B.lookY - me.y, B.lookX - me.x) : NaN
+      const y = B.scanner.look(wish)
+      if (y === y) { out.aim[0] = y; out.aim[1] = pre && y === wish ? pitchTo(B.lostX, B.lostY, B.lostZ) : 0; return y === wish ? 'sweepwish' : 'sweep' }
+    }
     // 2. the corner where the target disappeared
     if (B.lostTarget && t - B.lostTargetT <= P.preAimS) { out.aim[0] = Math.atan2(B.lostY - me.y, B.lostX - me.x); out.aim[1] = pitchTo(B.lostX, B.lostY, B.lostZ); return 'preaim' }
     // 3. a look hint from the mode (ambush corner, drop ring, loot)
@@ -137,7 +150,7 @@
       out.aim[0] = Math.atan2(tgt.y - me.y, tgt.x - me.x); out.aim[1] = pitchTo(tgt.x, tgt.y, tgt.z + tgt.height * 0.5)
       B.aimKind = 'memory'
       tgt = null
-    } else if (!tgt && B.shootCrate && !hold) shootObj = B.shootCrate
+    } else if (!tgt && B.shootCrate && !hold && (!B.steal || B.steal.crateFireOk())) shootObj = B.shootCrate
 
     let laserRelease = false, laserKeep = false
     if (tgt && B.ambushAim && !tgt.losOut) {
@@ -157,11 +170,24 @@
       let gunOk = false, gunFire = false, gunReady = false, gYaw = 0, gPitch = 0, yawGate = 0, pitGate = 0
       const tlg = g ? gunLatency(g.cooldown) : tl
       if (g) predictSelf(tlg)
-      if (g && gunSolve(o, tlg, 0.5)) {
+      const head = !!tgt && P.headAimOn
+      if (g && gunSolve(o, tlg, head ? GUN_RUNGS[0] : 0.5)) {
         gunOk = true
         let clear = muzzleClear(sol.yaw, sol.pitch, sol.x, sol.y, sol.z)
         let hFrac = 0.5
-        if (!clear && tgt) {
+        if (head) {
+          // R3 ladder: first rung with a clear line; the pitch gate keeps the room left above / below that rung
+          hFrac = Math.min(GUN_RUNGS[0], 1 - GUN_RUNGS[0])
+          if (!clear) {
+            const y0 = sol.yaw, p0 = sol.pitch, d0 = sol.dist, x0 = sol.x, yy0 = sol.y, z0 = sol.z, t0 = sol.t
+            for (let k = 1; k < GUN_RUNGS.length && !clear; k++) {
+              const f = GUN_RUNGS[k]
+              if (gunSolve(o, tlg, f) && muzzleClear(sol.yaw, sol.pitch, sol.x, sol.y, sol.z)) { clear = true; hFrac = Math.min(f, 1 - f) }
+            }
+            if (!clear) { sol.ok = true; sol.yaw = y0; sol.pitch = p0; sol.dist = d0; sol.x = x0; sol.y = yy0; sol.z = z0; sol.t = t0 }
+          }
+          if (P.calGun && B.aimcal) { sol.yaw = wrapPi(sol.yaw - B.aimcal.yaw()); sol.pitch -= B.aimcal.pitch() }
+        } else if (!clear && tgt) {
           // D8 aim-point ladder: centre, +2 m, +3.6 m (scaled by size), first with a clear line; small upward gate
           const y0 = sol.yaw, p0 = sol.pitch, d0 = sol.dist, x0 = sol.x, yy0 = sol.y, z0 = sol.z, t0 = sol.t
           const sc = o.height / (B.cfg.mech.height || 9)
@@ -193,24 +219,37 @@
       // ---------------- laser (hitscan: aim at where the target will be when the beam leaves)
       if (g) predictSelf(tl)
       if (lz && tgt) {
-        const lx = tgt.x + tgt.vx * tl, ly = tgt.y + tgt.vy * tl, lzc = tgt.z + tgt.height * 0.5 + (Math.abs(tgt.vz) >= 0.5 ? tgt.vz * tl : 0)
+        // R3: lead with the calibrated latency, aim at the highest clear rung, command minus the calibrated aim bias
+        const AC = B.aimcal
+        const ltl = tl + (AC ? AC.lat() : 0)
+        if (ltl !== tl) predictSelf(ltl)
+        const lx = tgt.x + tgt.vx * ltl, ly = tgt.y + tgt.vy * ltl, zAir = Math.abs(tgt.vz) >= 0.5 ? tgt.vz * ltl : 0
         const sx = ps.x, sy = ps.y, sz = ps.z + me.muzzleH
         const ldx = lx - sx, ldy = ly - sy, lh = Math.hypot(ldx, ldy) || 1
-        const lyaw = Math.atan2(ldy, ldx), lpitch = clamp(Math.atan2(lzc - sz, lh), me.minPitch, me.maxPitch)
-        const lR = Math.hypot(lh, lzc - sz)
+        const rungs = P.headAimOn ? LASER_RUNGS : MID
+        let frac = rungs[0], lzc = tgt.z + tgt.height * frac + zAir
+        const lyaw = Math.atan2(ldy, ldx)
+        let lpitch = clamp(Math.atan2(lzc - sz, lh), me.minPitch, me.maxPitch)
+        let lR = Math.hypot(lh, lzc - sz)
         const inRange = lR <= lz.range * P.laserRangeFrac
         const charge = lz.charge
         if (charge > 0 || wasHolding) {
+          let clear = inRange && muzzleClear(lyaw, lpitch, lx, ly, lzc)
+          for (let k = 1; k < rungs.length && inRange && !clear; k++) {
+            const f = rungs[k], z = tgt.z + tgt.height * f + zAir, pt = clamp(Math.atan2(z - sz, lh), me.minPitch, me.maxPitch)
+            if (muzzleClear(lyaw, pt, lx, ly, z)) { clear = true; frac = f; lzc = z; lpitch = pt; lR = Math.hypot(lh, z - sz) }
+          }
+          const cyaw = AC ? wrapPi(lyaw - AC.yaw()) : lyaw, cpitch = AC ? clamp(lpitch - AC.pitch(), me.minPitch, me.maxPitch) : lpitch
           const full = charge >= P.laserFullFrac * lz.full
           if (full) { if (lz.fullSince < 0) lz.fullSince = t } else lz.fullSince = -1
           const takeAim = charge >= P.laserTakeFrac * lz.full - 1e-6
-          const cy = takeAim ? lyaw : out.aim[0], cp = takeAim ? lpitch : out.aim[1]
-          const ey = Math.abs(angDiff(predYaw(cy, tl), lyaw)), ep = Math.abs(predPitch(cp, tl) - lpitch)
-          const gate = ey <= Math.atan2(tgt.radius * P.laserGateK, lR) && ep <= Math.atan2(tgt.height * 0.5 * P.laserGateK, lR)
-          const clear = inRange && muzzleClear(lyaw, lpitch, lx, ly, lzc)
+          const cy = takeAim ? cyaw : out.aim[0], cp = takeAim ? cpitch : out.aim[1]
+          const ey = Math.abs(angDiff(predYaw(cy, tl), cyaw)), ep = predPitch(cp, tl) - cpitch
+          const gate = ey <= Math.atan2(tgt.radius * P.laserGateK, lR) && ep <= Math.atan2(tgt.height * (1 - frac) * P.laserGateK, lR) && -ep <= Math.atan2(tgt.height * frac * P.laserGateK, lR)
           const mult = me.dmgMult * (tgt.rearOn ? me.rearMult : 1) * (tgt.hasMortar ? 1 + lz.cookoff : 1)
           const killNow = charge >= (lz.st.min_charge || 0.15) && laserFrac(charge, lz.full, lz.minFrac) * lz.damage * mult >= tgt.hp
-          if (takeAim || killNow) { out.aim[0] = lyaw; out.aim[1] = lpitch; B.aimKind = 'laser' }
+          if (takeAim || killNow) { out.aim[0] = cyaw; out.aim[1] = cpitch; B.aimKind = 'laser' }
+          rel.t = t; rel.id = tgt.id; rel.tl = ltl; rel.frac = frac; rel.yaw = lyaw; rel.pitch = lpitch; rel.x = tgt.x; rel.y = tgt.y; rel.z = tgt.z; rel.vx = tgt.vx; rel.vy = tgt.vy
           if (gate && clear && (full || killNow)) laserRelease = true
           else if (full && t - lz.fullSince >= P.laserForceS) laserRelease = true
           else if (B.noCharge && charge < lz.full - 0.1) laserRelease = true      // the legs need full speed now
@@ -258,7 +297,15 @@
     }
     if (lz) {
       if (laserKeep && !laserRelease) { out.fire[lz.slot] = true; lz.heldT = t }
-      else if (laserRelease) { B.counters.laserShots++; lz.fullSince = -1 }
+      else if (laserRelease) {
+        B.counters.laserShots++; lz.fullSince = -1
+        if (B.aimcal && P.aimCalOn && tgt && rel.t === t && rel.id === tgt.id) {
+          // R3 calibration record: the torso aim at release is the command when the torso has settled on it
+          rel.pyaw = out.aim[0]; rel.ppitch = out.aim[1]
+          rel.settled = Math.abs(angDiff(me.yaw, out.aim[0])) < 0.012 && Math.abs(me.pitch - out.aim[1]) < 0.012
+          B.aimcal.onRelease({ ...rel })
+        }
+      }
     }
     // ---------------- lightning: nearest mech inside the cone, no lead
     if (li && !hold && li.cooldown <= P.readyCd + 0.05) {
--- a/lib/economy.js	2026-11-21 08:14:26.339375154 +0000
+++ b/lib/economy.js	2026-11-21 08:10:23.605353146 +0000
@@ -70,26 +70,35 @@
   function chooseLoot() {
     const me = B.me, t = me.t
     B.loot = null; B.farmNpc = -1
+    const S = B.steal
     const quiet = t - B.lastContactT >= 3 && B.A === 0
-    if (!quiet && B.everSawMech) return
+    if (!quiet && B.everSawMech) {
+      // R1: a steal in progress is kept; in FFA one may start while the only lines of fire on us are busy loot shooters
+      const k = S && (S.keep() || (B.env === 'FFA' ? S.choose(0, true) : null))
+      if (k) B.loot = k
+      return
+    }
     const ffa = B.env === 'FFA'
     const farm = me.hpf >= P.farmHp && t < P.farmStopT && !(me.cubes >= P.farmStopCubes && me.laser) && (!ffa || nearestMechD() > P.ffaFarmClear)
     let best = null, bestV = 0
     const consider = (type, o, value, extraT, maxPath) => {
       if (mover.isAbandoned(o.x, o.y)) return
       const d = pathEst(o.x, o.y)
-      if (d > maxPath) return
+      const di = S && (type === 'cube' || type === 'pickup') ? S.deathItem(o.x, o.y, d) : 0     // R1b kill drops
+      if (di < 0) return
+      if (d > (di > 0 ? Math.max(maxPath, P.deathRushR) : maxPath)) return
       const tt = d / me.walk + extraT
       if (zoneSlack(B, o.x, o.y, t + tt + P.zoneArriveSlack) < 3) return
       if (type !== 'drone' && nearDrone(o.x, o.y)) return
       if (!reachable(o.x, o.y, o.z)) return
-      const v = value / (tt + 0.5)
-      if (v > bestV) { bestV = v; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o } }
+      let v = value / (tt + 0.5) * (di > 0 ? 1.5 : 1)
+      if (S && (type === 'cube' || type === 'pickup') && di === 0) { const r = S.race(o.x, o.y, tt); if (r < 0) return; if (r > 0) v *= P.raceBonus }   // R1d
+      if (v > bestV) { bestV = v; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o, rush: di > 0 } }
     }
     const cubeV = me.cubes >= (B.cfg.cubes.stat_cap || 10) ? 0.4 : P.cubeValue
     if (cubesWanted()) for (const c of B.cubes.values()) {
       const nearKill = isKillCube(c)
-      consider('cube', c, nearKill ? cubeV * 1.5 : cubeV, 0, nearKill ? P.grabCubeHi : P.lootCubePath)
+      consider('cube', c, nearKill ? cubeV * 1.5 : cubeV, 0, nearKill ? (P.stealOn ? P.deathCubeR : P.grabCubeHi) : P.lootCubePath)
     }
     for (const p of B.pickups.values()) {
       if (B.badPickups.has(p.id) && t - B.badPickups.get(p.id) < 30) continue
@@ -97,17 +106,20 @@
     }
     if (farm) {
       const wantW = !me.weapons[0] || !me.weapons[1]
-      if (me.gun && !(ffa && nearestMechD() < 320)) for (const c of B.crates.values()) {
+      if (me.gun && !(ffa && nearestMechD() < 320) && (!S || S.farmOk('crate'))) for (const c of B.crates.values()) {
+        if (S && S.beingShot(c.id)) continue                              // R1a: someone else spends the ammunition (steal instead)
         const shootT = Math.max(1, c.hp) / Math.max(1, me.gun.damage * me.dmgMult) * me.gun.cd + 1
         consider('crate', c, 1 + (wantW ? 0.5 * P.weaponValue : 0), shootT, P.lootCratePath)
       }
-      if (me.gun) for (let k = 0; k < B.trackList.length; k++) {
+      if (me.gun && (!S || S.farmOk('drone'))) for (let k = 0; k < B.trackList.length; k++) {
         const tr = B.trackList[k]
         if (!tr.npc || !tr.listed || tr.hp <= 0) continue
+        if (S && S.beingShot(tr.id)) continue                             // R1a
         const shootT = tr.hp / Math.max(1, me.gun.damage * me.dmgMult * 0.8) * me.gun.cd + 1
         consider('drone', tr, 2, shootT, P.lootDronePath)
       }
     }
+    if (S) { const s = S.choose(bestV); if (s) best = s }                 // R1a / R1b: steals and kill-drop rushes
     B.loot = best
     if (best && best.type === 'drone') B.farmNpc = best.id
   }
@@ -133,16 +145,23 @@
     const lose = B.losing
     const cubeR = lose ? P.grabCubeLose : me.hpf > P.grabHpf ? P.grabCubeHi : P.grabCubeLo
     let best = null, bestV = 0
+    const S = B.steal
     const tryOne = (type, o, value, maxPath) => {
       if (mover.isAbandoned(o.x, o.y)) return
       const d = pathEst(o.x, o.y)
-      if (d > maxPath) return
+      const di = S ? S.deathItem(o.x, o.y, d) : 0                       // R1b kill drops: first by path time, else leave them
+      if (di < 0) return
+      if (d > (di > 0 ? Math.max(maxPath, P.deathRushR) : maxPath)) return
       if (zoneSlack(B, o.x, o.y, t + d / me.walk + P.zoneArriveSlack) < 3) return
       if (nearDrone(o.x, o.y) || !reachable(o.x, o.y, o.z)) return
-      const v = value / (d / me.walk + 0.5)
-      if (v > bestV) { bestV = v; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o } }
+      let v = value / (d / me.walk + 0.5) * (di > 0 ? 1.5 : 1)
+      if (S && di === 0) { const r = S.race(o.x, o.y, d / me.walk); if (r < 0) return; if (r > 0) v *= P.raceBonus }     // R1d
+      if (v > bestV) { bestV = v; best = { type, id: o.id, x: o.x, y: o.y, z: o.z, obj: o, rush: di > 0 } }
+    }
+    if (cubesWanted()) for (const c of B.cubes.values()) {
+      const kc = isKillCube(c)
+      if (t - c.seen <= (kc && P.stealOn ? P.deathCubeMemS : P.cubeMemS)) tryOne('cube', c, kc ? 1.5 : 1, cubeR)     // R1c
     }
-    if (cubesWanted()) for (const c of B.cubes.values()) if (t - c.seen <= P.cubeMemS) tryOne('cube', c, isKillCube(c) ? 1.5 : 1, cubeR)
     if (!lose) for (const p of B.pickups.values()) {
       if (B.badPickups.has(p.id) && t - B.badPickups.get(p.id) < 30) continue
       if (t - p.seen > 60 || !wantPickup(p.kind)) continue
@@ -164,6 +183,7 @@
       if (dist > (landed ? P.dropLeaveR : P.dropMaxD)) continue
       const path = dist * P.pathFactor, tApp = path / me.walk
       if (!landed && tApp < d.landsIn - P.dropEarlyS) continue                 // too early: no waiting in the ring
+      if (B.steal && !B.steal.dropOk(d, tApp)) continue                        // R1e: occupied ring, capture running, or a mech gets there first
       if (me.hp <= B.A * (tApp + P.dropCaptureS) + P.dropHpBase) continue
       if (zoneSlack(B, d.x, d.y, t + Math.max(tApp, d.landsIn) + P.dropCaptureS + 3) < d.radius) continue
       let contested = false
@@ -185,6 +205,7 @@
     if (t - grabT >= 0.25 || (B.grab && !lootStillThere(B.grab))) { grabT = t; chooseGrab() }
   }
   function lootStillThere(l) {
+    if (l.type === 'steal' || l.type === 'rush') return !!B.steal && B.steal.stillValid(l)
     if (l.type === 'drone') { const tr = B.tracks.get(l.id); return !!tr && tr.hp > 0 }
     const map = l.type === 'cube' ? B.cubes : l.type === 'crate' ? B.crates : B.pickups
     return map.has(l.id)
@@ -193,6 +214,7 @@
   function lootLegs() {
     const me = B.me, l = B.loot
     if (!l) { B.cmd.mx = 0; B.cmd.my = 0; return }
+    if ((l.type === 'steal' || l.type === 'rush') && B.steal) { B.steal.legs(l); return }
     const d = Math.hypot(l.x - me.x, l.y - me.y)
     B.lookHint = true; B.lookX = l.x; B.lookY = l.y
     if (l.type === 'drone') {
@@ -227,6 +249,7 @@
     if (!g) return false
     const d = mover.moveTo(g.x, g.y, 1, g.type === 'pickup' ? 1.2 : 0.6)
     if (d < 1.5) return true
+    if (g.rush && d > 20 && me.energy >= P.boostReserve + 10 && me.grounded) cmd.boost = true      // R1b: rush kill drops
     const tgt = B.target
     if (tgt && strafeW > 0 && d > 6) {
       const bx = tgt.x - me.x, by = tgt.y - me.y, bl = Math.hypot(bx, by) || 1, s = mover.jink.sign
@@ -283,5 +306,5 @@
     out.pick = best
   }
 
-  return { update, lootLegs, dropLegs, grabLegs, hands, pick, wantPickup }
+  return { update, lootLegs, dropLegs, grabLegs, hands, pick, wantPickup, reachable, pathEst }
 }
--- a/lib/tactics.js	2026-11-21 08:14:26.339430052 +0000
+++ b/lib/tactics.js	2026-11-21 08:04:31.438867748 +0000
@@ -58,7 +58,7 @@
       if (d < 120 && tr.conf > 0.3) n120++
       if (!nearestMech && tr.conf > 0.3) nearestMech = tr
       // D0 hostility: damaged us in the last 4 s, or aims within 12 deg of us with a line of fire inside 160 m
-      if (tr.aimAtMe && tr.losIn && d <= P.hostileAimR) tr.hostileAimT = t
+      if (tr.aimAtMe && tr.losIn && d <= P.hostileAimR && !(B.steal && B.steal.aimExplained(tr))) tr.hostileAimT = t   // R1: shooting a crate by us is not aiming at us
       if (tr.charging && tr.losIn && Math.abs(angDiff(wrapPi(tr.bearing + Math.PI), tr.yaw)) < P.laserReactRad) tr.chargeAtMeT = t
       tr.hostile = t - tr.lastDmgInT <= P.hostileDmgS || t - tr.hostileAimT <= P.hostileAimMemS
       if (tr.hostile) anyHostile = true
@@ -146,8 +146,9 @@
       tr.cand = true
     } else {
       tr.finishable = burstDamage(B, tr) >= tr.hp
+      if (B.steal && B.steal.busyWith(tr)) continue            // R1: the non-hostile shooter of the crate we are taking
       const ok = tr.hostile || (!opening && !ffa && tr.dist <= band) || unengaged || (tr === B.target && t - tr.lastDmgOutT < 5) ||
-        (ffa && B.ffaOpen && (tr.finishable || (tr.hp < 0.5 * tr.maxHp && !tr.aimAtMe)))
+        (ffa && B.ffaOpen && (tr.finishable || (tr.hp < 0.5 * tr.maxHp && !tr.aimAtMe))) || (ffa && !!B.steal && B.steal.thirdParty(tr))   // R1b
       if (!ok) continue
     }
     candBuf.push(tr)
@@ -195,6 +196,7 @@
     B.counters.aimVetoes = (B.counters.aimVetoes || 0) + 1
   } else B.vetoT = -1
   if (att && pick && pick.npc) pick = att
+  if (B.scanner) pick = B.scanner.rearPick(pick)              // R2: face a mech that hits our rear
   setTarget(B, pick)
   B.killSecure = !!(pick && pick.secure)
 }
```
