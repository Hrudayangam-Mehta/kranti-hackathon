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

