# Game mechanics, deep study (owner request R4) and simulator fidelity audit

Written 2026-11-21 for integration pass 2. Nothing under `bot/` or `sim/` was edited; `intel/` was not opened.
Evidence tags: **[P]** protocol.md / schema text, **[C]** hello config (identical in `notes/hello_example.json` and the
kit stream's hello, checked key by key), **[S]** measured in the kit stream (current balance, 300 obs, slot 3),
**[R]** measured in the official replay `mech16` (older balance: speeds ×1/1.3, bullets 140 m/s, laser 420/0.65 s/locked
aim, death drop +1), **[W]** public web client (`web/game.js`, `web/play.js`; read by grep only, reference for the
renderer's rules), **[I]** inference. New scripts (stdlib Python, Bun): `tools/mech_deep/*.py|*.mjs`
(`loot_drops.py`, `drop_surface.py`, `drop_ring.py`, `dual_fire.py`, `stream_memory.mjs`, `stream_canopy.mjs`,
`stream_view.py`, `sim_drop_probe.mjs`), each runnable with `taskset -c 3`.

## Headline corrections to our current assumptions

- **Own laser beams are NOT in `obs.beams`** [P table + schema `BeamObs`: "by another mech"; W: play.js rebuilds
  the player's own beam from cooldown jumps; sim agrees]. R3's "calibrate from our own beams" cannot work. Calibrate
  from `hit` events instead (a release followed by no `hit` with `weapon:"laser"` in the next obs = miss).
- **The 5 s memory is real and carries live state** [S, new]: mech 10 left the stream mech's model-computed view twice
  and vanished from `obs.mechs` 5.1 s and 4.9 s after its last model-visible frame; while remembered its `hp` kept
  changing (1242.5 -> 1197.5) and `charging` showed its laser charge. Our `world.js` sight model (canopy chord
  limit 3.96 m) reproduces the server's vision well enough to predict both expiries to 0.1 s.
- **`crate` sound = a crate broke at its own position** [S, new]: 2 of 2 crate sounds matched remembered crates
  (bearing error -8.6 deg and -4.1 deg, distance class right); the cube of the first one still lay at the exact crate
  position 22.6 s later.
- **Drops rest on the surface** [R, new]: 87/87 cubes and 22/22 dropped weapons lie on the surface under the drop
  point (|dz| <= 0.01 m). Crate cube exactly at the crate position; crate weapon 0.1-3.9 m away; drone cubes 1.0-4.7 m
  around the drone; death cubes up to 5.0 m around the corpse; death weapons 0.26-4.0 m.

---

## 1. Hit detection

**Body.** Vertical cylinder, radius 2.5·s, height 9·s, s = 1 + 0.05·cubes, no cap [P][C]; centre z+4.5·s, eye 8·s,
muzzle 7·s, mortar tube 9·s+0.5. No location damage anywhere in the rules: head / top hits deal the same as body hits.
The only directional multiplier is rear ×1.5 (hit from outside the 180° front arc of the *torso* yaw, judged by where
the shot came from: bullet path, beam origin, blast point) [P][R ×1.5 exact]. NPC: r 1.8, h 3.5; crate r 1.4, h 2.4 [C].
At 10 cubes a mech is r 3.75 m, h 13.5 m, eye 12 m; at 16 cubes r 4.5 m.

**Gun.** Sphere of radius 0.3 (`projectile.gun_radius`) against the cylinder: hits pass within 2.80 m of the axis,
unblocked misses start at 2.82 m [R]. 252 m/s straight line, no drop, no inheritance of shooter velocity, gone after
`range` 230 m [S 252.00 m/s; R]. Spread Gaussian 0.6° per axis (yaw and pitch) [R sd 0.65/0.61]. Perfect aim on a
standing mech: hit 99% at 100 m, 92% at 150 m, 82% at 200 m, 76% at 230 m. On a crate (hit r 1.7, ±1.5 m vertical):
99% at 56 m, 76% at 100 m, 48% at 150 m. On a drone (r 2.1): 91% at 100 m, 66% at 150 m.

**Laser.** Hitscan ray, no beam width: the four laser hits in the stream ended 2.38-2.70 m from our axis (radius 2.5
plus one tick of motion) at z+4.75..4.89 [S]. Range 280 m, `pierce` 0: it stops at the first target it meets, which
the sim (and the lightning rule's target list) treats as mech, NPC or crate [P/I]. Path starts at the muzzle point
3 m out at 7 m [S: start 7.00 m high, 2.7-3.1 m out]. **Lightning**: nearest target (mech, NPC *or crate*) within
45 m and 30° of the aim yaw with a line, chains 14 m ×0.7 [P].

**What blocks shots.** Buildings, bridges (underside), terrain: exactly where they are [P]. Trees, trunks and canopy do
NOT stop shots (they block sight only) [P]. Bodies in the path (mechs, drones, crates) take the hit [P/I].

**Muzzle point and "barrel in a wall".** Every gun/laser shot starts on the body axis at muzzle height and is pushed
r·s+0.5 = 3.0 m along the actual aim; if a wall is closer than that the shot starts at the wall and dies there [P; sim
implements it]. Eye (8 m) and muzzle (7 m) are both on the axis, so you cannot shoot round a corner with a sliver of
body exposed: the axis must clear the corner, i.e. at least half the body (2.5 m) is out when you can shoot.

Exploits:
- **Hull-down cover [I].** House bots aim at the body centre (bullet passes z+4.5 ±1.15 m [R]) and fire whenever *some*
  part of the target is in line (99.6% "clear muzzle line to some part"; 6.8% of their bullets hit geometry [R]).
  Cover whose top is 5.0-6.5·s m above our feet and more than 3 m in front of us hides our centre but not our
  muzzle (7 m): we shoot over it, their centre-aimed bullets and beams hit the wall. Rule: prefer firing positions
  with a wall of that height 3-15 m in front, toward the threat.
- **Aim high when only the top is visible** (R3, the right reason): vision needs a line to the centre *or the top*, so
  a target is often listed with only its top clear. Aim at the highest point with a clear line (0.8-0.95 of h), fall
  back down; there is no damage reason to prefer the head.
- **Never fire with a wall inside 3 m of the barrel** (check the 3 m segment from the axis at 7·s m along the aim before
  every shot; a wasted laser costs 1.65 s).
- **Use crates and drones as shields / avoid them as blockers**: a beam aimed past a crate within ~1.4 m of the line
  hits the crate (one full beam = 315 > 300: it breaks it and wastes the shot on a cube for whoever stands there).
- Long gun duels: spread alone costs 8% at 150 m and 24% at 230 m before any target motion; the laser has no spread.

## 2. Timing

**Decision latency.** Obs of tick N (even) is answered; the action holds for ticks N+1 and N+2; its effect first shows
in obs N+2 [P; R: all 1118 fire events and 40 charge starts on odd ticks]. One-shot parts (jump, take, drop, pick,
reload) act on the first tick only; `fire` is held on both ticks [P]. So: reaction >= 0.1 s, and a shot ordered on
obs N leaves at tick N+1 from where we stand then, at the target's position one tick (0.05 s) after the obs.

**Cooldown edge inside the 0.1 s window.** After a gun shot the read-outs are 0.19, 0.09, 0 on the next three
observations [S]: the gun is ready 5 ticks after a shot. A bot that fires only when it *sees* 0 shoots every 6 ticks
(0.30 s, what both house-bot data sets show [S][R]); holding the trigger whenever the read-out is <= 0.10 fires on the
ready tick (5 ticks = 0.25 s, or the exact 0.24 s average if the server carries the remainder, which "held down,
exactly that rate" suggests [P]): **+20-25% gun DPS** (150 -> 180-188 burst). Magazine: the reload starts on the
tick of the 12th shot (read-out 2.35 one tick later), lasts 2.4 s; sustained gun DPS 93 (obs-gated) vs 100-107 (held).

**Laser.** Hold to charge, `charge` 0.75 s (15 ticks), let go to fire; released before 0.15 s it fires as soon as
0.15 s is in; a full charge held 2 s more fires on its own [P]. Damage 315·(0.35+0.65·c/0.75); cooldown 1.65 s from the
release. House laser cycle in the stream: charge first seen, beam 16 ticks later (released on the obs showing full),
beam-to-beam 54 ticks (2.7 s) [S]. DPS by released charge (incl. 1.65 s cooldown + 0.05 s): 0.15 s -> 82,
0.45 s -> 108, 0.75 s -> 129: always charge fully unless the partial shot kills. Torso turns freely while charging
(`charge_turn_mult` 1) and legs run at half speed (5.85 walk / 9.75 boost) [P][C]. Everyone who sees us sees
`charging:true` and our aim; `laser_charge` sound once at the start, heard within 140 m [S: heard at 97 and 116 m,
not at 150-151 m]; `laser` sound at the release, 380 m.

**Gun while charging.** Each slot has its own trigger and cooldown; nothing in [P] forbids `fire:[true,true]`. House
bots never do it (0 gun shots in 26 s of charging over 40 charges [R]); the sim allows it. Unverified on the server.

**Equip after take:** the new weapon cannot fire for max(1 s, its cooldown): laser 1.65 s, mortar 2.6 s, lightning /
gun 1 s [P]; first laser beam therefore >= 2.4 s after the take. A dropped gun keeps ammo and reload state.

**HP regeneration:** 45/s after 5 s without dealing or taking damage, never outside the zone [P][C]. Current build: our
regen started exactly 5.0 s after our last hit *dealt* on a mech (13.5 -> 18.55 s) and stopped on the tick we hit
again (one 2.25 HP tick) [S]. Drone hits reset it (0 regen frames in 50) [R]. Crate hits did not reset it on the
old build (150 of 158 frames regenerated) [R]; on the current build unverified (crate hits are reported in `hit`
events only since 2026-11-16 [P]). Misses never reset it (no damage dealt). Zone damage resets it [P].
**Energy:** +18/s from 0.6 s after the last spend (stream: flat for 0.6 s after the boost, then +1.8 per obs) [S].

Exploits:
- **Hold triggers early**: gun `fire` when read-out <= 0.10 and the aim is converged; laser `fire` when its cooldown
  <= 0.10 so the charge starts on the ready tick; release on the obs that shows charge >= 0.70 (fires next tick).
- **Gun during the laser charge** (lead aim for the first ~0.6 s, swing to the direct bearing for the last decision,
  0.2 rad/tick of slew is plenty): +3 bullets (+135 damage) per 2.4 s laser cycle, about +55 DPS averaged, if the server allows it. Make
  it self-verifying: if `ammo` falls during a charge it works; if not, stop trying (no cost).
- **Regen discipline**: gun misses are free; a single hit on a mech or drone costs 5 s of regen (up to 225 HP). Never
  tag a drone or a passing mech while healing; crates probably safe (old-build rule) but treat as unknown.
- **Punish laser cooldowns**: a house laser fires 16 ticks after its charge appears and is then dead for 1.65 s +
  0.75 s: that 2.4 s window is the time to peek and trade.
- Grab a laser mid-fight only if we can survive 2.4 s before its first beam.

## 3. Vision, memory and sound

**Sight** [P][C]: eye at z+8·s has a line to the object's centre or top, and either (a) within 45 m in any direction,
buildings / terrain / trunks block, canopy does not; or (b) within 200 m inside ±60° of the torso yaw (pitch
irrelevant), no building in the way, and canopy transmittance exp(-0.35·chord) >= 0.25, i.e. **less than 3.96 m of
crown on the line** [world.json rules; W lineOfSight; bot/lib/world.js identical]. Crowns are ellipsoids (horizontal
radius crownR, median 3.3 m, max 14 m), trunks cylinders r 0.2-0.7 m up to mid-crown [W]. `sensors` +15 m / +25 m.
**Memory**: a mech or drone seen once stays listed with its *real, live* position, velocity, aim, hp and charging for
5 s after the last true sighting [S, 2/2 expiries at 4.9 / 5.1 s]. No "remembered" flag: compute it ourselves.
Crates, cubes, pickups and projectiles are listed only while seen.
**Sound** [P][C][S]: own sounds never reported; bearing σ 7° (3.5° with sensors); near < 60, mid < 160, far beyond.
Ranges: step 40 (only when grounded and > 5 m/s, every 0.6 s), boost 90, jet 90, reload 60, gun 320, laser 380,
laser_charge 140 (once, at the start), lightning 160, mortar 420, explosion 420, crate 220 (crate destroyed), npc_gun
200, death 600 (**mechs only**: 3/3 death sounds coincided with `alive` dropping; drone deaths are silent [S]),
drop 600 (a supply drop landing).
**House bots** use the same server senses (their aim and fire match our obs exactly [S]); torso sweep ±46° with a 4.8 s
period while walking, rear 60° in view 1-3% of the time [R]; they keep shooting a *remembered* target through foliage
(the stream mech hit mech 10 while canopy hid it) [S]; the practice squad shares vision (track page; sim models it).

Exploits:
- **Breaking contact takes > 5 s out of every enemy's sight**, not one tick: for 5 s they know our true position and
  shoot through trees at it. Cover must be solid (building / terrain) and held for > 5 s before a reposition is secret.
- **Our 5 s of their live state**: pre-aim the laser at the edge where a remembered enemy will reappear; fire the gun
  through canopy at a remembered target (shots pass trees); watch a remembered enemy's `charging` and `aim`.
- **Silent approach**: commanded speed <= 0.42 (5 m/s) is silent; walking at 11.7 m/s is heard only within 40 m,
  boosting / jetting within 90 m. For a steal or ambush, walk (not boost) until 90 m, and go silent inside 40 m.
- **Telegraph-free laser**: from 141-200 m and outside the target's ±60° wedge, the charge is neither heard (140 m) nor
  seen; a rear beam is 472 damage. Within 45 m only buildings hide anything.
- **Dense canopy hides us beyond 45 m** (>= 4 m of crown on their line) but they still know where we are for 5 s if they
  saw us; within 45 m canopy hides nothing.
- **Sound intel**: `death` (600 m) = loot pile; `crate` (220 m) = a cube at a crate we know; `npc_gun` (200 m) = a drone
  in a fight; `laser_charge` within 140 m = beam in 0.8 s; `reload` within 60 m = an enemy's gun dead for 2.4 s.

## 4. Loot, and the stealing recipe (R1)

**Facts.**
- Crates: 36, 300 HP, a quarter on roofs; drop 1 cube exactly at the crate position (16/16 [R]) and with p 0.5 a
  weapon 0.1-3.9 m away (7/7) [C][R]. `obs.crates[].hp` is listed while the crate is seen [P]; whether it falls for
  other shooters' hits could not be observed (no crate was damaged in view in the stream), the sim makes it live.
  A full laser one-shots a crate; house bots do this too (stream, 13.4 s: mech 10's `laser` sound and the break of
  crate 1019, 22.6 m in front of it, in the same observation; the cube still lay there 22.6 s later).
- Cube pickup: automatic, the closest mech within 3.5 m horizontally and 4 m vertically, ties to the lower id [P].
  Measured pickups happen at 2.76-3.50 m, possibly on the very tick of the break (spawn -> pickup 0 ticks [R]).
- Drones: 350 HP, 2 cubes scattered 1.0-4.7 m around the death point [R]. hp visible in `obs.mechs` [P].
- Mech deaths: all cubes + `death_drop_extra` (2 now; +1 measured on the old build) scattered up to 5.0 m, plus every
  non-gun weapon 0.3-4.0 m, all on the surface under the corpse even after an airborne death [R].
- Who collects [R]: crate cubes 88% (by the shooter, median 3.3 s, from 4-147 m away), drone cubes 89% (median 5.1 s),
  **death cubes 34%** (35/53 never collected; those that were took a median 12.3 s). 4 of 7 crate weapons and 8 of 10
  death weapons were never taken (one more crate weapon only after 99.8 s).
- Weapons: `take` within 4 m horizontal, 4 m vertical; same-tick contest -> the closer mech; never despawn [P].
- Supply drops [P][C][R]: called at 70/140/210 s, land 25 s later (state visible to all from the call) inside 0.7 of
  the next circle (measured 0.38 and 0.32 of it); ring 8 m; alone for 4 s -> +3 cubes, HP and energy to full; two in the
  ring freeze the clock, a different sole occupant restarts it, an empty ring resets it. House holders walk to 2.5 m
  from the centre and stand still 4 s (regen kept running during the capture [R]). `holder` and `progress` are known
  to everyone even when the holder is unseen.

**What tells us a crate or drone is about to break.** (i) its `hp` in view (hp/45 gun hits left; house cadence 0.30 s,
so a crate at 255 is ~1.8 s from breaking, at 90 ~0.6 s); (ii) enemy bullets in `obs.projectiles` whose line passes
within 1.7 m of a crate's axis (2.1 m for a drone) and points at it, back-traced to the shooter (pos - vel·t); (iii)
a beam whose path ends within ~1.5 m of a crate or drone; (iv) `gun` sounds near / mid on the crate's bearing; (v) for
drones, their `aim` points at their attacker and `npc_gun` sounds mean a fight; (vi) after the fact, the `crate`
sound on the bearing of a crate we remember (cube at its exact position) and a `death` sound (corpse pile).

**Stealing recipe.**
1. Keep a map of every crate seen (id, pos, last hp, time) and every death / drone death heard or seen.
2. *Crate being shot*: if hp is falling without our hits and its time-to-break T <= (our path time to it) + 0.2 s, and
   the shooter is >= 15 m from the crate, move from cover so that we arrive just before the break: stand ON the crate
   position or within 2 m of it (cube at the exact position; the weapon lands <= 3.9 m away, inside our 4 m take
   radius from the centre). Approach on the far side from the shooter's line of fire (its misses pass the crate) and
   outside its wedge as long as possible; walk, do not boost, inside 90 m. The cube is ours on the break tick; on the
   next decision `take` the new pickup id that appears near the crate (closer mech wins a same-tick take); leave.
   From a first hit seen (hp 255) we can reach a crate up to about 30 m away by boosting (1.8 s); the house shooter
   needs about 2.5 s to walk in after the break (3.3 s median on the old build, scaled by 9/11.7).
3. *Crate break heard* (`crate` sound, bearing within 3σ = 21° of a remembered crate, distance class consistent): the
   cube is at that crate's position; go if our path time is shorter than any known mech's and the route is safe.
4. *Drone being shot*: wait outside 45 m or out of its line (it shoots any mech within 45 m with a line while it is
   within 30 m of home, and whoever hits it); rush when its hp <= 100 (2 house gun hits); cubes land up to 4.7 m round
   it, so end the rush on the drone's position.
5. *Kill drops (FFA)*: on a death sound / an `alive` drop with the corpse remembered, compare our path time with the
   survivor's; if ours is shorter and no other mech has a line to the pile, take the cubes (walk a 5 m circle) and any
   laser; else third-party the survivor, who is now damaged and not regenerating for 5 s (playbook M5).
6. *Abandoned piles*: 66% of house-bot death cubes stay on the ground; keep their positions for the whole match.
7. *Supply drops*: never be the second mech in a ring under fire; a drop with `holder` null after landing that we reach
   first is ours; a house holder is a stationary target with a known position for up to 4 s (lasers, rear shots).
Gates (unchanged): full hp or near it, no threat with a line of fire, zone margin, D6 timing.

Exploits: everything in the recipe; plus the **laser one-shot on crates** (315 >= 300: no 2 s of gun fire, one
`crate` sound) and on **drones once laser damage >= 350** (3 cubes or one `laser_damage`).

## 5. Movement

[C], verified on the old build [R] (speeds and accelerations ×1.3 now, ratios unchanged):
- Ground accel 58.5 m/s²: 0 -> walk 11.7 m/s in 0.20 s, -> boost 19.5 m/s in 0.33 s. Stopping distance 1.17 m (walk),
  3.25 m (boost). Strafe reversal 0.40 s (walk), 0.67 s (boost).
- Air accel 12 m/s²: a full horizontal reversal in the air takes ~2 s; airborne mechs are ballistic and were hit
  *more* often than grounded ones at every flight time up to 0.8 s [R].
- Jump 11 m/s (apex 2.5-2.75 m, 1.0 s); jet +34 m/s² against 22 gravity, climb capped at 10 m/s (8.9 measured), 15
  energy/s: 100 energy is about 6.7 s of jet, about 60 m of climb. House hop: jump + 1.5 s jet = 14.9 m apex, 3.1 s,
  22.5 energy [S][R]. Boost drains 17/s on the ground.
- Step-up 1.2 m (`world.json` says 1.5 for the viewer only), slopes over 50° unwalkable, map edge a wall [P][C].
- Laser charging: half speed. Concussion: up to 16 m/s horizontal + 9 m/s up, minus 45 energy, scaled by falloff
  [P][R 17 events]. Overlapping mechs are pushed apart [P]; nothing says crates block movement.
- Lockstep latency means a velocity change ordered at obs N starts at tick N+1.

Exploits:
- **Reverse, don't jump**: against the house predictor (first-order lead, no noise) a reversal during the bullet's
  flight drops their hit rate from 84% to 22% at >= 0.3 s of flight (>= 75 m); our walk reversal takes 0.40 s, so
  reverse every 0.4-0.6 s at 100-200 m. Under 75 m nothing dodges a gun.
- Never hop in a gun duel at range; hop only to break a line or climb.
- Approach targets at walk speed when stealth matters: boost buys 7.8 m/s at the cost of a 90 m sound radius and 17
  energy/s.

## 6. Zone

[C][P][R]: circle 560 m at (41.3, -72.8). Phases (hold, shrink, radius, dps): (60, 50, 380, 20), (45, 40, 240, 35),
(35, 35, 140, 60), (30, 30, 70, 100), (25, 25, 25, 160), (15, 25, 0, 260). Timeline: shrink 60-110, 155-195, 230-265,
295-325, 350-375, 390-415 s. The dps of a phase applies from its hold through its shrink and switches at the end of
the shrink (35/s seen 178-195 s, 60/s after 195 s [R]). Outside: dps per s, no armour, no regen, and it restarts the
5 s regen timer when you step back in. Next circle always inside the current one, known in advance (`next_center`).
**Final collapse**: the last circle shrinks 25 -> 0 m from 390 to 415 s (radius = 415 - t m) around `next_center`;
after 415 s everybody is outside at 260 HP/s (13 per tick) and the match ends by about 427 s at the latest (2981 HP,
the theoretical maximum of 1400 ×1.4 cubes ×1.52 plating, lasts 11.5 s). Same-tick deaths share a placement. The 480 s
clock never matters in practice.

Exploits:
- **Late-game HP is placement**: at 415 s the order of death is the order of current HP; armour does not count, max HP
  (cubes to 10, `plating`) does. Arrive at the final centre at full HP (5 s without damage inside the circle).
- Stand on `next_center` from 390 s: you stay inside until r < 2.5 m (412.5 s) even when another mech pushes you.
- The edge is empty of house bots (7% of their time in the outer fifth [R]); they enter the next circle 33-58 s before
  the shrink starts. Rotating late along the edge avoids them.

## 7. Upgrades and offers

Thresholds at 1, 3, 6, 10, 15, 21, 28, 36, 45 cubes; 3 distinct choices, weapon upgrades only for weapons held when the
offer is drawn; offers queue; choice 0 after 5 s [P][C]. With gun + laser the pool is 9 mech + 4 gun + 3 laser = 16
ids, so a given id appears in an offer with p = 3/16 (if uniform).

| id | effect [C] | value for our laser-kite play (arithmetic) |
|---|---|---|
| laser_damage (×3) | laser ×1.18 | 315 -> 372: a fresh 1400 HP mech dies to **4 beams instead of 5**; one-shots drones (372 >= 350); +18% laser DPS (129 -> 152) |
| plating (×3) | max HP ×1.15 (heals) | +15% effective HP, the only defence that also counts against the zone; best defensive pick |
| gun_mag (×2) | +8 rounds, reload ×0.8 | 20 rounds, 1.92 s: sustained gun DPS +29% (105 -> 135, trigger held) |
| gun_velocity (×2) | speed ×1.25, range ×1.15 | flight time at 126 m 0.50 -> 0.40 s; house-style hit rate on strafers 32-57% -> 57-86%; range 265 m |
| gun_damage (×3) | gun ×1.15 | +15% gun DPS; crates in 6 bullets instead of 7 |
| nanites (×2) | regen ×1.6, delay -1.5 s | 72 HP/s after 3.5 s: 1000 HP back in 17.4 s instead of 27.2 s |
| armor (×3) | -8% damage taken | +8.7% effective HP (first stack), weapons only: worse than plating |
| laser_charge (×2) | charge ×0.75 | cycle 2.45 -> 2.26 s (+8% DPS), 0.19 s less telegraph and half-speed time |
| gyros (×2) | turn ×1.3 | 180° in 0.60 s instead of 0.79 s: better rear scans (R2) |
| sensors (×2) | +15 m near, +25 m vision, bearing noise ×0.5 | 60 m all-round / 225 m wedge / 3.5° bearings: steals and scans |
| servos (×3) | speed ×1.08 | 12.6 / 21.1 m/s |
| gun_rate (×3) | gun cooldown ×0.87 | 0.209 s: if the server quantises to ticks without carry, the first stack changes nothing (still 5 ticks) and only the second does (4 ticks); with carry +15% each |
| reactor / capacitor / jets | energy | only for jet-heavy play |
| laser_pierce (×1) | beam through one more target | through a crate or a second mech; niche |
| mortar_* / lightning_* | only if held | - |

Order for our play: **laser_damage > plating > gun_mag > gun_velocity > gun_damage > nanites > laser_charge > armor >
sensors > gyros > servos > gun_rate > rest**; in the last two zone phases plating moves to first (HP is placement).
Exploits: always answer an offer (choice 0 is random); hold the laser when a threshold is near so laser upgrades can
be drawn; cubes above 10 add nothing but size (a bigger target, eye higher) and offers at 15 and 21; supply-drop
cubes can cross two thresholds at once (queued offers). Loadout option: dropping the gun allows laser + lightning
(lightning 60 per 0.25 s = 240 DPS inside 45 m, 3 energy per zap, cancels enemy laser charges for 2 s): worth testing
for the final circles only.

---

## 8. Simulator fidelity (sim/ as of 07:46, read only)

Rule by rule. "OK" = matches the evidence; "GAP" = differs, with the likely effect on simulated scores; "ASSUMED" =
the sim chose a reading the data cannot confirm.

1. Lockstep, one-shot parts on the first tick, fire held two ticks, answer applies at N+1 - **OK** (matches R parity
   and S cooldown read-outs).
2. Gun: 0.3 m radius vs cylinder, spread, range, no gravity, 3 m barrel, wall-in-barrel kills the shot - **OK**.
   Held trigger carries the sub-tick remainder (0.24 s exact) - **ASSUMED** (protocol wording supports it).
3. Laser: ray vs cylinder without width, charge counts the first held tick, fires on the release tick after adding
   that tick's charge, auto-release, pierce, cook-off, crates block - **OK / ASSUMED** (stream hits consistent).
4. **GAP: gun firing during a laser charge.** The sim lets both triggers act; its house stand-ins do it (gunOk stays
   true while charging), real house bots never do (0 shots in 26 s of charge). Effect: sim house bots that carry a
   laser fire ~2.7 extra gun shots per 2.7 s laser cycle (up to +120 damage per cycle, +20-45 DPS averaged): the sim is pessimistic for us; and if our
   bot uses dual fire and the server ignores it, the sim overstates our DPS. Fix: house stand-ins hold the gun while
   charging; treat dual fire as unverified.
5. **GAP: death drops float.** `_spawnCube` puts a cube at max(surface, z-3) and `_spawnPickup` at the corpse's feet z.
   In 3 FFA house matches (seeds 1-3) 71 of 153 death cubes were > 0.5 m and **55 (36%) > 4 m above the surface
   (unreachable from the ground)**, and 9 of 22 death weapons > 4 m; real: 0 of 87 cubes, 0 of 22 weapons. Effect:
   the sim under-rewards kills and kill-looting (R1b/c), under-feeds house bots' cube growth and upgrades, and any
   steal tactic tested in the sim looks worse than it is. Fix: drop onto `surfaceZ(x, y, z + 1)`.
6. **GAP: drop scatter.** Sim: death and drone cubes 1.2-2.5 m from the centre, crate weapon at the crate centre,
   death weapon at the corpse; real: death cubes up to 5.0 m, drone cubes 1.0-4.7 m, crate weapon 0.1-3.9 m, death
   weapons 0.3-4.0 m. Effect: small; steal positions tuned in the sim are too tight (cubes at 4-5 m need a second step).
7. Cube pickup closest within 3.5 m / 4 m vertical, ties to the lower id; take within 4 m, closer mech wins - **OK**.
8. Crate cube exactly at the crate; `crate` sound on a break; `death` sound for mechs only; drone deaths silent - **OK**.
9. Vision: 45 m circle without canopy, 120° / 200 m wedge with the 3.96 m crown-chord limit, centre or top, 5 s memory
   with live hp / aim / charging, own beams and projectiles omitted - **OK** (memory expiries reproduced to 0.1 s on
   the stream; canopy model identical to the client's). Distances are 3-D feet-to-feet in the sim - **ASSUMED**.
10. Regen: 5 s after dealing (mechs, drones) or taking damage, crates excluded, misses free, zone resets - **OK for
    mechs (S) and drones (R); crates ASSUMED from the old build**. If the current server counts crate hits, sim
    farming-while-healing is optimistic.
11. Sounds: 14 kinds, ranges, noise, classes, laser_charge once, step only when grounded > 5 m/s - **OK**; no wall
    muffling - ASSUMED.
12. Zone schedule, dps switch at the end of the shrink, 2-D centre test, no regen outside - **OK**.
13. Supply drops: placement inside 0.7 of the next circle, ring 8 m (6 m vertical in the sim), freeze / restart /
    reset, +3 cubes, full HP and energy - **OK**; vertical tolerance ASSUMED.
14. Drones: wander at 3 m/s, chase at 5 only when they lose their line, 150 m bullet range - **ASSUMED** (replay drones
    never left 30 m of home; bullet range unknown).
15. Movement constants, jet cap (8.9 m/s, 14.9 m hop), step-up, slopes, push-apart - **OK** by the README's tests;
    crates not solid - ASSUMED.
16. House stand-ins: gun cadence obs-gated (0.30 s) - OK; laser released on the obs showing >= 0.70 (15-tick charges
    vs the real 16) - negligible; hit rate at 80-130 m 43% vs 29% real (README) - **GAP, pessimistic for kiting**.
17. Same-tick deaths share the *best* place - ASSUMED (no case in any data).

Biggest five for simulated scores: (5) floating death drops, (4) house dual fire during laser charges, (16) house
over-accuracy at 80-130 m, (10) unknown crate-regen rule on the current build, (6) drop scatter radii.
