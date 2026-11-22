# Brain architecture spec (`P/bot/lib/brain.js`)

Written by the team lead. Parameters and thresholds marked `[T]` come from `P/notes/tactics_spec.md`
(expert panel) and `P/notes/intel_synthesis.md` (replay forensics); where those disagree with a default
here, prefer the measured/forensic value and keep every number in one `PARAMS` object at the top of the
file so simulator sweeps can override it (`createBrain(hello, ctx, overrides)`).

## Entry point

```js
export function createBrain(hello, { world, nav, log }, overrides = {}) -> { act(obs, deadlineMs) -> action }
```
`world` / `nav` may be `null` (map failed to load): the brain must still work in a degraded, map-less way
(straight-line movement, no line-of-sight tests). `act` must return within the deadline: check
`performance.now()` before every optional expensive stage (position evaluation, path replan) and skip it
when less than 4 ms remain; keep the previous plan instead. No stage may loop without a hard cap.
`act` never throws (wrap stages in try/catch and fall back to the previous stage's output), never
allocates large arrays per tick, and is deterministic given `hello.seed` (use `makeRng` from `aim.js`).

## Pipeline per tick (10 Hz)

1. **Sense** -> update the world model
   - `me`: pos, vel, aim, hp/max_hp, energy, grounded, cubes, weapons (kind, cooldown, ammo, reload, charge,
     stats), stats (speeds, turn rate, radius/height/eye/muzzle after cubes: read `self.stats` first, else
     scale defaults by `1 + size_per_cube * cubes`).
   - `tracks` (Map id -> track) for mechs and NPC drones from `obs.mechs`: pos, vel (as given), smoothed
     velocity, lateral reversal counter, aim, hp, max_hp, cubes, weapons, charging, lastSeenT, and
     per-track rolling stats: damage they dealt to me in the last 3 s (`events.damaged.by`), damage I dealt
     to them, whether their aim points at me (|bearing - aim yaw| < 12 deg). Entries listed in `obs.mechs`
     are true current positions (the server keeps 5 s of memory); older tracks dead-reckon for 2 s then
     stay at the last known point with decaying confidence and are dropped after 12 s.
   - object memory: crates, cubes, pickups (remember position; forget when we are within 40 m with
     `world.canSee` and it is no longer listed, or after 120 s), supply drops, zone, offer.
   - incoming projectiles: for each `obs.projectiles` item compute closest approach to my centre (gun/npc)
     or the predicted impact point (mortar, with `shellImpact` and `world.ground`).
   - sound hints: last few bearings by kind, used only to choose where to look when nothing is visible.
2. **Assess**: for each live mech track compute distance, `losOut` (my muzzle -> their centre,
   `world.shotClear`), `losIn` (their muzzle -> my centre or head), estimated dps they can put on me now
   and dps I can put on them (weapon ranges, cooldown cycles, hit probability by range `[T]`), time to kill
   each way. Aggregate: `threats` (losIn and (aiming at me or damaged me within 3 s or within 60 m)),
   `incomingDps`, `ttkMe`.
3. **Decide mode** (priority order with hysteresis: a mode must hold at least 0.6 s unless ZONE/DODGE
   pre-empts):
   - `DODGE` overlay (not a mode): mortar impact predicted within splash radius + 3 m in < 2.5 s -> move
     directly away from the impact point with boost. Laser charging at me -> prefer a hide cell if one is
     reachable within the remaining charge time.
   - `ZONE`: `timeUntilOutside(me.pos) - (pathTime to the safe point + margin [T]) < 0`, or `!in_zone`.
     Movement goal = nearest safe cell inside the NEXT circle (radius factor 0.8 [T]). Keep shooting.
   - `HEAL`: hp fraction below `[T]` (default 0.40), or losing the exchange (`ttkMe < 0.8 * ttkTarget`) with
     hp below 0.7 -> go to the best hide cell (no losIn from any threat), stop firing so the 5 s regen timer
     runs, leave when hp > 0.8 max or an enemy gains losIn within 40 m (then fight or flee again).
   - `FIGHT`: a target is selected (below) -> position evaluation with fight weights; peek/hide cycle when
     cover exists; strafe-jink in the open.
   - `LOOT`: no threat -> best loot task (weapon pickup, crate, cube, supply drop, drone) by value / time.
   - `HOLD`: nothing to do -> stand at a good cell inside the next circle near cover and scan.
4. **Tactical position evaluation** (shared by FIGHT / HEAL / HOLD / kiting). At most every 0.3 s (or when
   the mode/target changes), sample candidate cells around the mech: the current cell plus 3 rings
   (8, 16, 28 m) x 16 directions, plus for retreats 2 far rings (45, 70 m) x 12 directions. Discard
   impassable cells and cells in another nav component. Score each candidate:
   ```
   score = wLos * losToTarget(c)                 (wanted in FIGHT while a weapon is ready, unwanted in HEAL)
         - wExp * sum_over_threats(losFromThreat(c) * threatDps)
         + wCover * hasHideNeighbour(c)          (a cell within 5 m with no LOS to the target)
         - wRange * |dist(c, target) - preferredRange| / preferredRange
         - wZone * zonePenalty(c)                (outside next circle at arrival time: very large)
         - wMove * pathDist(me, c)               (straight distance x 1.3 if walkLine fails)
         - wDrone * droneAggro(c) - wEdge * (wallDist(c) < 3)
         + wStick * (c == current goal)
   ```
   Raycasts use eye/muzzle heights (my muzzle -> target centre for losToTarget; threat muzzle -> candidate
   centre AND candidate head for exposure). Budget: <= 400 raycasts per evaluation; time-slice across ticks
   if the deadline is near. Output: `goalCell`, plus `hideCell` and `peekCell` (adjacent pair) when found.
5. **Peek / hide cycle** (FIGHT with cover): HIDE while no weapon can fire within 0.4 s (gun reloading,
   laser cooling) or while charging the laser below `full - 0.15 s`; PEEK otherwise. Without cover: strafe
   perpendicular to the target bearing with random reversal intervals `[T]` (default U(0.35, 0.9) s, shorter
   at long range), flipped early if `nav.walkLine` fails 4 m ahead, combined with a radial component that
   holds the preferred range band `[T]` for the weapon matchup.
6. **Movement execution**: `moveTo(goal)` uses `nav.findPath` (cache; replan every 0.5 s, when the goal moves
   more than 4 m, or when stuck), follows the farthest waypoint with `nav.walkLine` from the current
   position, outputs `move`; `boost` when fleeing, in ZONE urgency, dodging, or crossing open ground under
   fire and energy > 25 `[T]`. Stuck detection: commanded but speed < 1.5 m/s for 0.6 s -> jump + sidestep
   0.4 s + replan; after 2 s -> jet for up to 1 s; after 4 s -> abandon the goal for 10 s.
7. **Aim and fire** (torso is independent of the legs; one aim direction serves all weapons):
   - aim target: fight target (lead solution) > loot target being shot (crate/drone) > last known position
     of a recently lost target (pre-aim the corner) > scan (rotate ~1.6 rad/s, biased to recent sounds and
     to the direction of the nearest known enemy). Always turn the torso toward the main damage source:
     never show the back to a threat (rear hits are x1.5).
   - gun: `intercept()` with muzzle point (z + muzzle_height), offset radius + 0.5, target centre
     (z + 0.5 * target height), smoothed target velocity (scale lateral lead down by `[T]` when the target
     reversed direction at least twice in the last 2 s). Fire when the gun is ready, `world.shotClear` to
     the lead point, distance < 0.95 * range and `onTarget(self.aim, solution, k)`. Reload early when
     ammo <= 3 and no target has been visible for 0.5 s, or when hiding.
   - laser: start holding the trigger when a target is visible (or about to be: peek transition) within
     0.93 * range and cooldown == 0; aim directly at centre + velocity * 0.1 s; release (stop holding) when
     charge >= full and on target (k = 0.6) with a clear shot; if still not on target 1.6 s after full,
     release anyway. Do not start charging when ZONE/DODGE needs full speed.
   - lightning: fire when a mech (or a drone/crate being farmed) is within 0.92 * range and within half the
     cone minus 3 deg of the torso yaw, energy >= 3 * shots reserve `[T]`.
   - mortar: only when the gun cannot fire (reloading) or the target has no line of fire but a known
     position; `mortarSolve` low arc; never when the impact point is within splash radius + 5 m of me.
8. **Misc actions**: `take` the best pickup within reach (weapon ranking `[T]`, with `drop` of the worst slot
   when full; never swap out the gun unless both other weapons are better `[T]`), `pick` the upgrade by the
   strict priority list `[T]` (answer in the same tick the offer appears), `jump` only for stuck recovery.
9. **Output**: `{ move, boost, jump, aim, fire, reload, pick, take, drop }` (+ small `debug.label` with the
   mode, target id and hp when `PARAMS.debug` is true; default false in the shipped build).

## Target selection

`score(E) = dpsOnThem / hp_E  +  wThreat * dpsOnMe(E) / myHp  +  wFinish * (hp_E < 350)  -  wFar * max(0, dist - effRange) / effRange`
with a 20% stickiness bonus for the current target, requiring `losOut` or seen within 1 s. Drones are
targets only when they have damaged us recently or the LOOT task is farming them.

## Testing hooks

`createBrain` exposes `brain.debugState()` (mode, target, goal, counters) for the simulator logs. Unit tests
in `P/tools/test_brain.js` replay `P/kit/check/stream.jsonl.gz` through the brain (no exceptions, valid
actions, mean/max decision time) and run scripted scenarios in the simulator.
