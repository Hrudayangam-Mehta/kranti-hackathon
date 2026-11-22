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
