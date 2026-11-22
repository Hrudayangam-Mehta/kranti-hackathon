# Panel R6: I/O and timing (owner: "read the guidelines and inputs and understand how to use the delay and outputs better")

Written Sat 21 Nov, late evening UTC. Scope: when an action takes effect, how every output field behaves, which input fields we
ignore, and a timing audit of V4 (`variants/V4/bot`, read only). Nothing under `bot/`, `sim/`, `variants/` was edited; `intel/`
was not opened. A patched copy of V4 with the switches below lives in `tools/panel_r6/v4io/bot` (diff:
`tools/panel_r6/io_patch.diff`). With its default `io: 'v4'` it plays exactly like V4: 300 of 300 kit-stream actions are
identical (`tools/panel_r6/identity.mjs`).

Evidence tags: **[P]** protocol.md / schema, **[C]** hello config, **[S]** kit stream (current build), **[R]** replay mech16 (older
balance, same server loop), **[K]** check.py, **[M]** our simulator (lockstep and tick order written from [P]/[R]; trusted for
timing, not for doctrine), **[A]** arithmetic.

---

## 0. Bottom line

V4 already gets the big timing levers right. Its gun fires every 5 ticks (0.25 s) instead of the house bots' 6 (0.30 s)
because it holds the trigger while the cooldown read-out is <= 0.10. Its laser cycle is the 48-tick minimum (2.40 s). It
predicts its own torso slew and leg motion for the tick the gun shot leaves. Its backlog handling and action sanitiser are
correct, and its answer time is far from the limit (gate: 0 late of 3939, p99 < 15 ms under the 1-CPU quota).

What remains is a set of small, safe corrections. None of them is worth a submission of its own: the whole package is about
+0.02 (-0.03 .. +0.06), against a noise sd of 0.24. **Recommendation: carry `io: 'all'` (IO1-IO4) as a ride-along in the next
code build, and add the free probes (section 7).** One movement idea (IO12, strafe reversals timed to the shooter's next shot)
was prototyped and tested in the simulator. It did nothing, so it is dropped.

| Rank | ID | Preset (old -> new) | What | Expected gain | Evidence | Test |
|---|---|---|---|---|---|---|
| 1 | PR2 | `probePrecharge: off -> on` | one-decision probe: does a laser charge build during the cooldown? If yes, pre-charge (cycle 2.40 -> ~1.75 s) | EV +0.02 (90%: 0; 10%: about +0.2) | [P] silent on it; [A] | T-PR2 |
| 2 | IO4 | `io: v4 -> reload` (in `all`) | hold the gun trigger when the reload ends inside this decision | +0.01 | [S] read-outs; [M] post-reload gap 2.476 -> 2.416 s (n=118/120) | T-IO4 |
| 3 | IO6 | `laserDump: off -> aim` | a forced laser release (force timer, `noCharge`, target lost) goes to the best clear thing in view | +0.01 | [M] 5-8% of our beams hit nothing | T-IO6 |
| 4 | IO11 | `beamEta: off -> on` | enemy beam ETA from the age of the `laser_charge` sound or charge flag: hide only if cover is reachable by then, else turn the shooter into the front arc | +0.01 | [S] house beam 15 ticks after the obs that first shows the charge; [M] 283 laser hp taken/match | T-IO11 |
| 5 | IO1 | `io: v4 -> lead` (in `all`) | gun lead counted half a tick earlier (a bullet sweeps 12.6 m on its spawn tick) | +0.005 | [S] 27.7-27.8 m at first sight; T-IO1 PASS | T-IO1 |
| 6 | IO2 | `io: v4 -> laser` (in `all`) | the laser beam leaves 0.05 s after the release decision, not 0.10 s: one tick of lead and one tick (0.2 rad) of slew in the release gate | +0.005 | [S] every beam has age 0.1 | T-IO2 |
| 7 | IO10 | `npcDodge: off -> on` | dodge drone bullets (90 m/s) too | +0.005 | [M] 80 hp/match from drones, 52% of it rear | T-IO10 |
| 8 | IO5 | `laserEarly: off -> on` (after PR3) | on a charge that started on an odd tick, release at read-out 0.70 (beam 0.1 s earlier) | +0.003 | [S] house odd-start beam 2 ticks after full | T-IO5 |
| 9 | IO9 | `takeEarly: off -> on` | send `take` one decision early when the pickup goes into an empty slot | ~0 (wins tie races) | [P] closer mech wins same-tick takes | T-IO9 |
| 10 | IO3 | `io: v4 -> all` | mortar and lightning gates use the tick the shot really leaves on | 0 in practice (mortar about 0.3 shells/match even under K0); FFA only | [M] | T-IO3 |
| - | IO0 | always on | timing constants from `hello.config` (tick, decision period) instead of literals | insurance (balance may change, [P] section 6) | [P] | T-IO0 |
| - | IO7 | always on | an exception during a laser charge keeps the trigger held | insurance | code | T-IO7 |
| - | IO8 | always on | merge the `events`, `sounds`, `beams` of skipped observations into the one we answer | insurance (a lost `kill` can count toward the FFA latch) | [P] "since your last observation" | T-IO8 |
| - | IO13 | always on | exact regen clock and time-to-full (feeds the owner's "heal to full" request) | enabler | [S][R] | T-IO13 |
| x | IO12 | dropped | strafe reversal on the decision before the shooter's predicted shot | none measured | [M] prototype: 45-110 m hit rate 0.33 -> 0.34 | - |

Conversion used for "gain" [A]: +1% of our damage dealt, or -1% of damage taken, is worth about +0.015-0.02 practice points
at a mean of about 5. The gun deals about 70% of our damage in the simulator (4.5k of 6.4k per match) and the laser about 25%.

---

## 1. The timing model (exact)

```
decision N (obs tick N, even)           ticks N+1 and N+2 simulated with our answer          decision N+2
obs N sent -> our answer (<= 50 ms) -> | tick N+1: slew, legs, one-shots, weapons, projectiles | tick N+2: same minus one-shots | obs N+2
```

1. **Lockstep, zero sim-time latency** [P section 2]. Obs N is the state at the end of tick N. If our answer arrives within
   50 ms of wall time, it is applied before tick N+1, so its first effect is already in tick N+1 and first visible in obs N+2.
   Answering early never costs anything [P].
2. **Order inside a tick** (what the evidence pins down):
   - **The torso slews before the shot leaves.** [R] For shots taken while the torso was still turning (|aim(N+2)-aim(N)| 0.02-0.08
     rad, n = 341), the bullet carried a median 1.05 / 0.97 of that turn. With the shot first and the slew after it, the value
     would be 0 (`tools/panel_r6/slew_order.py`). So the shot leaves along `self.aim` slewed by at most `turn_rate * tick`
     = 0.20 rad (yaw) and `pitch_rate * tick` = 0.15 rad (pitch) per tick.
   - **The cooldown counts down before the trigger is checked.** [S] After a shot on tick N+1 the read-outs are 0.19, 0.09,
     0: a gun held at the 0.09 read-out fires on tick N+2 of that decision (5-tick cadence).
   - **A bullet moves a full tick on its spawn tick.** [S] The first sighting of each enemy bullet is 27.7-27.8 m from its
     shooter's axis, which is 3 + 2 x 12.6 m (two ticks of travel) less the shooter's own motion
     (`tools/panel_r6/age_tick.py`). Mechs move before projectiles inside a tick ([M] order, consistent with the [R] aim fit).
     Effective result: the bullet behaves as if it left 3 m out at the *start* of its fire tick, and it is swept against
     the target's end-of-tick position.
   - **`age` 0.1 means tick N+1 and `age` 0.05 means tick N+2** of the decision that just ended. [S] Bullets 27.7 m out
     arrive with `gun` sounds of age 0.1, and every laser beam (5 of 5) arrives with age 0.1, which is the release on the
     tick after the obs. Event tick = `obs.tick - round(age / tick) + 1`.
3. **When each of our actions takes effect.**
   - Gun: tick N+1 if the read-out is <= 0.05, tick N+2 if <= 0.10, else not in this decision. The bullet effectively
     starts at the beginning of that tick (lead from `T_N + k*tick - tick/2`, section 4 A1).
   - Laser: the charge starts on the first held tick whose cooldown has run out. A release (the trigger not held in the new
     decision) fires on tick N+1, so the beam lead and slew are one tick (0.05 s), not two.
   - Mortar and lightning: the same rule as the gun (first tick the cooldown allows).
   - Legs: the new command accelerates from tick N+1 (ground 58.5 m/s², semi-implicit: velocity first, then position; [R]
     0.34 m = 3·a·dt² after one decision from rest).
   - One-shots (`jump`, `reload`, `pick`, `take`, `drop`) act on tick N+1 only.
4. **Late, missing or crashed answers** [P section 2][K].
   - A late answer is dropped completely. Answers to older ticks are dropped too.
   - The mech coasts: `move`, `boost` and `aim` of the last applied action are kept; `fire`, `jump`, `reload`, `pick`,
     `take` and `drop` are dropped.
   - **A missed decision while the laser charges is a release**: the beam fires on the next tick at the charge it has,
     along the still-slewing torso, and the 1.65 s cooldown starts. A charge can never be cancelled. Releasing below
     `min_charge` fires the beam as soon as 0.15 s is in, and a full charge auto-fires after `hold_s` (2 s).
   - After `coast_s` (1.0 s) of misses the mech idles (no movement, aim held). A crashed process idles for the rest of the
     match.
5. **Backlog** [P][K]: when several obs are queued, answer only the newest (V4 does this). The skipped obs carry their own
   `events`, `sounds` and `beams` ("since your last observation"); dropping them loses those (IO8).
6. **Our margins**: gate R10b had 0 late of 3939 decisions (p99 4-6 ms, max about 10 ms) under the 1-CPU quota. In the
   simulator (in-process, 4 jobs, shared machine) the worst decision reached 43 ms, and one run with a loaded machine logged
   52 lates in 16 matches. On the official machine lateness is not observable to us (stderr is hidden). Keep the 30 ms fuse.

---

## 2. Output fields: exact behaviour

| Field | Kind | Behaviour (numbers from [C]) | Pitfalls / how to use it |
|---|---|---|---|
| `tick` | required | must equal the obs tick; anything else is dropped | V4 echoes from the obs (sanitiser) |
| `move` | continuous (kept on coast) | world-frame direction, length clamped to 1, less = slower; **omitted = [0,0] = stop** | stick <= 0.42 (4.9 m/s) is silent (`step_speed` 5); 0 -> walk 11.7 in 0.20 s, reversal 0.40 s, boost reversal 0.67 s |
| `boost` | continuous | ground + moving: 19.5 m/s, 17 energy/s; airborne: jet +34 m/s² (rise cap 10), 15/s | any spending tick restarts the 0.6 s energy-regen delay: spend in blocks, not pulses; never `boost` when knocked airborne unless a jet is wanted |
| `jump` | one-shot (tick N+1) | needs `grounded` on that tick; 11 m/s | dropped on coast |
| `aim` | continuous; **omitted = previous command** | torso slews 0.20 rad (yaw) / 0.15 rad (pitch) per tick, shortest way; pitch clamped to [-0.70, 1.30]; **vision follows the torso** (120° wedge) | compute every shot's aim for its own leave tick: gun k = 1 or 2, beam k = 1, shell k = 1 or 2 |
| `fire[i]` | held for both ticks; dropped on coast | gun: fires on every tick the cooldown, ammo and reload allow (0.24 s, so one shot per decision at most); mortar the same; lightning the same (3 energy, fires even with no target); laser: held = charge (half speed while charging), release = beam on the next tick, < 0.15 s forces a 0.15 s beam, full + 2 s auto-fires | firing an empty or reloading slot does nothing, so holding early is free; **a laser charge always ends in a beam**; dual fire (gun during a laser charge) is allowed by the text and the simulator, never done by house bots, done by V4 |
| `reload` | one-shot | starts a reload (2.4 s) if not already reloading; ammo 0 starts it automatically on the 12th shot's tick | holding `fire` during the last 0.10 s of a reload fires on the tick it ends (IO4) |
| `pick` | one-shot | index into the current `offer.choices`; timeout 5 s -> choice 0 | the offer seen at N+2 is the next queued one; V4 re-reads it every obs (correct) |
| `take` (+`drop`) | one-shot | pickup within 4 m horizontal, 4 m vertical, on tick N+1; same tick: closer mech wins; taken weapon locked `max(equip_s 1 s, its cooldown)` (gun / lightning 1 s, laser 1.65 s, mortar 2.6 s); no swap of a charging laser (`busy`) | `take_failed: range` is harmless, so an empty-slot take can be sent one decision early (IO9); a swap (`drop`) only when certainly in range |
| `debug` | none | never affects the match; nothing on the track shows it | keep off (V4 `debug: false`) |

---

## 3. Observation fields: what V4 reads and what it ignores

Used well: `self.*` (aim is the actual torso, weapons' `cooldown` / `ammo` / `reload` / `charge` / `stats`, `stats.*`),
`mechs[]` (live position, velocity, aim, hp, charging, weapons and cubes, including the 5 s memory), `projectiles` (bullets for
the dodge, shells for impact), `crates` / `cubes` / `pickups`, `drops`, `zone`, `offer`, `alive`, the events `damaged`
(with `rear`), `hit`, `kill`, `took` and `take_failed`.

Ignored or under-used, with the use each could have:

| Field | Now | Use |
|---|---|---|
| `sounds[].age` | ignored (sector accumulator only) | exact tick of an unseen shot or laser start: enemy beam ETA (IO11); the cadence of an unseen shooter |
| `beams[].age`, `by` | FFA bookkeeping only | that shooter's laser is dead until beam tick + 33 ticks (1.65 s); a house laser fires again no sooner than 2.4 s later: the safe re-exposure window, usable in SQUAD too |
| `events: effect` (`short`, `concuss`, `cookoff`) | ignored | `short`: our laser cannot charge for 2 s, so drop laser-band legs and fight with the gun; `concuss`: we are airborne and 45 energy down, so do not jet by accident; `cookoff`: we carry a mortar near a laser, so drop the mortar |
| `events: dropped`, `upgrade` | ignored | bookkeeping only (stats are re-read every obs) |
| `hit.amount` | summed only | self-calibration: the released charge fraction (PR3), whether the server allows dual fire (gun hits during a charge) |
| `hit.rear`, `hit.effect` | ignored | confirms rear hits we dealt (1.5x) for the target choice |
| `projectiles` of kind `npc` | skipped by the dodge | drone bullets are slow (90 m/s) and dodgeable beyond 30 m (IO10) |
| `self.stats.near_range_bonus`, `vision_bonus`, `hearing`; `config.vision.*`, `sound.bearing_noise_deg` | not read (constants) | only matters after a `sensors` pick or a balance change (IO0) |
| `config.mech.front_arc_deg` | literal pi/2 in `tactics.js` | read it (IO0) |
| `config.match.tick_hz`, `decide_every` | literals 0.05 / 0.10 / 0.11 | IO0 |

---

## 4. V4 timing audit (file:line refer to `variants/V4/bot/lib`)

Correct as built (no change): gun hold at read-out <= 0.10 (`params.readyCd`), so the shot leaves on tick N+2 with lead and
slew computed for 0.10 s (`firecontrol.js:53 gunLatency`, `:183`, `:300`). Gun gate on the torso's predicted actual aim
(`predYaw` / `predPitch`, `:103`). Own-position prediction for the shot origin with ground acceleration (`:19`). Laser hold
from cooldown <= 0.11, so the steady cycle is 33 + 15 = 48 ticks, the minimum. Laser torso hand-over from 80% charge.
Lightning hold at cooldown <= 0.15 (fires on the ready tick). Bullet dodge integrates our acceleration from tick N+1
(`mover.js:161`). Backlog collapse and sanitiser (`bot.js:158`).

- **A1, gun over-lead by half a tick (IO1).** `gunSolve` (`firecontrol.js:71`) leads the target from `T_N + tl` and solves
  `|T + V t - M| = 252 t + 3`, as if the bullet were 3 m out at the end of its fire tick. It is already 15.6 m out then
  [S]. Under the server's per-tick sweep the unbiased lead is from `T_N + tl - tick/2` (`tools/panel_r6/test_io1_lead.mjs`:
  V4's mean error is +0.21..+0.50 m ahead of the axis for 6-19.5 m/s crossers at 60-200 m, half-tick 0.00 ± 0.05, the full
  tick -0.20..-0.50; the half-tick choice is the minimax if the server sweeps continuously instead). Effect [A,
  `lead_bias.py`]: +0.2..+0.7 hit points at 90 m, +1.9 at 130-180 m against walkers, +5 against boosters; +0.3 points on
  our shot mix.
- **A2, laser latency 0.10 instead of 0.05 (IO2).** `P.latency` (0.10) drives the beam lead (`:238-240`), the muzzle
  check and the release gate `predYaw(cy, tl)` (`:261`). The gate believes 0.4 rad of slew is still available when only
  0.2 rad is. Errors of 0.05·v in lead (0.6 m at walk, 1.0 m at boost) plus our own 0.05·v (0.3 m while charging); a
  release can be wrong by up to 0.2 rad when the torso is 0.2-0.4 rad off (FFA off-axis charging, rule 2, sits exactly at
  0.4 rad). Fix: `tlz = tick` for the beam's lead, shot origin and gate.
- **A3, mortar and lightning gates use 0.10 (IO3).** The mortar fires if the torso is within 0.02 rad after 0.10 s
  (`:293`), but the shell leaves on tick N+1 at cooldown <= 0.05. After a gun-to-mortar hand-over it can leave up to
  0.22 rad off in yaw and 0.17 rad in pitch, which is a range error of about 470·cos(2θ)·Δθ ≈ 40-70 m: a wasted shell. The
  lightning cone test (`:338`) has the same 0.10. Use `gunLatency(cooldown)` for both.
- **A4, the reload's end is missed by 1-2 ticks (IO4).** `gunReady` requires `g.reload <= 0` (`:220`). The last read-out
  of a reload is 0.05 or 0.10 [S: 0.15, 0.05, then ammo 12], so V4 first shoots 1-2 ticks after the magazine is back.
  Hold when `0 < reload <= readyCd`, with latency `gunLatency(max(cooldown, reload))`. [M] Gap from the 12th shot to the
  next: 2.45-2.50 s (V4) -> 2.40 s (fix) in 113 of 120 reloads, so sustained gun damage is about +1.2% in fights longer
  than one magazine.
- **A5, forced laser releases go anywhere (IO6).** Charges end in a beam no matter what. V4 forces it at 1.5 s after full
  (`:269`), on `noCharge` (`:270`, shell dodge / hop / zone), and on target loss (`:317`). In the target-loss case the
  beam leaves along the scan or the wall aim. [M] 4-8% of our beams hit nothing. On a forced release, aim at, in order:
  a listed mech with a clear line within range; a crate in view with a clear line (315 >= 300: a cube); a drone only if
  we are not healing. Else keep the aim.
- **A6, first beams of an engagement lose 1 tick (IO5).** A charge started on tick N+1 (laser idle when the target
  appears) is full on tick N+15. The obs after that (N+16) is the first to show 0.75, so the beam leaves on N+17. The
  house bots show the same: flag first seen at obs 142, beam on tick 157 [S]. If the release tick adds its own charge (the
  simulator assumes it does; [P] is silent), a release at read-out 0.70 gives a full beam on N+15. Self-verify with PR3
  first. Steady-state cycles already start on even ticks, and the rule never fires there (read-outs 0.05, 0.15, ..., 0.65,
  0.75).
- **A7, an exception during a charge releases the laser (IO7).** `act()`'s catch and the `fire` stage fallback return
  `fire: [false, false]` (`brain.js:594`, `:601`). Keep `fire[laser] = lastAct.fire[laser]` while `charge > 0` and the
  charge is not full.
- **A8, hard-coded timing (IO0).** `tickS 0.05`, `latency 0.10`, `readyCd 0.10`, laser `0.11`, lightning `+0.05`,
  `mover.js:162 dt = 0.05`, `senses.js:66 me.dt = 0.1`, `tactics.js:8 HALF_PI` (front arc), `magSize 12` / `magReloadS 2.5`
  (enemy magazine model). Derive them from `config.match.tick_hz`, `decide_every`, `mech.front_arc_deg`,
  `weapons.gun.mag` / `reload` at hello. [P] says balance changes between matches.
- **A9, skipped obs lose events (IO8).** `bot.js:168` keeps only the newest obs. Concatenate the skipped obs'
  `events` / `sounds` / `beams` into it (sound ages +0.1 per skipped decision). A lost `kill` makes our own kill a
  "foreign death" (`stance.js:36`) toward the FFA latch (3).
- **A10, take latency (IO9).** `economy.hands` takes at <= 3.6 m now (`economy.js:320`); the take acts on tick N+1. For
  empty-slot takes, also send it when the distance predicted for tick N+1 (our velocity x 0.05) is <= 3.8 m. This saves
  up to 0.1 s per take, which is what decides same-tick races.
- **A11, drone bullets are not dodged (IO10).** `mover.js:199` skips `npc` bullets. At 90 m/s from 30-45 m a 2.5 m
  sidestep is reachable (0.33-0.50 s flight; our sidestep takes about 0.41 s from rest).
- **A12, enemy laser timing ignores the ages (IO11).** D4 hides for 0.9 s after any decision with a charge aimed at us
  (`brain.js:409`), with a fixed reach of 6 / 9 m. A house beam leaves exactly 15 ticks (0.75 s) after the obs that first
  shows the charge, or the `laser_charge` sound of age 0.1 / 0.05 [S: 142 -> 157, 370 -> 385]. With Fast capacitors it is
  0.56 s. Hide only if the hide cell is reachable by ETA - 0.05 s; otherwise keep firing and, if the torso turn fits in the
  time left (4 rad/s), put the shooter inside the front arc for the ETA tick (472 -> 315 damage). After its beam, that
  shooter cannot fire again for 2.4 s (house): re-expose then.

---

## 5. Presets and tests (build-ready)

Reference implementation for IO1-IO4: `tools/panel_r6/v4io/bot/lib/{params,firecontrol}.js`, preset
`io: { v4, lead, laser, reload, sync, all }` (`all` = IO1+IO2+IO3+IO4; `sync` is the dropped IO12). With `io: 'v4'` the copy
reproduces V4 on 300/300 kit-stream decisions. Simulator smoke tests (16-32 seeds per arm): no errors, no stuck runs, score and
damage within noise (A 3.75 / B 4.06 / C 3.50-4.31 / D 3.78, se 0.4-0.7).

| Test | Setup | Pass |
|---|---|---|
| T-IO1 | `tools/panel_r6/test_io1_lead.mjs`: tick-exact kinematics (target moves, bullet spawned 3 m out, 12.6 m per tick including the spawn tick), shooter still, k = 1 and 2, R 60-200 m, v 6 / 11.7 / 19.5 m/s, 24 sub-tick phases | half-tick lead has mean error <= 0.15·tick·v and a smaller worst case than V4 in all 24 cells (**PASS**) |
| T-IO2 | brain on a synthetic obs: target at 150 m crossing at 11.7 m/s, laser charge 0.75, torso 0.30 rad off the solution | V4 releases (it thinks 0.40 rad of slew is left); IO2 holds one more decision and releases with \|torso error after 1 tick\| <= gate; beam aim point = position + v·0.05 |
| T-IO3 | mortar target 120 m, cooldown 0, torso pitch 0.25 rad below the solution | V4 fires; IO3 holds until \|pitch error after 1 tick\| < 0.02 (2 decisions), then fires |
| T-IO4 | gun read-outs `reload` 0.05 / 0.10 / 0.15, ammo 0, cooldown 0, target in the gate | `fire[0]` true at 0.05 (latency 0.05) and 0.10 (latency 0.10), false at 0.15; in the simulator the gap from the 12th shot to the next is 2.40 s in >= 90% of reloads (**measured 113/120**) |
| T-IO5 | after PR3 = "adds": charge read-outs 0.10 ... 0.70 (odd start) | release at 0.70; even start (0.65 -> 0.75): unchanged; PR3 = "does not add": never |
| T-IO6 | target goes behind a wall during a charge; a crate in view at 60 m with a clear line; force timer expires | the release decision aims at the crate (within the 0.2 rad tick slew) and the crate breaks; no crate and no mech: aim unchanged |
| T-IO7 | throw inside `fc.run()` while charge 0.40 | the action keeps `fire[laser] = true` and the previous aim |
| T-IO0 | hello with `tick_hz` 30, `decide_every` 3 | tick 1/30, decision 0.1, readyCd 0.1, gun latency in 1/30 steps, front arc from config; all other tests still pass |
| T-IO8 | backlog of 3 obs, the oldest with `kill` and `damaged` events | after the answer, `ourKills` holds the target and the damage is in `dmgIn` |
| T-IO9 | empty slot, laser pickup 4.3 m ahead, closing at 11.7 m/s | `take` sent this decision (predicted 3.7 m); with a swap needed, not sent until <= 3.6 m |
| T-IO10 | one drone bullet 40 m out heading at us, farming, no mech bullets | `bulletDodge` acts on it; predicted miss >= radius + 1.2 m |
| T-IO11 | `laser_charge` sound age 0.1 at obs tick 1000 on our bearing; hide cell 14 m away (walk 1.4 s) | ETA = tick 1015; no hide run (unreachable); the torso turns so the bearing is inside +-90° by tick 1015 when that needs <= 0.7 s of turning |
| T-IO13 | damaged at t 10.0, our hit on a mech at 12.0, hp 700/1400 | `regenAt` = 17.0, `fullAt` = 17.0 + 700/45 = 32.6; a crate hit at 18 that does not stop the hp rise sets `crateResetsRegen` false for the match (and true if it does) |

---

## 6. Every delay in the game, and the time price of each action (input for the reward table)

| Delay [C] | Value | Use |
|---|---|---|
| decision | 0.1 s (2 ticks of 0.05) | the action unit |
| torso slew | 0.20 rad yaw / 0.15 rad pitch per tick (gyros x1.3) | 180° turn 0.79 s; front arc ±90° |
| gun | 0.24 s cooldown (5-tick cadence when held), 12 rounds, reload 2.4 s | hold early (V4); reload edge (IO4) |
| laser | charge 0.75 s, cooldown 1.65 s, cycle 2.40 s, auto-fire after full + 2 s, min 0.15 s | no cancel; equip lock 1.65 s, so the first beam comes >= 2.45 s after a take |
| mortar / lightning | 2.6 s / 0.25 s (3 energy) | |
| equip | max(1 s, cooldown) | |
| hp regen | 45/s after 5 s with no damage dealt (mechs, drones; crates unknown on this build) or taken (zone included); none outside the zone | time to full = 5 + deficit/45 (50% -> 20.6 s, 70% -> 14.3 s; nanites: 3.5 + deficit/72) |
| energy regen | 18/s after 0.6 s without spending | spend in blocks |
| enemy memory | 5 s of live state after the last real sighting | breaking contact costs > 5 s behind solid cover |
| coast / idle | 1.0 s | |
| offer | 5 s, then choice 0 | |
| supply drop | called 70 / 140 / 210 s, lands 25 s later, 4 s alone in an 8 m ring | |
| short (lightning) | 2 s without a laser charge | |
| sound | step every 0.6 s above 5 m/s; `laser_charge` once at the start | |

Time prices [A], at 100% accuracy unless stated, no cubes:

| Action | Time | Reward |
|---|---|---|
| crate | gun 7 hits = 1.5 s (6 x 0.25); laser 1 beam = 0.8 s | 1 cube (+56 hp, +4% damage), 50% a weapon |
| drone | gun 8 hits = 1.75 s, taking about 2 x 25 x 0.66 | 2 cubes |
| laser pickup | walk + 2.45 s to the first beam | laser (25% of our damage) |
| kill, gun only (1400 hp) | 32 hits: 12.2 s with 2 reloads; at 70% hits 18.6 s | the victim's cubes + 2 |
| kill, gun + laser | about 5.4 s at 70% gun hits with dual fire, 6.4 s without | same |
| kill, laser only | 5 beams = 10.4 s | same |
| heal to full | 5 s + deficit/45 (from 50%: 20.6 s) | the hp |
| supply drop | travel + 4 s alone | 3 cubes, full hp and energy |

---

## 7. Free probes (self-verifying; each decides once per match and logs nothing to stdout)

- **PR1 dual fire.** V4 already fires the gun during laser charges. Record whether `ammo` falls during a charge; nothing to
  change either way.
- **PR2 pre-charge.** Once per match, with the laser held, its cooldown in [0.5, 1.2] s and no listed mech within laser
  range with a line, hold the laser trigger for one decision, then read `charge`. If it is 0, never again (V4 behaviour,
  cost nil: no charge means no slow-down and no sound). If it is > 0, the charge builds during the cooldown: hold from
  cooldown <= 0.75 + 0.05 whenever a target is expected, so the beam leaves as the cooldown ends (cycle about 1.75 s,
  +37% laser DPS). Low prior: the strongest public laser bots show 2.4 s beam intervals.
- **PR3 release-tick charge.** On the first engagement-opening release (odd start), release at read-out 0.70 once. Compare
  the `hit.amount` with 315 x cube mult x rear x cook-off: a ratio near 1.00 means the release tick adds its charge (enable
  IO5); near 0.957 means it does not (disable it). Ratios near 0.92 / 0.85 are target armour: retry.
- **PR4 crate regen.** During regeneration, after one of our `hit` events on a crate id (1000-4999): if hp keeps rising on
  the next obs, crate hits do not reset regen on this build. Set `crateResetsRegen` from it (feeds HEAL farming).

---

## 8. Tested and dropped: IO12, strafe reversals locked to the shooter's next shot

Idea: house bots fire on a fixed 6-tick cadence, and their lead uses our velocity at their obs. A strafe reversal ordered on
the decision whose window holds their next shot should maximise their lead error (about ½·58.5·(τ+0.05)² m: 5.5 m at
100 m against 3.3 m for a reaction one decision late). Prototype: the shot time from each bullet's first sighting (distance
out), the cadence from consecutive shots, and a due reversal moved by at most -0.25 / +0.2 s (`ioJinkSync`).
Simulator, 32 seeds per arm:

- House hit rate on us at 45-75 m: 0.420 -> 0.426. At 75-110 m: 0.258 -> 0.274 (se 0.015-0.019).
- Shots leaving within 0.1 s after one of our reversals: 12.5% in both arms (the lock did not raise it).
- Those shots hit about as often as the rest (0.28 against 0.30).

No effect, so it is not proposed. V4's reactive bullet dodge and seeded strafe already hold the 75-110 m rate at about 0.25
in the simulator.

## 9. Scripts (all in `tools/panel_r6/`, stdlib Python with `-I`, or the repo's Bun)

`slew_order.py` (replay: slew before shot), `age_tick.py` (stream: bullet travel vs sound age), `lead_bias.py` (hit
probability of the half-tick bias), `test_io1_lead.mjs` (T-IO1), `identity.mjs` (copy = V4 on the kit stream),
`hitrates.py` / `incoming.py` (simulator traces: our gun and laser hit rates, house hit rates on us by range),
`v4io/bot` + `io_patch.diff` (reference patch), `ov_*.json` (simulator presets), `tr*/` and `sim*.json` (traces and results).
