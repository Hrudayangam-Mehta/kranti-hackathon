# BackwardsDeployeds (rank 11, 5.06): clean-room study and counter-tactics

Written 21 Nov 2026 by the clean-room analyst step. Read-only work: nothing from the team's repository was
executed, nothing was decompiled, no code, identifier, comment or constant table is reproduced here. Short
quoted phrases are evidence only. All numbers below are my own description of observed behaviour.

Repository: brycehcmcgrath/mechfight-bot (public). Lineage: LanceHuang245/mech-royale at its pinned commit
171bc06 (MIT), wrapped by a small adapter written by this team.

## 1. Identity and the scored version (re-checked)

| Evidence | Result |
|---|---|
| Text | The release README says "Container entry for BackwardsDeployeds". The readable branches carry a results ledger headed with the team name, with organiser receipt ids for every submission. |
| Ledger against the board | Ledger: 1.75, 2.52, 3.71, 3.65, 4.10, 4.54, 4.75, 4.79 (last one "selected best" at 02:59:53 UTC). Their notes quote the public board confirming 4.54 rank 9, 4.75 rank 7, 4.79 rank 8 at the matching minutes. |
| Board now | `web/mech_submission_times.json`: one entry, 5.06 at 04:17:54.59 UTC. The 04:25 UTC page copy shows the same time. |
| Commit times (UTC) | Compiled releases: 03:29:20, 03:39:06, 04:01:06, **04:16:09 (9c9801e)**, 04:48:22, 05:20:13. Only 9c9801e sits inside the scoring delay before 04:17:54 (105 s; their own log shows a receipt at 02:58:23 scored at 02:59:53, i.e. about 90 s). |
| Branch pointer | When the history was fetched at 05:46 UTC, the default branch still pointed at 9c9801e although two later releases existed on side branches. Their documented habit is to move the default branch only after an official improvement. So the two later payloads did not beat 5.06. |
| Sparring copy | `/srv/mech-sparring/bd_payload_9c9801e/pilot.so` and `vendor/lance/bot.so` have the same SHA-256 as the blobs of commit 9c9801e. |

Verdict: team-to-repository link **confirmed**; scored version **likely 9c9801e** (tight timing plus the
branch pointer; the compiled files state no score, hence not "confirmed").

## 2. What could and could not be read

- Could not be read: the 5.06 build. It is three compiled extension modules (wrapper, controller, transport).
  All six compiled releases have commit subjects of the form "Update runtime payload" with empty bodies, and
  the readable ledger stops at 4.79. I did not decompile, disassemble or dump the binaries.
- Established from metadata only: the controller binary and the transport binary are **byte-identical in
  all six compiled releases**; only the wrapper changes (sizes 87.8 kB, 110.3 kB, 87.8 kB with different
  bytes, **114.9 kB = the 5.06 build**, 148.2 kB, 123.1 kB). So every behaviour change after 4.79 lives in
  the team's own wrapper, layered over one unchanged controller.
- Read completely: the 4.79 build (commit dfe5cdd, copy at `/srv/mech-sparring/bd_lancecharge_dfe5cdd`):
  its 80-line wrapper and the 1,216-line controller, which is byte-identical to LanceHuang245 171bc06
  (same SHA-256 as `/srv/mech-sparring/lance_171bc06/bot.py`). Also all docs of the last readable commits
  (ledger, progress log, trial designs, competitor research) and the metadata of all 45 commits.
- Second-hand lead (weak): the earlier study in the workflow journal recorded names visible in the wrapper
  binaries. By those names the 04:01 release = quiet walking + rapid strafe reversals + the charge guard;
  the 5.06 release adds a conditional rule that keeps the gun (keyed on how far a rival is compared with
  lightning range, and on the retreat state); the 04:48 release adds a filter on the damage history
  (drones it farms, rear hits, zone damage). I did not re-verify this.
- Readable context that supports the lead: at 03:00 UTC the team prepared a "keep the gun, want only a
  laser" trial, after seeing their bot in a public exhibition "carrying laser/lightning at 132-166m while
  losing to gun/laser". No score was ever recorded for that trial in readable form.

Consequence for us: treat the 5.06 bot as "the 4.79 bot with (probably) faster strafe reversals and
(probably) a gun kept more often". Every counter below is keyed on what we can observe (weapon list,
charging flag, ranges, speeds, reversal cadence), not on the identity.

## 3. How the bot plays (controller read in full; numbers are behaviour, in my words)

One decision function, a fixed priority ladder, no learning, no memory of enemies beyond what the server
keeps showing (5 s). Aiming and firing are decided independently of movement, so it shoots in every
movement mode.

Movement priority, first match wins: zone emergency (outside, or within 8 m of the edge) > go to cover
(hurt latch, outnumbered, or out-ranged, unless a close fight or a finishing chance) > zone "must go" >
walk to a cube > arm up (gun only: go to a laser or lightning pickup first) > fight > other loot > roam.

- **Sight model.** Its own map model: 2 m raster of building bases and tops plus terrain, rays sampled every
  2.5 m (4 m for cover checks), no trees. An enemy counts as "can be shot" when its own eye sees the top of
  the enemy's head OR its muzzle sees the enemy's body centre. It always aims at the body centre.
- **Target.** Lowest of: distance + 0.2 x absolute hit points, minus 100 if the enemy is at or below 30% hp,
  minus 120 for the current target, minus 40 if that enemy hit it in the last 4 s, plus 400 if it has no
  line. No engagement etiquette is active: anything visible is shot at, at any range inside weapon range.
- **Laser.** Starts charging the moment anything shootable is inside 275 m (mechs and drones; crates only
  when it has no gun). While charging the torso tracks the bullet-lead point (lead time = distance / 252
  + 0.05 s even with no gun held); at full charge it switches to a 0.1 s lead and releases when within
  an angular tolerance of 1.6 body radii (plus 0.012 rad). It never fires a partial charge. With a target
  lost but still tracked it holds the charge up to 1.5 s past full, then lets go blind. Cycle: 0.75 s
  charge + 1.65 s cooldown = 2.4 s (2.07 s after two charge upgrades). Half speed while charging.
- **Gun.** Two-pass lead plus 0.05 s; fires whenever within the same loose tolerance and inside 227 m.
  Dropped as soon as both laser and lightning are held (4.79 build). Reloads when idle under 60%.
- **Lightning.** Fires inside 44 m when the target is within 12 degrees of the torso and energy >= cost + 1.
  No energy reserve; shares the pool with boost and jets.
- **Fight spacing.** 110 m with a laser, 85 m with the gun only, 28 m with lightning; with laser AND
  lightning it switches to 28 m as soon as the target is inside 60 m. Radial gain: full speed in or out
  when 30 m off the preferred range. Sideways component 0.85. Net closing or opening speed about
  8.9 m/s (4.5 m/s while charging). Strafe direction is re-drawn every 1.0-2.6 s and actually reverses
  70% of those times (rapid switch: every 0.35-0.9 s, always). No path planning in fight mode.
- **Retreat.** Latch on below 38% hp with a threat visible; off above 80%, or after 12 s without damage
  above 60%. Also goes to cover when 3+ threats are visible, 2+ with hp under 60%, incoming damage above
  110 per second over a 2.5 s window (275 damage: one full laser beam is enough), or any hit from an
  attacker it cannot see in the last 1.5 s. Cover = best of 16 directions x 7 distances (7-75 m) that it can
  walk to in a straight line and that the three nearest threat eyes cannot see. With no such point it
  stands and trades; when out-ranged, healthy and facing one enemy it zigzags in to 22 m.
- **Overrides that cancel retreat.** Close fight: target shootable within 40 m and (lightning held or hp
  above 50%). Finishing: target at or below 30% hp within 130 m, own hp above 30%, at most 2 threats; then
  it closes to 28 m (lightning) or 55 m.
- **Incoming fire.** Sidesteps a charging laser only if the aim line passes within 7 m + 3% of the distance
  (no sidestep inside 40 m if it can zap instead); sidesteps visible bullets whose closest approach in the
  next 0.45 s is within 3.8 m; runs from mortar landings within 13 m. The sidestep is a plain perpendicular
  push, never a move to cover.
- **Unseen attacker.** A phantom enemy is assumed 120 m along the damage bearing; the torso turns to look
  and it stops shooting its current target unless that target is within 45 m or its laser is mid-charge.
  Drone hits are treated the same way (the phantom rule does not separate drones from mechs).
- **Economy.** Cubes within 70 m interrupt a fight whenever the target is beyond 60 m and at most one real
  threat is visible (120 m when roaming). Crates shot from 22 m (seen ones within 150 m, remembered ones
  to 260 m when above 60% hp and calm). Drones above 55% hp from 50 m. Supply drops when calm, above 45%
  hp, within 170 m. Wanted pickups chased up to 240 m when it holds neither special weapon, else 160 m.
  Upgrades: hull plating first, then damage reduction, then regeneration, then laser and lightning items.
  Never keeps a mortar.
- **Quiet walking** (on in the 4.79 build): capped at 4.6 m/s when roaming, walking to a cube or to cover,
  if an enemy is tracked or a threat sound was heard in the last 8 s and it was not hit for 3 s.
  2.3 m/s when also charging.
- **Zone.** Safety margin min(30 m, 30% of next radius); "must go" when the missing distance at 11.7 m/s
  plus 12 s exceeds the time left. Goal is exactly the next centre, straight march, dodge strength halved
  in an emergency. When roaming it settles within 55% of the next radius (minimum 15 m) and stands still.
  No endgame logic.
- **Stuck handling.** Commanded motion below 2.5 m/s for about 0.7 s: jump and jet toward the goal for
  2.5 s (if energy above 35), else a random 90-150 degree detour for 1.5 s. A second watchdog every 2.5 s.
- **Idle torso.** No enemy tracked: looks along the last damage bearing (3 s), then the last sound (2 s),
  then spins steadily at about 3.5 rad/s (a full turn every 1.8 s).

## 4. What changed between 4.79 and 5.06

| Step | Official | What is known |
|---|---:|---|
| Controller unchanged, quiet walking on | 4.54 | ledger |
| Quiet walking off | 4.75 | ledger (+0.21) |
| Quiet walking on + guard that stops the stuck timer from tripping while a laser charges | 4.79 | ledger (+0.25 against quiet-on, +0.04 against quiet-off) |
| Compiled wrapper, 04:16 UTC | 5.06 | **+0.27, content unreadable.** Controller binary unchanged; wrapper grew by about 27 kB over the 04:01 release. Second-hand names suggest rapid strafe reversals plus a conditional keep-the-gun rule, quiet walking and the guard retained. |
| Two later wrappers (04:48, 05:20) | not above 5.06 | default branch never moved |

The cause of the 4.54 result is documented by the team: quiet speed 4.6 m/s times the charging slowdown 0.5
is 2.3 m/s, under the controller's 2.5 m/s stuck threshold, so after 1.6 m of free walking it jumped and
jetted for 2.5 s. Each official number is a single 48-match run.

## 5. Why it scores (practice)

1. Swapping their own planner bot (best 2.52) for the unchanged public rule ladder: 4.54 official.
2. Removing the false stuck recovery: +0.21 to +0.25 official.
3. Wrapper-only changes on top: +0.27 official, content unverified.
4. Properties of the core that the team never isolated: fires at everything in range in every movement
   mode, laser + lightning loadout, plating first, hides at 38% and when outnumbered, cubes mid-fight.
   The core author's own numbers for these are simulator numbers except three real version scores
   (3.71, 4.44, 4.75).
5. Not in the scored line: the +0.39 "finish what the magazine can kill" result was measured on the other
   public bot they tried (3.71 to 4.10).

## 6. Free-for-all behaviour and record

- Detector: none in anything readable. The readable README states the policy has no practice/final switch.
  The core contains a dormant hide-and-ambush switch (hold fire unless the target is within 55 m, under
  55% hp, attacked it in the last 6 s, is charging, has its torso more than 75 degrees away, or 4 or fewer
  mechs are alive). The compiled wrapper could turn it on for the final; the team wrote that they were
  researching free-for-all tactics from the public casts.
- Posture as read: identical to practice. Shoots on sight, sits at 110 m with a laser, runs in to 28 m with
  lightning inside 60 m, hides at 38%, walks to cubes and drops, marches to the centre.
- Record: one win in the 03:00 UTC top-16 exhibition (another team's cast data): alive 277 s, 3 kills +
  1 drone, 7,156 damage dealt (laser 73%, lightning 27%, gun 0%), 4,776 taken (highest of the seven
  recorded winners), mean hp 77% (lowest of the winners), laser at 12 s, 19 cubes, 2 crates, 2 supply
  drops, 5 upgrades (plating, plating, charge time, damage reduction, charge time), 0.34 of the radius
  from the centre, nearest mech 165 m on average, airborne 7% of the time (highest of the winners),
  within 12 m of a building 75% of the time, not firing 46% of the time. Which build played is not
  known (the 4.75 or 4.79 build by time). Their own note for the same exhibition hour says their bot was
  also seen losing at 132-166 m to gun + laser carriers.

## 7. Limitations (each one checkable against the sparring copies)

1. **Centre-only aim behind partial cover.** It fires whenever it sees the top of our head but always aims
   at the body centre. Cover whose top is between about 5.2 and 6.6 m above our feet (scaled by our size)
   stops its beams and bullets while our muzzle at 7 m clears it.
2. **No pursuit, 5 s horizon.** The instant we are not shootable it leaves fight mode; after 5 s out of sight
   we do not exist for it. It never comes round a corner on purpose.
3. **Beam clock.** At least 2.07-2.4 s between beams, never a partial charge, blind release at most 2.25 s
   after the charge began. With laser + lightning and no gun it deals zero damage beyond 45 m between beams.
4. **Blind sides.** Server vision is a 120 degree wedge on the torso out to 200 m plus 45 m all round. While
   it duels someone, everything beyond 60 degrees off its aim and beyond 45 m is invisible; hits from there
   make it stop shooting, turn (up to 0.8 s) and go to cover against a phantom placed at the wrong range.
   Bullets from there are seen only in their last 45 m (0.18 s), too late for its sidestep. Hits from more
   than 90 degrees off its aim take the 1.5x rear multiplier.
5. **One beam breaks its fight.** Any 275 damage inside 2.5 s (one full beam) sends it to cover for 2.5 s
   if a hidden point exists within 75 m.
6. **Stationary heal.** Below 38% it hides behind a point chosen against the three nearest threats at
   that moment, stands still, and needs about 12-15 s to leave (regeneration starts after 5 s without
   dealing or taking damage). It keeps shooting crates and drones from the hide, which both resets its
   own regeneration and gives its position away by sound.
7. **Threshold jumps.** 60 m (runs in when it has both weapons), 44 m (lightning), 40 m (never retreats),
   30% of our hp within 130 m (it rushes to finish and ignores its own retreat rule).
8. **Target rule uses absolute hp.** 1,000 hp of difference is worth 200 m. It abandons a healthy mech
   100 m away for a wounded or small one at 180 m; a wounded mech is its favourite target at any range.
9. **Straight, non-strafing legs.** Zone march to the exact next centre, cube walk (cube within 70 m while
   its target is beyond 60 m), pickup run while gun-only (up to 240 m), supply-drop capture (4 s inside
   an 8 m ring), retreat to cover. With quiet walking these legs are at 4.6 m/s, 2.3 m/s while charging.
10. **Long strafe legs** in the readable build: 1.0-2.6 s at constant velocity, speed halving predictably
    for 0.75 s of every 2.4 s cycle.
11. **Loose release tolerance.** Gun and laser are released anywhere within 1.6 body radii of the computed
    point, and during charge the torso sits on the bullet-lead point, about 4.5 m ahead of a mech walking
    sideways at 110 m. Whether that produces misses depends on the server's order of turning and firing:
    untested, worth one simulator run.
12. **Laser sidestep corridor** is 7 m + 3% of range; an aim held outside it draws no reaction.
13. **Drone hits count as an unseen attacker**: while a drone tags it at least every 1.5 s it turns toward
    the drone, stops shooting anything beyond 45 m and walks to cover. (Possibly repaired in the 04:48
    wrapper, which was not promoted.)
14. **Geometry is coarse**: no trees in its model (it keeps firing through canopy at a tracked mech for
    5 s; trees are no protection), 2 m cells, thin walls can be skipped by 2.5 m samples, cover is only
    searched along straight walks.
15. **Stuck recovery puts it in the air** for up to 2.5 s on a near-ballistic path.
16. **No indirect fire**: never carries a mortar, so hard cover is complete protection.
17. **No endgame plan**: stands within 15 m of the last centre; with lightning it wins point-blank brawls,
    without it it is a stationary target.
18. **Compliance exposure**: the 5.06 entry is another author's controller compiled into binaries with a
    licence notice. Another team withdrew the same controller "under the no-code-sharing rule". The team
    may be removed or may switch entry before the final.

## 8. Signatures (what an opponent can observe)

- Weapon list: gun only for the first seconds, then laser and/or lightning within about 5-15 s; never a
  mortar. Readable build ends laser + lightning with no gun; the 5.06 build may show gun + laser.
- `charging` true almost immediately whenever it has a line to any mech or drone, repeating every 2.1-2.4 s.
- Opens fire at first sight at any range up to 200 m.
- Holds about 110 m with a laser (moves in beyond 140 m, out inside 80 m), walking sideways with long legs
  (1.0-2.6 s) or, if the rapid switch is on, reversals every 0.35-0.9 s; speed drops from 11.7 to about
  5.9 m/s while the flag is set.
- Lightning listed and range under 60 m: turns and closes at about 9 m/s on a 40 degree zigzag.
- Below 38% hp: turns to a nearby building, boosts if just hit, then stays out of sight 12-15 s.
- Creeps at 4.6 m/s or less (silent) toward cubes or cover when not hit for 3 s (if quiet walking is on).
- Walks off its strafe line straight to a cube within 70 m while its target is farther than 60 m.
- Torso spinning steadily one way at about 3.5 rad/s when it tracks nobody.
- When hit from where it cannot see: torso snaps to the damage bearing and it stops firing.
- Max hp steps of x1.15 at 1 and 3 cubes (plating first): max_hp / (1400 x (1 + 0.04 x min(cubes, 10)))
  reads 1.15, then 1.32, then 1.52.
- Jumps and jets for up to 2.5 s when blocked.

## 9. Counters, ordered by expected gain in a free-for-all

Notation: "general" = safe as a rule against any bot showing the same signature.

### C1. Range discipline around 60 / 45 / 40 m (largest loss avoided)
- Trigger: lightning in its weapon list (any Lance-style signature), free-for-all posture.
- Action: treat a 60 m disc around it as impassable for path planning and 60-75 m as expensive. Hold
  70 m or more (band 65-80). If range drops under 70 m, back away along cover at full walk (11.7 m/s
  beats its 8.9 m/s closing speed, 4.5 m/s while it charges) while firing. Under 55 m and closing: boost
  to break the line when energy is above 30. Break the line of sight before our hp reaches 60% so that
  one beam cannot put us at 30% in its view (its finish rush starts at 30% inside 130 m).
  Inversion: if we hold lightning and it lists a laser but no lightning, close to under 44 m only when it
  is already inside 60 m or standing in its heal state, with at least 60 energy on arrival; each arc
  disables its laser for 2 s.
- Exploits: its preferred range flips from 110 m to 28 m at 60 m; inside 40 m it never retreats; its
  lightning does 240 damage per second at base and up to about 400 with its usual upgrades and 10 cubes,
  and every arc cancels our laser charge for 2 s.
- Backfire: a different lightning carrier that does not close costs us nothing; the cost is lost ground and
  cubes inside the disc. In practice mode a 75 m keep-away rule was part of a losing bundle, so this is
  FFA-only. Loss bound: none in damage terms.
- General: yes, in free-for-all only.

### C2. Beam-clock corner peek
- Trigger: laser carrier that charges on sight and has a line on us; a hide cell within 6 m (9 m boosting).
- Action (fast cycle): break the line. Charge our laser behind the corner (0.75 s). Wait until its beam is
  spent: a beam from its id, a laser sound on its bearing, or its charging flag false in the tracked
  record. It lets go blind at most 2.25 s after its charge began. Then step out 3 m or less (0.5 s at
  half speed), release on its tracked position, step back (0.5 s). Exposure at most 1.3 s against its
  minimum 2.07 s to the next beam. If it lists a gun, do this only during its reload (2.4 s after 12
  bullets) or accept one burst.
  Action (slow cycle, unconditional): stay out of sight 5.2 s or more, re-appear from a different corner
  cell at least 15 m away; on the first observation abort if its flag is set with its aim within 0.25 rad
  of us, otherwise release.
- Exploits: no partial charges, no pursuit, no indirect fire, and with laser + lightning no damage at all
  beyond 45 m between beams. Each of our beams also sends it to cover for 2.5 s.
- Backfire: a bot that holds a ready charge on the corner, or has a well-aimed gun. Bounds: peek only with
  its flag false or a beam seen in the last 1.5 s, at hp 55% or more; stop after two peeks without a hit or
  after 350 damage taken in one peek. Worst case one beam (315 to about 440).
- Expected: 315 x (1 + 0.04 x our cubes) per cycle of 2.5-4 s for at most one gun burst taken.
- General: yes.

### C3. Hull-down firing cell
- Trigger: any exchange with this signature beyond 45 m.
- Action: in the exposure evaluation add a cell class "hull-down against enemy E": ray from E's muzzle
  (its feet + 7 m) to our body centre is blocked, ray from our muzzle to E's centre is clear. In level
  ground terms the cover top is 5.2-6.6 m above our feet, times our size factor. Prefer such a cell
  within 10 m over full cover when our hp is 55% or more; stand still in it (standing still is safe only
  there) and fire gun and laser.
- Exploits: it is allowed to fire when it sees our head top but only ever aims at the centre, so its beams
  and bullets end in the cover.
- Backfire: a bot with an aim-point ladder (like ours) hits the exposed 2-3 m; then the cell is still better
  than open ground but standing still is not. Bound: leave the cell after the first hit taken there from
  that enemy. Mortars ignore it (this bot has none).
- Expected: its damage on us close to zero while ours continues; the best trade available against it.
- General: yes (with the leave-after-first-hit rule).

### C4. Blind-side third party
- Trigger: signature mech whose aim stays within 0.2 rad of a third mech (or beams between them), our hp
  55% or more.
- Action: pick a firing cell 90-150 m from it, more than 100 degrees off its aim direction, hard cover
  within 6 m. Full-charge beam (x1.5 from the rear) plus gun bursts (its sidestep cannot see them until
  the last 45 m). When its torso swings to within 60 degrees of us, step behind the cover and let the
  other mech hit its back; resume when its aim leaves us. With one sensor upgrade the same works from
  200-225 m, where it can never see us.
- Exploits: 120 degree wedge, target stickiness worth 120 m, absolute-hp target rule (it stays on the weaker
  mech), phantom-attacker reaction that interrupts its own fire.
- Backfire: its opponent, or a different bot with a wider awareness, turns on us. Bounds: range 90 m or
  more, cover within 6 m, stop when either mech charges with its aim within 0.25 rad of us, never when a
  fourth mech has a line on the firing cell.
- Expected: about 470 per beam and 67 per bullet into the rear arc; two beams and one magazine can exceed
  1,500 before it reaches cover.
- General: partly. The geometry rule (shoot only from outside the wedge, cover within 6 m) is safe; relaxing
  our "target must be under half hp" rule is for this signature only.

### C5. Regen denial and flank finish on the stationary hider
- Trigger: signature mech seen below 38% hp that breaks the line toward a building.
- Action: it stops within 75 m of where it turned and stands still for 12-15 s. Use the 5 s of tracked
  position to fix the hide cell. Plan a path to a cell with a line to that spot from a bearing at least
  90 degrees away from our old one, 60-110 m from it (never inside 60 m if it lists lightning), arriving
  with a charged laser held (hold limit 2 s). Fire, then gun the runner: it leaves in a straight line for
  a new cover point. Any hit every 5 s or less keeps its regeneration off.
- Exploits: the hide point is validated only against the threats of that moment and not re-checked once
  nobody is tracked; it stands still with a spinning torso (rear arc half the time).
- Backfire: a different bot that waits at the corner with a charged laser or lightning. Bounds: keep 60 m,
  abort 12 s after the line broke, abort if our hp is under 55% or another mech has a line on the route.
- Expected: converts a wounded escape into a kill (its cubes + 2).
- General: no (signature only).

### C6. Punish the straight legs
- Trigger: it is computably on a straight leg: (a) zone march, when its distance to the next centre minus
  (next radius minus min(30, 0.3 x next radius)), divided by 11.7, plus 12 s exceeds the time left;
  (b) a cube within 70 m of it while its target is beyond 60 m; (c) gun-only and a laser or lightning
  pickup within 240 m of it; (d) holder of a supply-drop ring; (e) walking to cover.
- Action: our steady-velocity gun gate is already satisfied (velocity constant for 0.6 s): fire the gun out
  to a flight time of 0.8 s and time the beam for mid-leg, from a covered cell on the flank of the leg.
  For (d) fire at the ring from 100-150 m.
- Exploits: none of these modes strafes; quiet walking makes them 4.6 m/s.
- Backfire: gunfire is heard to 320 m and a beam to 380 m. Bounds: cover within 6 m, hp 70% or more, skip a
  drop with 2 or more other mechs within 150 m.
- General: yes.

### C7. Fire-control details against its movement and its dodge
- Measure its sideways reversal intervals over 3 s. Median under 0.95 s (rapid strafe on): fire the gun only
  when bullet flight is under 0.30 s (about 75 m), otherwise laser only. Median above 1.0 s: fire the gun
  at any flight time up to 0.55 s.
- While our gun is reloading, empty or out of effective range, keep our torso (9 m + 3% of range) / range
  radians off its body during our charge (0.11 rad at 110 m, 0.18 rad at 60 m) and swing on at 80% charge:
  it never starts its sidestep. Do not do this while the gun can fire (the gun needs the torso).
- When its flag is set, its aim is within 0.25 rad of us and no hide cell is within reach: walk sideways at
  plain walk speed, no straight boost, and reverse once about 0.15 s before its charge completes.
- Backfire: none beyond a lost gun burst; all three are plain good practice.
- General: yes.

### C8. Drone window (minor)
- Trigger: signature mech within 45 m of a drone and taking drone fire.
- Action: open fire from beyond 45 m; it does not return fire while the drone keeps tagging it.
- Backfire: repaired builds behave normally; cost is zero (we were allowed to shoot anyway).

Endgame note: once the next radius is 70 m or less and a lightning-listing signature mech is alive, do not
stand on the centre inside its 44 m. Hold the far side at 50 m or more for as long as the circle allows
(at radius 25 opposite edges are 50 m apart) and shoot it during every zone march (C6a).

## 10. Lessons for our practice bot, against Doctrine V4

1. **Quiet walking is not the cost; the false stuck jump was.** 4.54 (quiet) / 4.75 (quiet off) / 4.79
   (quiet plus a guard on the stuck timer), all official, single runs. Disagrees with the grade of D3
   "quiet walking while travelling lost 0.2 [S]": both sources for that number ran this same controller
   with this same fault. Keep full-speed travel as default (no gain shown for quiet in practice: +0.04 is
   noise), downgrade the evidence to contested, and do not forbid creeping in the heal state.
2. **Audit our own stuck detector** against charging (x0.5) and deliberate slow modes: heal creep at stick
   0.42 is 4.9 m/s, 2.46 m/s while charging. A threshold near 2.5 m/s would misfire. Official value of
   getting this right on their bot: +0.25. Grade: one team.
3. **Strafe cadence is contested, not settled.** D4 says never faster than 0.8 s on one mid-table A/B. The
   5.19 bot reverses every 0.35-1.05 s, and (weak, second-hand) the +0.27 step to 5.06 appears to include
   0.35-0.9 s reversals. Make the strafe interval a named preset and spend one official run on
   U(0.35, 0.95) against U(0.8, 1.6).
4. **Keep the gun in practice.** Agrees with D7. Their own exhibition note (laser + lightning losing at
   132-166 m to gun + laser) and the apparent keep-the-gun rule in the 5.06 build point the same way.
   Grade: weak for the build content, one observation for the note.
5. **110 m with a laser reached 4.79-5.06.** Supports D2 preset `mid` (115 m) at least as much as `far`
   (150 m). The doctrine already marks this contested; nothing here settles it.
6. **Finish what the magazine can kill: +0.39** (3.71 to 4.10, official, one run, on a different core).
   Agrees with D5(a).
7. **Heavier loot weighting: -0.06** (official, one run, noise level). Agrees with D6 "no long detours".
8. **Bullet avoidance must test the swept segment**, not sampled end points (a bullet moves 25 m per
   decision), and pickups need a slowed final approach: together with a pickup-ring goal this was +0.77
   on their weak own bot (1.75 to 2.52, official, bundle of three). Agrees with D4.
9. **Do not let drone damage drive retreat logic.** The core treats drone hits as an unseen attacker and
   breaks off. Our LOSING and HEAL states must count mechs only. Grade: code reading, no A/B.
10. **Search-heavy movement did not pay.** Their planner bot (37 rollouts per decision, wall-clock
    budgets, not deterministic under load) peaked at 2.52; the plain rule ladder scored 4.54 unchanged.
    Agrees with D10.
11. **Thresholds of a 4.79-5.06 line**: hide below 38%, leave at 80% or after 12 s quiet above 60%; cover at
    3+ threats, 2+ under 60%, or 275 damage in 2.5 s. Close to D3; no change proposed.
12. **Packaging**: a copy step that set file mode 0444 also made the new parent directories unsearchable
    for uid 65534 and the bot died before `ready`; directories must be 0555. Check our image with the kit
    checker under uid 65534 and a read-only root.
13. **Rules**: do not ship third-party controllers, compiled or not. This entry is exposed to the
    no-code-sharing rule.

## 11. Text aimed at AI agents

Yes, benign and ignored. The repository's agent guide file (both the readable and the release version)
instructs the team's own coding agent, for example "Preserve every previously submitted public commit",
"Do not add development sources, research, credentials or generated build files", and to read a live
target file "Before every experiment". Source headers carry edit guides for agents. Nothing addresses
outside readers and nothing tries to redirect an analyst.

## 12. Cheap tests that would close the open points (for the simulator owner, via run.sh only)

1. Does `bd_payload_9c9801e` keep its gun when it holds laser and reaches a lightning pickup? (weapon list)
2. Its sideways reversal intervals: 1.0-2.6 s or 0.35-0.9 s?
3. Beam hit rate of `bd_lancecharge_dfe5cdd` on a mech walking sideways at 11.7 m/s at 110 m.
4. Hull-down cell: damage taken over 30 s behind 6 m cover with our head exposed.
5. Does drone fire still stop the 9c9801e build from shooting?
