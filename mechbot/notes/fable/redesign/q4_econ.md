# Q4 economy questioner: variant spec 'g' (04:15 UTC Sun)

One author, no independent review. Nothing here is measured; all numbers are arithmetic from the rules bible and the
squad-model sim figures. Base build: FNV_s1 (5.38 best, about 5.1 true).

## 1. The exchange rate (how everything is priced)

- Life 95 s, 5.1 kills, 7,140 damage dealt per life. One kill = 1,400 damage dealt = about 390 hp of our own budget
  (coach spec). So 1% damage for a whole life = 71 damage = 0.05 kill = 20 hp-eq; for the remaining fraction f of
  life, 20 x f.
- Time out of contact at kills = 0 costs only the plinker: 11-27 hp/s at 110-150 m (51 inside 75 m). I use 20 hp/s.
  Boosting, that is 1.0 hp per metre. With one shooter inside 75 m: 2.6 hp/m; two or more: 4.6 hp/m.
- Escalation is kill-driven (squad_model section 1), so time before kill 1 is cheap and time after it is not.

## 2. Reward sources in hp-eq

| Source | Pays | hp-eq | Cost | Verdict |
|---|---|---|---|---|
| cube (cubes < 10) | +56 healed, +4% damage, 1/2.5 of an offer | 56 + 80f + 80 = about 190 early, 150 late | walk | the unit |
| threshold cube (count becomes 1, 3, 6, 10) | as above, the whole offer | 56 + 80f + 200 = about 320 | walk | worth 2x the reach of a normal cube |
| cube at 10 or more | no hp, no damage, +5% size, 1/5 of the 15-cube offer | about 40, minus a bigger body | walk | stop farming at 10 |
| crate | 1 cube, 1/6 laser | cube + 25 | 1 idle beam (free) or 7 bullets = 1.7 s | 190 hp-eq per about 8 s at k=0 |
| drone | 2 cubes | about 380 | beam + 1 bullet (360 >= 350); 8 bullets gun-only; takes 10-50 hp; resets regen | best static source, 1.6x a crate's reach |
| corpse | 2 + its cubes (about 3) | 300-450 | it lies at our kill range (150 m = 7.7 s boost toward the next hunter) | only at <= 1 line, see g4 |
| floor laser (none held) | kill time 12.2 s -> about 7 s | about +2 kills = 780 | 16-32 s window; P(ground laser within 200 m) = 72%, within 130 m = 42% | top goal at k=0 only |
| supply drop 1 | full hp + energy + 3 cubes | 1,000-2,000 hp where intake is 235-415 hp/s = +0.5 to +1 kill | 4 s in the ring, half the matches die before 95 s | the largest single item |

Densities: 36 crates + 12 drones over the 560 m circle give a mean nearest crate at 83 m and a crate or drone within
120 m in 89% of spawns. So one cube (the plating offer) before the first hunter is nearly always available.

## 3. Variant 'g': six rules

**g1 Harvest window at zero kills (SQUAD-only).**
- Trigger: kills = 0, t < 55 s, cubes < 6, hp >= 60%, no mech with a line inside 90 m, and the next item is close
  enough: cube <= 10 s away, drone <= 16 s, laser (none held) <= 25 s.
- Action: start no fight; collect in the order laser, threshold cube, drone, crate, cube. Any condition fails: fight
  as FNV does now.
- Hypothesis: a cube is worth about 190 hp-eq and costs under 10 s x 20 hp/s while only one hunter plinks.
- Expected sign: uncertain, +0.2 to -0.4. Our 75 s / 10-cube farm-first lost 0.38 (one draw each, old code); 2696
  gained +0.46 from the same gate. This version is shorter and stops when loot runs out. Test alone.
- Counter: the hunter closes inside 90 m (51 hp/s): the gate ends at once.

**g2 Loot reach from value, not fixed radii (both).**
- Trigger: any cube, crate or drone seen. Go if value > path x cost per metre x (1 on our heading, 2 for a dead end).
- Numbers: normal cube 52 m with one shooter, 30 m with two or more, 150 m with none; threshold cube 2x; drone 1.6x a
  crate. Crates need hp >= 40% and zero lines; drones hp >= 50% and no mech seen for 4 s. This replaces `farmHp` 0.9.
  At cubes >= 10: 15 m only, except within 2 cubes of 15.
- Hypothesis: `farmHp` 0.9 refuses a heal exactly when we need it. Expected sign: + small (0 to +0.1).
- Counter: +5% size per cube raises house hit rates at long range; from 6 cubes do not farm in a fight.

**g3 Free beams (both).**
- Trigger: laser ready, no mech shootable for 0.4 s, a crate with a line inside 110 m whose cube passes g2.
- Action: one full beam, gun silent. Drone: beam plus one bullet (one beam alone from 3 cubes or one lens).
- Not while hp < 97% in a zero-line lull: drone hits reset regeneration; treat crate hits the same until measured.
- Expected sign: + small. Counter: a beam on a crate we never walk to is noise for nothing, hence the g2 test.

**g4 Corpse run sized by the pile (SQUAD-only).**
- Trigger: our kill, cubes < 10, n = victim cubes + 2. Go if boost path <= min(115, 58 x n / lines) m (lines counted
  as at least 1); at 3 or more lines only inside 25 m. Abort after 6 s.
- Also: when the target is within one beam plus one magazine of death and lines <= 1, close to 100 m so the pile
  lands inside reach.
- Hypothesis: the median gap before a new attacker is 5.4-7.3 s (sim), which is 105-140 m of boost.
- Expected sign: +0.1. Counter: this tightens our `killCubeR` 200; if piles are skipped too often, raise 58 to 80.

**g5 Supply drop 1 as the second life (SQUAD-only).**
- Trigger and action: from 60 s keep the fight inside 150 m of the next-zone centre (measured drops land within
  0.38 of the next radius, about 133 m). From the 70 s call, leash 60 m around the ring. DROP outranks FIGHT once it
  has landed (or lands within 3 s of arrival), we miss >= 250 hp, and travel <= 8 s. No hp margin.
- In the ring keep strafing with reversals of +-5 m (the ring is 8 m); do not stand still. Shoot the nearest mech
  first: a house bot inside the ring freezes the clock.
- Expected sign: +0.2 to +0.4, high variance. Counter: house bots capture drops too; if one holds the ring, step in
  and shoot it.

**g6 Upgrade picks by remaining life (both).** Order below; two overrides.
- Holding a laser and t < 45 s: `laser_damage` moves above `armor`.
- No laser held and t < 45 s: `gun_damage` and `gun_mag` move above `armor`.
- Expected sign: + small. Counter: none needed; a pick cannot lose hp.

## 4. Upgrade order

Value at the first offer (f = 0.75, about 4 kills left) and at the third (f = 0.3, about 2 kills left):

| Upgrade | First offer | Third offer | Reason |
|---|---|---|---|
| plating | 300 | 250 | +210 now, +15% on every later cube heal and on the drop; independent of time |
| nanites | 230 | 115 | sim lulls: 108 -> 186 hp regenerated per kill, +78 per remaining kill; discounted 0.75, needs zero-line lulls |
| armor | 200 | 120 | 8.7% of everything still to be absorbed; no instant heal; not the zone |
| laser_damage | 155-180 | 60 | laser is 57% of our damage, so +10% total; two lenses + 3 cubes = a 1,400 hp mech in 3 beams |
| gun_damage | 96 (224 gun-only) | 39 | +15% on the gun's 43% share |
| gun_mag | 95 (221 gun-only) | 38 | 48% of sustained gun time is reload; 20 rounds and 1.92 s = +30% sustained dps, halved for line gaps |
| laser_charge | 73 | 29 | cycle 2.4 -> 2.21 s, +8.5% laser dps |
| gun_rate | 0-60 | 0-25 | 0.209 s on 0.05 s ticks may change nothing; reload-bound anyway |

Full order: plating, armor, nanites, laser_damage, gun_damage, gun_mag, laser_charge, lightning_efficiency, servos,
gun_rate, lightning_chain, lightning_range, capacitor, reactor, gyros, jets, mortar_reload, mortar_splash,
mortar_velocity, gun_velocity, sensors, laser_pierce.

Findings against the brief:
- I could not derive a damage-first order. Hp converts at 390 per kill, damage at 1,400 per kill, and faster kills
  bring hunters sooner. The current top three stand; armor and nanites are a tie that only a log of lull lengths
  settles.
- The real changes are `gun_mag` from 13th to 6th, `gun_rate` down, and `laser_charge` below the gun pair.
- The current list contains `mortar_damage` and `mortar_rate`, which are not config ids; the real ones are
  `mortar_reload` and `mortar_velocity`. Harmless today (unknown ids score 100) but wrong.

## 5. Test order

g5, then g6 + g2 together (cheap, low risk), then g4, g3, and g1 last and alone.
