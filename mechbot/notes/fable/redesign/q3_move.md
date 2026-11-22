# q3_move.md — questioner 3: movement, dodging, cover, zone. Variant spec 'f'

One author, not independent review. Nothing official was run. Tags: [M] official, [S] our simulator notes, [C] read in
FNV_s1 code, [A] my arithmetic, [X] my lateral strafe model (`scratchpad/q3/strafe.js`: first-order lead, no aim noise,
0.30 s cadence, 12-round magazine, spread sigma 0.6 deg, hit half-width 2.8 m = body 2.5 + bullet 0.3, ground accel 58.5,
0.05 s observation latency). [X] ranks nothing; it gives physics limits.

## 1. Derived numbers

Model check: standing hit rate from sigma 0.6 deg and 2.8 m is 99 / 93 / 82% at 100 / 150 / 200 m [X]; rules bible
measured 99 / 92 / 82 [M]. The spread model is right.

**The one physical limit.** A bullet led on our velocity misses only if we change velocity while it flies. At 58.5 m/s²
a displacement error of 2.8 m takes sqrt(2 x 2.8 / 58.5) = 0.31 s, whatever our top speed. Flight is R / 252. So:
- R < 78 m (flight < 0.31 s): **no leg pattern can make a house bullet miss.** [X] 98-100% at 50 m for every pattern.
- A velocity change dodges only bullets fired within about (R/252 - 0.31) s before it and 0.25-0.3 s after it starts.

House hit rate (%) on us by range and pattern [X]:

| pattern | 50 | 75 | 100 | 130 | 150 | 185 m |
|---|---|---|---|---|---|---|
| stand, or walk straight (any heading) | 100 | 100 | 99 | 96 | 93 | 86 |
| ours today, flips U(0.8, 1.6) s | 99 | 79 | 64 | 51 | 42 | 30 |
| preset 'fast' U(0.45, 1.15) | 99 | 69 | 49 | 34 | 26 | 18 |
| flips U(0.5, 0.7) | 98 | 60 | 35 | 23 | 19 | 15 |
| flips U(0.35, 0.6) (their low end) | 98 | 56 | 35 | 26 | 24 | 22 |
| laser charging (5.85 m/s), U(0.8, 1.6) | 100 | 94 | 83 | 70 | 61 | 48 |
| laser charging, U(0.5, 0.7) | 100 | 89 | 67 | 45 | 35 | 24 |
| boost 19.5, reverse at each enemy shot | 98 | 49 | 12 | 0 | 0 | 1 |

Best interval is about 1.0-1.3 x flight time (0.5-0.7 s at 100-150 m); shorter than 0.8 x flight is worse (the legs never
reach speed), longer than 1.6 x is worse (most bullets see a steady velocity).

**Why pauseMove (4.88) and isoDwell (4.83) lost** [A]: (a) both make us stand or dwell; standing raises the target's hit
rate from 51-64% to 96-99% at 100-130 m, about +16 dps on a 19.5 dps line, which equals the 18 dps of the line they
tried to deny, and the denied hunter only arrives 3-6 s later (shared vision, true position); (b) 69% of new lines are
opened by their walk, not ours; (c) both are 1.4-1.7 sd below our 5.11 mean (sd 0.17), compared with a best-of-5 5.38:
real but small. Lesson: never buy line discipline with stillness or straight walking.

**Dodge versus stand to shoot.** Legs and torso are independent, so standing never helps our aim. Moving always wins
beyond 78 m; inside 78 m lateral motion is worth nothing, so the legs should do something else (open range, cubes).
The only real cost is the laser charge (half speed): hit rate 70-83% at 100-130 m with today's flips.

**Straight walks are the leak.** In FIGHT 8845 decisions are `standoff`, but 4021 `isolate` + ~5900 `grab` are goal
walks [S]. A straight walk is hit like a standing mech (96-100%). Our own figure: walking to cover takes 72 against
42 hp/s [S], ratio 1.7 = the model's 96 / 55.

**How far cover may be** [A]: a walk to cover costs +30 hp/s (72 - 42); a cut line saves 18 dps until the hunter
re-opens it, 3-6 s (55-110 hp). Break-even walk time 1.8-3.6 s: **cover within 20-40 m walking, about 45 m boosted**,
and only if it keeps the target line. Regeneration needs 5 s unhit; the hunter is back in 3-6 s, so cover never heals
in contact. Far cover at 55-145 m (theirs) cannot pay for us in SQUAD; hide-and-heal lost every official test [M].

**Front arc** [A]: rear x1.5 applies outside ±90 deg of the torso, and the torso is on the target. A second line at more
than 90 deg off the target bearing costs +9 dps. Backing along -(uT + uA) at 11.7 m/s and 120 m rotates each bearing
by v sin(half angle) / R = 4.3 deg/s, closing the pair by 8.6 deg/s: 110 -> 85 deg in 3 s. Share of intake that is rear
is unmeasured: count it first.

**Zone** [A][C]: edge speed is at most 7.2 m/s, walk is 11.7: the edge never catches a walking mech. Phase 1 costs
20 dps outside, about one gun line; a straight ZONE walk in contact costs +30 hp/s. A point inside the next circle
(380 m) cannot be outside before 155 s; our lives are 71-95 s. `mover.zoneCheck` sets `far` at dNext > 0.8 nr within
pathT + 12 s of the shrink and holds urgency until dNext <= 0.6 nr [C]: it walks us straight toward the squad's park
ring (0.41 nr [S]) for no zone reason. The rim keeps every hunter on one side (front arc) and strings them out.

## 2. Variant 'f' (five rules; every one inert when its key is off)

| # | Trigger | Action | Hypothesis | Sign | Scope | Counter that proves it fires |
|---|---|---|---|---|---|---|
| F1 `flipFlight` | FIGHT, a gun line on us, range R to the nearest gun shooter >= 80 m | strafe interval = clamp(1.15 x R / 252, 0.45, 0.75) x U(0.85, 1.15) s (replaces U(0.8, 1.6)); while our laser charges also flip on each new enemy bullet (0.4 s floor) and boost if energy > 30 | hit rate on us 64 / 51 / 42% -> 35 / 23 / 19% at 100 / 130 / 150 m | + (0.10 to 0.25) | both (physics; FFA key separate) | `c.jinks` per standoff second 0.83 -> ~1.7; new `c.gunSeen[bin]` / `c.gunHit[bin]` (projectiles aimed at us vs `damaged` gun events) for 80-110, 110-140, 140+ m |
| F2 `noDodgeZone` | FIGHT, gun shooter inside 70 m, not finishing / rush / lightning / grab within 12 m | strafe gain 0; full back stick away from it until 95 m, boost if energy > 30; gun-only band 55-95 -> 90-125 (hold 105) | no pattern dodges inside 78 m; house gun dps on us is 51 at 75 m, 27 at 110 m [M]; our hit rate on a straight walker stays >= 98% | + (0.05 to 0.20); risk: house bots keep closing, we give up cubes | SQUAD only | `c.backOff70` decisions; seconds with a line by range bin (<70, 70-95, 95-130, 130+) |
| F3 `zigWalk` | FIGHT, gun line on us at R >= 80 m, legKind in grab / isolate / regain / zone walk, straight leg >= 15 m | walk the leg as a zigzag: heading ±45 deg, alternated on the F1 clock, each side tested with `walkable(…, 5)`; progress 71% | removes the x1.7 intake of straight walks on about 45% of FIGHT decisions | + (0.10 to 0.20) | both | `c.zigWalk` decisions; intake dps per legKind (grab and isolate must fall toward standoff) |
| F4 `frontArc` | a line holder (or `damaged.rear` in the last 1.5 s) at more than 80 deg off the target bearing | radial part of the legs = unit(-(uT + uA)) at full stick, strafe flips kept, until under 70 deg; cover only if <= 25 m walk (45 m boosted, energy > 50), keeps the target line and cuts >= 1 other line | closes the pair 8.6 deg/s; saves +9 dps per rear line | + small (0.02 to 0.08) | both | `c.rearDmg` / `c.dmgIn` (measure on the base first); `c.arcBack` decisions; `c.coverNear` taken / refused by distance |
| F5 `rimZone` | SQUAD firewall holds, zone phase dps <= 35 | ZONE urgency only if outside, or tOut - 1.3 x pathLen / 11.7 < 6 s; drop the `far` (0.8 nr) trigger and the 0.6 nr hold; stand-off anchor on the rim, dNext 0.75-0.92 nr, back to the edge; ZONE walks in contact use F3 | fewer straight walks into the park ring; hunters arrive from one side and one at a time | + small (0.03 to 0.10); risk: later, longer zone walks | SQUAD only | `c.zoneFarSkipped`; ZONE seconds per match before 110 s; `c.rimHold`; first-contact time and lines at 60-100 s |

Order of test: F1 + F3 together as 'f1' (same clock, one mechanism), then F2, then F5, F4 last (needs the rear
measurement). Each alone is inside salt noise (sd 0.17): judge by the counters and intake dps in the simulator, and
spend official slots only on the bundle.

## 3. Their mechanics, questioned

- 49-step scoring and a 1 s three-leg projectile simulation: heavier than needed. The limit is 0.31 s of acceleration,
  which a flip clock tied to flight time already meets; our `bulletDodge` (0.9 s horizon, 0.3 s hold) is the same class.
- Flips every 0.35-0.9 s: their low end is too fast beyond 100 m (22-24% at 150-185 m against 15-19% for 0.5-0.7 s).
- "No strafing" in urgent zone mode: a straight walk at x1.7 intake; F3 is better.
- Far cover rings at 55-145 m with priority and boost: outside our 45 m break-even; serves their retreat-and-regen
  play, which lost for us.
- Zone leave-by with a 9 s + 10% pad: fine; the pad only matters once a walk is really needed.

## 4. Not known

House closing behaviour inside 70 m (do they stop?), the rear share of our intake, how often `far` fires before 110 s
(the simulator's 2.7 s of zone legs per match says less than my geometry does: read `c.zoneFarSkipped` first), and
whether house lead uses our velocity or a two-observation difference (the model assumed velocity).
