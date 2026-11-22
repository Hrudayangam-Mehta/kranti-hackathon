# >>> AMENDMENT V3 (team lead, 05:30 UTC) — MEASURED EVIDENCE OVERRIDES THE TEXT BELOW <<<

Other teams published logs of one-change-at-a-time submissions to the OFFICIAL scorer (same 48 seeds every
time). Those measurements beat our panel's theory wherever they conflict. Everything in this amendment wins
over sections 0-8 below; sections not touched here stay valid (fire-control maths, movement machinery, zone,
position evaluation engine, engineering rules). All numbers stay in `PARAMS`.

**E1. Outcome structure.** Practice results per match are bimodal: 0-2 points (we die to the first
hunters) or 15 (we snowball and outlive all 15 house bots). The mean is about 15 x P(outright win); the top
score 5.58 is roughly a 35% win rate. Design goal: raise the win rate = survive the first two minutes while
building an economy (cubes, laser, upgrades), then kill everything and stand on the final circle centre.

**E2. Measured losers in practice (SQUAD). Do not ship these as SQUAD defaults:**
hide and hold fire (-0.5); standing still to regenerate while unseen (-0.44); quiet walking (-0.2);
long-range duelling at 130 m gun / 160 m laser with backpedalling (-0.77); long-range loadout stack (-0.46);
holding behind cover (-0.15); rooftop camping (-0.37); "combined caution" (-0.6); faster strafe reversals
(-0.7 in one test). Consequences for SQUAD:
- Stand-off (replaces section 3 "Stand-off"): gun only 75 m (dead band 60-95); holding a laser 110 m (95-125);
  holding lightning: close to 28 m, boosting in from 45-90 m when energy > 70; against a lightning holder
  when we have none: stay >= 65 m. Approach at full stick, back off at 0.7 stick, always strafing.
- Jink: reversal interval U(0.35, 1.05) s. Not faster.
- HEAL in SQUAD (replaces section 4 "Heal discipline" for SQUAD; the patient version stays for FFA):
  break the line of fire only when LOSING = not finishing (finish = target < 20% hp and <= 2 threats) and
  one of: hp < 35% and the target's hp fraction >= ours + 0.1; 2+ threats and hp < 55%; 3+ threats and
  hp < 80%. Then boost to the best hide cell within 50 m while still shooting when aligned. Out of sight:
  do NOT stand still and do NOT walk quietly; keep moving at full speed collecting cubes / pickups inside
  the zone on routes hidden from the last known threats; do not shoot crates or drones while hp < 50%
  (dealing damage resets regen). Re-engage at hp >= 60% or as soon as a mech has a line of fire and we are
  not LOSING. Never retreat from a finish.
- Peek/hide cycles and corner ambush (layer 6) are FFA-stance tools; in SQUAD use cover only when LOSING
  and to isolate (prefer cells seen by the target but not by other threats, when equal otherwise).
- No rooftops.

**E3. Measured winners (ship all):**
- Prefer targets the current burst can finish: a target whose hp <= damage of (remaining magazine x hit
  rate + a ready laser) gets a large bonus (+0.39 measured).
- Engage mechs that shot at us / aim at us / are within 150 m; do not walk across the map to poke a far
  mech that ignores us (+0.23). A mech that hit us in the last 3 s and the current target get strong bonuses.
- Mid-fight economy (the change behind a 5.19 bot): remember cubes 40 s; during a fight detour to the
  nearest remembered cube within 70 m (hp > 50%), 40 m (hp lower), 12 m (LOSING), and to a wanted weapon
  within 60 m (gun only) or 35 m. Kill cubes: when the target is under 38% hp, we are over 42% and <= 2
  threats, close to 14 m (boost if energy > 65) so its drop is ours at once (50 m if it holds lightning and
  we do not).
- Supply drops: go when within 220-300 m, not held by another mech, reachable by landing time + 3 s and
  inside the next circle; stand still inside ring radius - 3 m. They give +3 cubes and full hp.
- Execution: (a) the gun cooldown can end inside the 0.1 s decision window, so keep `fire` true whenever
  the aim gate passes and `cooldown <= 0.1` (holding the trigger fires at exactly the weapon's rate; waiting
  for `cooldown == 0` in the observation loses about 20% of gun dps); (b) aim point with a clear line:
  try body centre, then +2 m, then +3.6 m (scaled by size): the first with `shotClear` (terrain often hides
  the lower body); (c) hand the torso from the gun lead to the direct laser aim when the charge passes 80%.

**E4. Loadout (replaces section 5 "Weapons").** The laser is the key weapon (hitscan, no lead; 72-85% of
the damage of the bots that won real free-for-all showdowns; 3 s burst: laser ~430, lightning ~350,
mortar ~160, gun ~120). Values: laser 3.2, lightning 2.5, gun 1.5, mortar 0.5. An empty slot takes laser or
lightning at once, a mortar only if nothing else has been seen for 60 s. Target loadout: laser + lightning
(drop the gun for the second of the two when `PARAMS.dropGunForPair` is true, default true); otherwise
gun + laser. Never swap a charging laser. Seek a laser / lightning pickup actively when gun-only (remembered
pickups up to 240 m when no threat is on us).

**E5. Upgrades (replaces the priority in section 5).** plating > armor > nanites > laser_damage (when we
hold a laser, take it every time it is offered) > laser_charge > lightning_efficiency (when holding
lightning) > gun_damage > gun_rate > lightning_range > lightning_chain > gyros > servos > gun_mag >
capacitor > reactor > jets > gun_velocity > sensors > mortar_* > laser_pierce.

**E6. Economy is the engine.** Showdown winners held 24-34 cubes, took 6-7 upgrades and all three supply
drops. Until first contact, and whenever no mech is tracked: roam at FULL speed (boost only if energy > 60
and no lightning held) along the best loot route inside the next circle: wanted weapons, cubes, ground
crates (shoot from <= 30 m, then walk onto the cube), drones when hp > 60% and no mech tracked for 6 s
(approach to 38 m, stand and shoot; leave to 75 m when hp < 50%). Skip loot more than 2 m above the terrain
(roofs). Stop shooting crates / drones in the last two zone phases.

**E7. Endgame.** From the phase where next_radius <= 70: converge on the next centre; in the final shrink
stand exactly on the moving centre (every metre off costs 260 hp/s-equivalent) and keep fighting from there.

**E8. FFA latch (replaces playbook B thresholds).** FFA when `(16 - alive) - ourKills >= 3`, or two beams
(laser / lightning) by another mech ending within 6 m of a third mech and not within 20 m of us. Default
SQUAD. In FFA the measured picture reverses: calm, well-cubed bots lasted (standing 74% of the time: average
place 4.8), aggressive boosters died first (41% boosting: 36 s life, average 12th). FFA stance therefore:
no shooting crates / drones while a mech was tracked within 6 s and 200 m, patient heal, cover when a laser
charges at us, hold cover inside the next circle when <= 6 alive, third-party rules from the playbook.

**E9. Simulators do not rank tactics.** Three teams measured that their local simulators predicted gains
for changes that lost 0.46-0.77 on the real scorer; real house bots hunt a passive bot less aggressively
than simulators assume. Use the simulator only for crashes, stuck states, timing and gross sanity
(does it fight, loot, stay in the zone, win at all). Doctrine comes from real-scorer evidence.

**E10. Noise.** Identical code gives an identical score; any behaviour change re-rolls the matches;
differences under about 0.2 are noise.

# >>> END OF AMENDMENT V3 <<<

