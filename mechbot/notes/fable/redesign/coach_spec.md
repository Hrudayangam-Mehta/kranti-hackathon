# FB rule spec (gamer coach, second pass) - on top of CH1

One author, no independent review, nothing here is measured. Every number is a `params.js` key; read live values from `hello`.
CH1 already owns: target score, partial laser release, walk-in finish, opening laser run, kill-cube boost, 100-130 m laser band,
farm-in-passing, upgrade order. FB adds 8 rules. Goal: +1 kill per match (about 390 HP of budget, or one conversion).

## Module contract (so three engineers do not collide)

Each module is a NEW file that only writes its own fields on `B`. One integrator alone edits `tactics.js decideMode()`,
`firecontrol.js run()` and `brain.js` to read them.

| Module | File | Writes | Reads |
|---|---|---|---|
| M-A | `engage.js` | `B.ft = {tKill, tDie, shooters, ok, finish}`, `B.rPref`, `B.reposition` | tracks, `B.A`, `B.regen` |
| M-B | `survive.js` | `B.regen = {at, running, lost}`, `B.holdFireFB`, `B.dropGo`, `B.grabGo` | `me.lastDealtT`, `me.lastHurtT`, `B.ft` |
| M-C | `farm.js` | `B.crateShot`, `B.farmOk`, `pickFB(offer)` | `B.regen`, `B.ft`, `B.dropGo` |

Missing input = neutral default (`ft.ok` true, `regen.running` false), so modules ship in any order.

## Mode priority and hysteresis

`ZONE(urgent) > DROP > GRAB > FINISH > REPOSITION (disengage) > FIGHT > HEAL (regen hold) > LOOT > ROAM (seek)`

- ZONE, DROP, GRAB, FINISH switch at once. Others keep `modeHold` 0.6 s.
- DROP latches until captured, the drop is gone, or 12 s after landing with no progress of ours.
- GRAB: 6 s timeout, then that item ignored 30 s.
- FINISH latches until the target dies or exceeds 45% HP.
- REPOSITION: at most 3 s, then 4 s lockout (no hide-and-heal loop).
- HEAL ends on any line opening on us.
- `B.doomed` (last stand) still forces FIGHT below ZONE.

## M-A engagement

**FB1 Fight-or-not test (both).** Each decision, for the target at `rPref`:
- ourDps = gun 105 x hit(97% at 40 m, -0.35/m, floor 30%) + laser 131 + lightning 240 inside 45 m; x cubes, x1.5 rear, x1.6 cook-off.
- inDps = sum over hostile mechs with a line: gun 105 x hit(90% at 40 m, -1.25/m, floor 6%) + 131 if it holds a laser; x(1 - armor).
  Use max(model, `B.A` measured over 2 s).
- tKill = tgt.hp / ourDps; tDie = me.hp / inDps.
- `ft.finish` = tKill <= 1.6 s (overrides everything below ZONE/DROP).
- `ft.ok` = tKill < tDie, or ourDps - inDps > 25. With 2+ shooters and tKill > 2.5 s: needs tDie >= 1.5 x tKill.
- Replaces `losingRaw()` in SQUAD.

**FB2 Reposition against 2+ shooters (SQUAD-only).** Trigger: `!ft.ok`, shooters >= 2, not finish, a cell within 3 s (boost, energy > 12)
that cuts lines to <= 1. Action: go there, keep firing and charging, re-enter FIGHT on the remaining shooter. No such cell: fight on
("never leave" won officially; this narrows lines, it does not hide). Flag `fbLatch` (default OFF, one-change test only): hp < 35%
under fire -> stay out until 80%, or 55% with 6 s quiet.

**FB3 Range from the damage model (both).** `rPref` = argmax over {28, 40, 55, 75, 100, 130, 160} m of ourDps - k x inDps; k = 1.15 SQUAD,
1.3 FFA; a closer step wins unless the farther one is 2 better. Expect about 100 m against gun / gun+laser hunters, 55 m against
laser+lightning, 28 m holding lightning. Boost back when > 25 m inside and energy > 30. Overrides CH1's band inside 90-130 m with a
laser; keeps kill piles reachable. Target unseen: walk to its last position until 0.6 x rPref.

## M-B survival and power

**FB4 Supply drop first (SQUAD-only).** Trigger: hp < 90%, a drop within 200 m straight, inside the next zone, landed or landing <= 3 s
after arrival. Action: `dropGo`; boost if > 12 m and energy > 8; stop within 2 m; keep shooting the target; stand 4 s. No contest
check, no HP margin. A house holder in the ring: step in (freezes its clock) and shoot it, it stands still. From the 70 s call with
hp < 70%: fight on a 60 m leash around the ring. Delete `dropContestR`, `dropEarlyS` and `dropHpBase` in SQUAD.

**FB5 Regen clock + hold fire (both).** `regen.at` = max(lastDealtT, lastHurtT) + `me.regenDelay`. `regen.lost` = 45 x delay (225 HP).
Hold fire when: no line on us for 0.5 s, hp < 75%, not finish, last hurt > 1.5 s ago. Stay put, reload to full, release at 80%, at
12 s, or the instant a line opens (holding fire under fire cost 0.34). While regen is within 2 s of starting or running and hp < 90%:
no drone shots, no gun pokes with hit chance < 40%. Never walk away to create this state.

**FB6 Grab beats fight (SQUAD-only).** Trigger: hp > 30%, path <= 1.5 x straight, and a laser within 45 m (none held) / a cube within
18 m (28 m with <= 1 shooter) / a wanted weapon within 25 m with an empty slot; no mech within 30 m of the item. Action: `grabGo`,
boost, torso and triggers stay on the target. Wide laser grab (130 m) stays OFF - it lost officially.

## M-C economy

**FB7 Laser on crates (both).** Trigger: laser ready, no mech shootable for 0.4 s, crate with a line within 110 m (50 m if a mech was
seen in the last 4 s), `regen.running` false or hp >= 97%. Action: `crateShot` - one full beam (315 >= 300), gun silent. A drone that
bit us in the last 3 s takes torso and beam first. `laser_damage` x1 also one-shots drones (350).

**FB8 Farm thresholds and conditional picks (SQUAD-only).** Crates at hp > 45% within 80 m of path; drones at hp > 60% within 130 m with
no mech in view; cubes always within 85 m; no 210 s stop. All suspended while `dropGo`, or shooters >= 2. Picks: CH1 order, with
overrides: plating always first; `laser_damage` over armor while holding a laser; nanites jump to 2nd once measured hold-fire time
exceeds 8 s per life; within 2 cubes of a threshold never drop the laser.

## Coach's stake guess (unmeasured)

FB4 +0.4, FB1+FB3 +0.3, FB6 +0.15, FB5 +0.1, FB7+FB8 +0.1, FB2 unknown sign. Test order: FB4, FB1+3, FB6, FB5, FB7/8, FB2 last and alone.
