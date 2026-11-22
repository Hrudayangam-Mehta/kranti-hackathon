# Purchase / upgrade / pickup meta (spec, one author, arithmetic only, nothing here is measured)

Exchange rate (q4_econ): 1 kill = 390 hp-eq; 1% damage for a whole life = 20 hp-eq; mean life 95 s, 5.1 kills.
Offers: 3 random ids from those eligible (13 gun-only, 16 with a laser). P(a survival id is on offer) = 58%.

## 1. Why the phased plan (UPG_1211, 252 vs 263) lost
| Phase rule | Offer it changed | Took | Refused | Cost (hp-eq) |
|---|---|---|---|---|
| kills 0 and t < 75: weapon buffs first | 1 cube, often 3 cubes | gun_rate (0-60; 0.209 s on 0.05 s ticks, reload-bound) or gun_damage (96) | plating 300 (+210 healed now) | -200 to -300 |
| middle: plating, nanites, armor | 3 / 6 cubes | nanites (FNV never leaves a fight: no zero-line lulls) | armor 200 | -80 to -115 |
| kills >= 3 or t >= 150: weapon items first | 6 / 10 cubes, i.e. the kill-pile offers at peak intake | laser_pierce (~0), laser_charge (29) | plating 250 (stack 2 = +241 x cube factor), armor 120 | -120 to -250 |
A conflict (a survival id and a preferred weapon id in the same offer) occurs in about 36% of offers, so the
expected loss is about 150-250 hp-eq per life = 0.4-0.6 kill by arithmetic; measured -0.23 kill per match (one draw).
Cause: hp converts at 390 per kill, damage at 1,400 per kill; the plan bought damage while cheap and hp when dead.

## 2. Corrected plan: one order, three overrides (no time phases)
Base: plating, armor, nanites, laser_damage, gun_damage, gun_mag, laser_charge, lightning_efficiency, servos,
gun_rate, lightning_chain, lightning_range, capacitor, reactor, gyros, jets, mortar_reload, mortar_splash,
mortar_velocity, gun_velocity, sensors, laser_pierce. Not-held weapon ids +60 (mortar +80), as now.
| Decision point | Pick | Reason |
|---|---|---|
| any offer, plating available (stacks < 3) | plating | +210 / +241 / +278 healed at once, x(1 + 0.04 cubes); +15% on later cube heals and drop repair |
| else armor | armor | 8.7 / 9.5 / 10.5% off all later weapon intake; nothing instant, so worth most early |
| else nanites, SQUAD | below laser_damage and gun_damage | pays only in zero-line lulls, which never-leave does not have |
| else nanites, FFA or hp < 40% with 0 lines | third, as now | 45 -> 72 hp/s, delay 5 -> 3.5 s |
| laser held, cubes <= 6, lens stacks 0 | laser_damage above armor only when t < 45 s and kills 0 | 5 beams -> 4 (372 x 4 = 1,488) |
| laser held, lens 1, cubes >= 3 | laser_damage above nanites | 439 x 1.12 = 492: 3 beams |
| no laser, kills 0, t < 45 s | gun_damage, gun_mag above nanites (never above plating or armor) | gun is 100% of damage; mag = +30% sustained |
| 15 cubes (rare) | same order | cubes past 10 add size only |
| never | gun_rate before gun_mag; laser_pierce; mortar ids; sensors | |
Code: params.upgradeOrder (replace the non-ids mortar_damage, mortar_rate); upgPhase stays false; overrides in
economy.pick as score offsets. Test per slot, never as a whole table.

## 3. Floor weapons
| Weapon | kills 0 | kills 1-2 | kills 3+ / zone 3-4 |
|---|---|---|---|
| laser (none held) | take; seek on the existing radius (grabLaserR 60; lgGrabR 130 lost) | only within 60 m or on our heading | only within 4 m of our path |
| lightning | take into the empty slot when within 35 m; swap out for a laser | same; fire only under 45 m | keep for house bots that close; never drop the gun in SQUAD |
| mortar | refuse (cook-off +60%, 77 dps) | refuse | refuse; FFA only after 60 s with nothing better seen |

## 4. Power-ups by state
| Item | Go when | Refuse when |
|---|---|---|
| threshold cube (count becomes 1, 3, 6, 10) | value 320: up to 100 m with <= 1 line | 2+ lines beyond 30 m |
| other cube, cubes < 10 | 190: 52 m with one shooter, 30 m with two | cubes >= 10 unless within 2 of 15 |
| kill pile (2 + victim cubes) | path <= min(115, 58 x n / lines) m, abort after 6 s | 3+ lines beyond 25 m |
| crate | idle laser beam, or 7 bullets with 0 lines and hp >= 40% | as an opening plan (farm-first lost 0.38) |
| drone (2 cubes) | hp >= 50%, no mech seen for 4 s, beam + 1 bullet | while regenerating; in any fight |
| supply drop (95 / 165 / 235 s) | landed, missing >= 250 hp, travel <= 8 s, keep shooting in the ring | leaving a winning fight for it before it is tested on one slot |
