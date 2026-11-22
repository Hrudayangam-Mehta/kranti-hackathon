# Replay forensics: `replay/mech16.jsonl.gz` (16 house bots, free-for-all)

Source data: one official full-state replay (seed 16, 4193 ticks = 209.65 s, 2098 frames at 0.1 s, 3917 events) plus,
as a cross-check on the current rules, the 300 real observations in `kit/check/stream.jsonl.gz`.
All numbers below are produced by the scripts in `tools/forensics/` (`python3 -I tools/forensics/run_all.py`
regenerates every log under `tools/forensics/out/logs/`; the log that backs a section is named in its heading).
Machine-readable parameters: `notes/housebot_model.json`.

## 0. Read this first

**1. The replay was recorded on an older balance build than `notes/hello_example.json`.** Measured in the replay
versus the current config:

| quantity | replay (measured) | current config | how measured |
|---|---|---|---|
| gun projectile speed | 140.000 m/s (sd 0.011, n=798) | 252 | bullet tracks |
| gun cadence | one shot per 8 ticks (0.40 s) -> cooldown in (0.25, 0.35] s | 0.24 s (6 ticks in the kit stream) | fire events |
| walk / boost speed | 9.0 / 15.0 m/s | 11.7 / 19.5 | frame displacements |
| ground acceleration | 45 m/s² | 58.5 | first frame after spawn |
| ground boost drain / jet drain | 26 / 20 energy per s | 17 / 15 | energy slopes |
| laser damage / charge / cooldown | 420 / 0.65 s / in (2.5, 2.6] s | 315 / 0.75 s / 1.65 s | hit amounts, charge->beam ticks |
| laser aim while charging | locked at charge start | free (`charge_turn_mult` 1) | beam yaw = charge yaw in 39/39 |
| mortar cooldown | in (2.65, 2.74] s (56 ticks) | 2.6 | fire events |
| lightning energy per zap | about 5.5 | 3 | energy drop per zap |
| size growth per cube | none (muzzle 7.0 m and hit radius 2.8 m at 16 cubes) | 5% per cube | bullet origins, miss distances |

Unchanged and verified: gun damage 45, spread 0.6°, magazine 12, reload 2.4 s, range 230 m, jump speed 11, gravity 22,
jet climb 8.9 m/s, energy regen 18/s after 0.6 s, HP 1400, HP regen 45/s after 5 s, rear ×1.5, cube +4% HP/damage capped
at 10, mortar 72 m/s and 200/160, lightning 60, drone bullets 90 m/s / 25 damage / 1 s, crate 300 HP, turn 4 rad/s,
pitch 3 rad/s. Speeds and accelerations both scaled by 1.3, so the time to reverse a walk (2·v/a = 0.40 s) is the same
in both builds; bullet flight time per metre is 1.8 times shorter now. **Range-based numbers from the replay must be
converted through flight time** (replay range ÷ 140 × 252).

**2. One match.** 1061 gun shots, 57 mortar shells, 39 laser beams, 47 lightning zaps, 15 mech deaths. All-type
figures are solid; per-type rows rest on 2–3 mechs and 50–140 s of fighting each.

**3. Free-for-all, not the practice squad.** Types present: expert ×3, hard ×3, medium ×2, brawler ×2, sniper ×2,
thirdparty ×2, farmer ×2. There is no `easy` bot. Squad behaviour (shared vision, weakest-first hunting) cannot be
seen here.

**4. The kit stream shows the same AI on the current build** (identical 14.9 m / 3.1 s jet hop, identical aim
formula with 252 m/s). Where it disagrees with the replay (laser), the stream is the better guide. See section 11.

## 1. Aiming (`aiming.txt`, `aiming2.txt`, `aiming3.txt`, `bullet_kinematics.txt`, `extras.txt`)

Reconstruction: projectile ids are sequential over gun, mortar and drone shots; all 1061 gun fire events map to a
projectile (952 with a track of ≥2 frames, 71 with one frame, 38 only an impact). Target = entity with the smallest
angle to the bullet direction (direct or true-intercept), overridden by the entity actually hit.

**Ballistics**

- Bullet speed is constant (140.000 ± 0.011 m/s in the replay; 252.00 ± 0.002 in the stream). It does **not**
  inherit shooter velocity: regression slope of bullet speed on shooter velocity along the aim = −0.0000 over
  shooter speeds from −16.8 to +15.0 m/s.
- Origin: feet + (0, 0, 7.0) + 3.0 m along the aim. Horizontal residual of the back-traced muzzle axis from the
  mech centre: median 0.03 m, p95 0.06 m. At the end of the fire tick the bullet is already 3.0 + one tick of travel
  out (10.0 m in the replay; 15.6 m at 252 m/s).
- Spread: bullet direction minus torso aim (steady-aim shots, n=509): yaw sd 0.65°, pitch sd 0.61° (aim is logged
  to 0.01 rad, which adds about 0.17°), i.e. the configured 0.6° Gaussian per axis.
- Hit radius: every actual hit passed within 2.80 m of the body axis; unblocked misses start at 2.82 m.
- Bullets vanish 1.55–1.6 s after firing (227 m at the last frame); farthest geometry impact 233 m.

**Aim model (all seven types the same)**

| hypothesis for the bullet yaw | n | residual mean | residual sd |
|---|---|---|---|
| first-order intercept from the observation one tick before the shot, target velocity at that tick | 805 | +0.04° | 0.73° |
| same, velocity averaged around the tick | 805 | +0.04° | 0.76° |
| same, from an observation one decision older | 805 | +0.06° | 1.35° |
| no lead (direct bearing) | 805 | +0.15° | 2.76° |

- Regression `lead used = k × lead needed + b`: k = 0.97, b = 0.04°, residual sd 0.73° (per type k = 0.90–1.01).
- On targets with constant velocity around the shot (n=111) the residual is |yaw| p50 0.39°, p90 1.05° — a 0.6°
  Gaussian gives 0.40° / 0.99°. **There is no aim error beyond the weapon's own spread and no reaction delay, for
  any type.** (medium n=7 and thirdparty n=3 in that subset are too few to say otherwise.)
- Height: they aim at the body centre (bullet passes 0.05 m above z+4.5 on average, sd 1.15 m, n=450).
- Airborne targets are predicted ballistically, `z + vz·t − 11·t²`, clamped at the ground under the predicted
  point: median |pitch residual| 0.52° (n=301) against 1.73° for "no vertical lead" and 2.28° for "linear, clamped".
  A target that keeps jetting is therefore under-led vertically by 11·t² m.

| type | gun shots | at mechs | at drones | at crates | hits on mechs | hit % | blocked by geometry |
|---|---|---|---|---|---|---|---|
| expert | 163 | 125 | 32 | 6 | 76 | 60.8 | 7 |
| hard | 218 | 182 | 10 | 26 | 76 | 41.8 | 11 |
| medium | 100 | 77 | 8 | 15 | 60 | 77.9 | 4 |
| brawler | 180 | 168 | 0 | 12 | 67 | 39.9 | 17 |
| sniper | 136 | 114 | 8 | 14 | 74 | 64.9 | 8 |
| thirdparty | 71 | 57 | 0 | 14 | 40 | 70.2 | 4 |
| farmer | 193 | 128 | 10 | 55 | 40 | 31.3 | 7 |
| ALL | 1061 | 851 | 68 | 142 | 433 | 50.9 | 58 |

Drone shots hit 93% (63/68), crate shots 76% (108/142). The type differences in hit % follow engagement range
(below), not aim quality.

**Hit rate vs range** (shots at mechs, blocked shots count as misses; replay metres)

| type | 0–40 m | 40–80 m | 80–130 m | 130–230 m |
|---|---|---|---|---|
| ALL | 59/60 = 98% | 259/330 = 78% | 83/287 = 29% | 32/173 = 18% |
| expert | 20/20 | 45/62 = 73% | 8/34 = 24% | 3/9 |
| hard | 1/1 | 50/71 = 70% | 20/62 = 32% | 5/48 = 10% |
| medium | 12/13 | 47/55 = 85% | 1/4 | 0/4 |
| brawler | 11/11 | 22/33 = 67% | 24/84 = 29% | 10/40 = 25% |
| sniper | 14/14 | 49/51 = 96% | 6/14 = 43% | 5/35 = 14% |
| thirdparty | 1/1 | 32/39 = 82% | 7/11 | 0/6 |
| farmer | – | 14/19 = 74% | 17/78 = 22% | 9/31 = 29% |

95% intervals for ALL: 91–100%, 74–83%, 24–34%, 13–25%.

**Hit rate vs bullet flight time** (the build-independent form)

| flight time (s) | replay range (m) | same flight time at 252 m/s (m) | all shots: n, hit % | grounded target, unblocked: n, hit % | airborne target: n, hit % |
|---|---|---|---|---|---|
| 0.0–0.2 | 0–28 | 0–50 | 7, 100% | 3, 100% | 4, 100% |
| 0.2–0.3 | 28–42 | 50–75 | 63, 98% | 38, 100% | 24, 100% |
| 0.3–0.4 | 42–56 | 75–100 | 143, 87% | 96, 86% | 42, 100% |
| 0.4–0.5 | 56–70 | 100–126 | 110, 75% | 44, 57% | 63, 92% |
| 0.5–0.6 | 70–84 | 126–151 | 91, 53% | 47, 32% | 43, 77% |
| 0.6–0.7 | 84–98 | 151–176 | 55, 38% | 31, 19% | 21, 71% |
| 0.7–0.8 | 98–112 | 176–201 | 101, 29% | 60, 25% | 30, 47% |
| 0.8–0.9 | 112–126 | 201–226 | 78, 27% | 37, 30% | 32, 31% |
| 0.9–1.0 | 126–140 | 226–252 | 75, 23% | 55, 16% | 14, 57% |
| 1.0–1.2 | 140–168 | beyond gun range | 85, 13% | 61, 18% | 9, 0% |
| 1.2–1.7 | 168–238 | beyond gun range | 43, 21% | 32, 28% | 7, 0% |

The targets here were other house bots doing their normal strafing (section 3), not targets trying to dodge.

**What makes them miss** (grounded targets, unblocked, flight time 0.3–1.0 s)

| what the target did between fire and arrival | shots | hits | hit % |
|---|---|---|---|
| kept its velocity (< 25° turn, < 2 m/s speed change) | 56 | 47 | 84% |
| turned 25–60° or changed speed | 133 | 70 | 53% |
| turned 60–120° | 76 | 18 | 24% |
| reversed (> 120°) | 77 | 17 | 22% |
| stopped | 13 | 6 | 46% |
| started moving | 15 | 6 | 40% |

- Target lateral speed by itself does not matter (hit % 43 / 58 / 55 / 56 / 53 for |v_lat| 0–1 / 1–4 / 4–7.5 /
  7.5–10 / >10 m/s); the velocity **change** during flight does: |Δv| < 4 m/s → 80% hits, 4–9 → 52%, > 9 → 22%.
- Missed bullets pass **ahead** of the target: at 80–130 m 52% are more than 2.8 m ahead of the motion and 10%
  behind; at 130–230 m 52% ahead, 16% behind. Mean signed error +1.2° (+2.0 m at the target).
- Angular error against the true future position: yaw sd 2.06°, pitch sd 1.27°, total p50 2.0°, p90 3.7°.
  Miss distance at closest approach (unblocked): p25 1.2 m, p50 2.4 m, p75 3.9 m, p90 5.3 m.
- Jumping does not dodge: an airborne target is hit more often than a grounded one at every flight time up to 0.8 s
  (table above), because air control is weak (12 m/s²) and the predictor models gravity.

**Trigger discipline**

- 848 of 851 shots at mechs were fired with a clear muzzle line to some part of the target (99.6%); they do not fire
  blind. 58 bullets (6.8%) still hit geometry before reaching the target.
- They fire on the first decision whose observation shows cooldown 0: 8-tick spacing in 63% of all shot-to-shot
  intervals, 10–12 ticks in 12%, the rest are pauses. After 12 shots the next one comes 50 ticks (2.5 s) later (40
  ticks with `gun_mag`).
- 1.30 shots per engaged second (maximum sustainable 1.74) and 36.5 gun damage per engaged second, all types
  (medium 50.8, brawler 41.9, sniper 41.8, thirdparty 40.8, expert 39.7, hard 28.2, farmer 20.8).
- First shot after a clear line opens (77 fresh acquisitions): p10 0.25 s, p25 0.65 s, p50 1.15 s, p75 3.05 s; the
  three shortest are within one decision. Tree canopy is not modelled in this test, so real sight may open later
  than the geometric line; treat 0.25 s as the floor, not 1.15 s as a promise.
- 35% of shots at mechs were fired while the shooter was airborne (thirdparty 65%, expert 48%); the sniper fired
  19% of its shots standing still, everyone else under 6%.

## 2. Target selection (`targeting.txt`, `targeting2.txt`)

Method: 116 "runs" of consecutive gun shots at the same mech. Candidates = enemies with a geometric line of sight
within 200 m that were inside the shooter's 120° wedge at some frame in the previous second, or within 45 m.

- 71 of 116 decisions had a single candidate. Of the 45 with two or more: **nearest chosen 67%**, lowest HP 42%,
  random choice would give 44%. With all geometrically visible enemies as candidates (65 decisions): nearest 71%,
  lowest HP 48%, random 42%.
- "Whoever shot me": when a recent attacker was among the candidates (18 decisions) it was chosen 50% of the time;
  in the 3 cases where the nearest enemy and the last attacker differed, the nearest was chosen all 3 times.
- At least 6 of the 15 not-nearest choices were snipers shooting at a target 146–191 m away while another stood at
  53–132 m.
- Stickiness: median run 4 shots / 1.9 s, mean 7.3 shots, p90 11.5 s, longest 31.5 s (hard). Per type median
  duration: farmer 4.5 s, expert 3.3, hard 3.3, brawler 1.4, thirdparty 1.0, sniper 0.85, medium 0.4.
- Why a run on a mech ended (83 switches): target out of sight or beyond 200 m 22, switched to a drone or crate
  while the mech was still visible 18, a closer mech 15, target died 14, a farther mech 14.
- They open fire at up to 197 m (one shot at 236 m); range at the first shot of a run, median: brawler 140,
  sniper 126, farmer 124, hard 85, medium 74, expert 70, thirdparty 53 m.
- Not answerable: any HP-based or weapon-based scoring beyond "no visible preference for low HP"; 45 decisions are
  too few to fit weights.

## 3. Movement while fighting (`movement.txt`, `reactions.txt`, `extras2.txt`, `scan.txt`)

"Engaged" = a gun shot at a mech within the last 2 s. 685 mech-seconds in total.

| type | engaged s | ground speed (walk = 9) | standing | airborne | mean lateral speed | mean closing speed (+ = approaching) | frames closing > 3 m/s | frames opening > 3 m/s | frames with lateral > 5 m/s |
|---|---|---|---|---|---|---|---|---|---|
| ALL | 685 | 7.65 | 4% | 32% | 4.8 | +1.8 | 43% | 19% | 45% |
| expert | 109 | 8.03 | 1% | 42% | 5.6 | +0.3 | 34% | 30% | 54% |
| hard | 140 | 7.71 | 1% | 29% | 5.6 | +2.1 | 45% | 14% | 52% |
| medium | 69 | 8.03 | 0% | 28% | 6.3 | +3.2 | 52% | 3% | 67% |
| brawler | 119 | 8.40 | 0% | 20% | 3.8 | +5.7 | 75% | 4% | 34% |
| sniper | 99 | 6.08 | 21% | 22% | 3.5 | 0.0 | 24% | 26% | 30% |
| thirdparty | 50 | 7.89 | 2% | 51% | 4.6 | −2.8 | 12% | 40% | 46% |
| farmer | 100 | 7.57 | 1% | 41% | 4.7 | −0.5 | 28% | 36% | 44% |

**Approach or keep range** — mean closing speed (m/s) by current distance to the target:

| type | 30–50 m | 50–70 m | 70–100 m | 100–140 m | 140–240 m |
|---|---|---|---|---|---|
| ALL | +0.5 | +0.4 | +2.7 | +2.0 | +3.0 |
| expert | −1.0 | −1.4 | −0.4 | +2.2 | +5.5 |
| hard | +0.6 | +0.3 | +2.2 | +2.8 | +3.2 |
| medium | +1.3 | +4.1 | n<15 | +4.7 | +7.2 |
| brawler | +5.6 | +5.6 | +5.6 | +4.9 | +8.1 |
| sniper | −1.4 | −1.5 | +3.3 | −0.5 | +1.0 |
| thirdparty | −5.6 | −4.2 | −0.7 | n<15 | −3.2 |
| farmer | n<15 | +2.2 | +6.6 | −1.8 | −2.0 |

Engagement distance while engaged (p10 / p50 / p90, m): ALL 43 / 90 / 152; expert 33 / 67 / 136; hard 50 / 86 / 146;
medium 36 / 49 / 127; brawler 40 / 105 / 158; sniper 42 / 101 / 178; thirdparty 51 / 72 / 143; farmer 61 / 118 / 149.
With lightning in the second slot the mean closing speed is +5.3 m/s; with laser +0.4, mortar +1.4, nothing +0.7.

**Distance over time** (`engage_time.txt`). 162 episodes of shots at one mech (gaps ≤ 2 s): duration p50 1.6 s, p75
3.8 s, p90 5.4 s, longest 16.6 s. Over all multi-shot episodes the pair was closer at the last shot than at the first
in 49% (median 85 m at the start, 83 m at the end): on average a fight stays at the range where it began. In the 49
episodes of 3 s or more the median change after 3 s was −2 m overall; brawler −20 m (n=11), sniper −9 (4), hard −4
(11), farmer −3 (8), medium 0 (5), thirdparty +5 (3), expert +9 (7).

**Strafing.** Lateral direction reversals (|v_lat| > 3 m/s on both sides): 359 in 685 s = 31 per minute. Interval
between reversals: p10 0.4 s, p25 0.6, p50 1.1, p75 1.8, p90 2.7 s (per type p50: expert 0.9, medium 0.9, sniper 1.0,
hard 1.1, thirdparty 1.1, brawler 1.4, farmer 1.55). The stream mech (current build) reversed with a median of 0.6 s.

**Jumps and jets.** 206 airborne segments, 192 with jet. The standard move is one fixed hop: jump, jet 1.5 s, coast —
apex 14.9 m above take-off, 3.1 s in the air (93 of 206 segments have exactly this apex; the stream mech does the
same hop for 22.5 energy). Hops per minute while engaged / otherwise: expert 7.7 / 4.3, hard 5.6 / 5.0, medium
4.4 / 3.1, brawler 6.6 / 7.2, sniper 6.1 / 7.1, thirdparty 12.0 / 7.8, farmer 8.4 / 5.5. An obstacle lay within 25 m
ahead in 25% of hops against 28% of random walking frames, and 22% of hops started within 1 s of being hit: the hop
is not an obstacle response and not clearly a damage response. 7% of hops end on a roof.

**Reaction to being hit** (81 first hits from a new attacker): speed 8.3 → 8.1 m/s, boost flag 37% → 26%, airborne
29% → 38% in the second before / after. No evasive change is visible.

| situation at the first hit | n | turned to within 10° of the attacker in 10 s | median time to turn | returned fire | median time to first return shot |
|---|---|---|---|---|---|
| attacker was already my target | 38 | 100% | 0.0 s | 95% | 0.35 s |
| attacker in my view wedge or within 45 m, not my target | 11 | 91% | 0.0 s | 91% | 0.95 s |
| attacker outside my view wedge and beyond 45 m | 32 | 50% | 1.6 s | 44% | 2.6 s |
| … while I was shooting someone else | 11 | 36% | 1.55 s | 36% | 2.6 s |

Half of the "never turned" cases were one or two stray hits. For attacks of six or more hits from outside the wedge
(n=9) the victim turned in 8, after a median 2.25 s (0.4–9.65 s). Damage taken before the victim's first return shot
(or 10 s): attacker inside the wedge median 61 (mean 110), outside median 189 (mean 383).

**Reaction to a laser charge aimed at them** (39 charges, replay build): direction flip during the 0.65 s in 21%,
jump in 5%, boost start in 44%; in ordinary 0.7 s windows under gun fire the same mechs do 33% / 10% / 52%. Victims
that had the charger in their view wedge were hit 3/19, the others 8/20 (Fisher exact p = 0.16, not significant). **No
evidence that they dodge a charge.**

**Looking around when not fighting** (260 s of travel): torso within 20° of the heading half the time (p90 73°);
when it sweeps, amplitude 46° and period 4.7 s (the stream mech sweeps continuously with the same amplitude and
period). A direction 150–180° off the heading is inside the 120° wedge 1–3% of the time, 90–120° off 12%, ahead 84%.

## 4. Retreat and regeneration (`reactions.txt`)

Frames in which the mech was hit within the last 2 s, by its HP fraction — cell: mean closing speed toward the
attacker / share of frames moving away faster than 4 m/s / share of frames still firing:

| type | HP 0–20% | 20–40% | 40–60% | 60–80% | 80–100% |
|---|---|---|---|---|---|
| ALL | +0.5 / 14% / 77% (n=327) | −1.5 / 28% / 75% (597) | +0.3 / 20% / 76% (759) | −0.9 / 22% / 85% (1018) | −0.2 / 22% / 76% (1258) |
| expert | −2.8 / 42% / 77% | −3.3 / 32% / 82% | +0.1 / 32% / 62% | −2.7 / 39% / 87% | −0.7 / 25% / 80% |
| hard | +1.4 / 5% / 77% | −2.5 / 36% / 62% | −2.2 / 34% / 54% | −1.3 / 23% / 97% | −1.0 / 20% / 82% |
| medium | +1.3 / 0% / 53% | +2.4 / 1% / 95% | +2.4 / 8% / 79% | −1.0 / 25% / 69% | −5.0 / 65% / 93% |
| brawler | n<20 | −0.9 / 24% / 85% | +0.7 / 17% / 80% | +1.0 / 7% / 82% | +4.0 / 2% / 91% |
| sniper | −0.2 / 8% / 83% | −2.1 / 45% / 65% | +1.8 / 13% / 94% | −0.3 / 23% / 66% | −0.1 / 30% / 54% |
| thirdparty | +3.5 / 12% / 83% | −2.4 / 24% / 85% | −0.8 / 13% / 96% | −0.7 / 10% / 79% | −1.6 / 19% / 37% |
| farmer | n<20 | −1.8 / 39% / 53% | +0.2 / 3% / 95% | −0.4 / 23% / 95% | −0.1 / 20% / 85% |

- **There is no HP threshold at which they disengage.** Below 20% HP they still fire in 77% of frames and are not
  moving away on average. The expert backs off while firing at every HP level (its range-keeping), not more so
  when hurt.
- Regeneration is incidental: 40 episodes, 13 356 HP in total, median start 74% HP, median end 97%; 19 ended at
  full HP, 7 by taking damage, 14 by dealing damage or other. In the 5 s before regeneration started they moved at
  a median 8.8 m/s and were out of every enemy's line of sight only 41% of that time (hard 8%, brawler 68%); the
  nearest enemy was a median 97 m away. Nobody walked to cover to heal.
- "Do they return" is moot: they never left on purpose.

## 5. Roofs (`roofs.txt`)

| type | alive s | on a roof (grounded > 3 m above terrain) | share | airborne share |
|---|---|---|---|---|
| expert | 290 | 20.0 s | 6.9% | 27% |
| hard | 260 | 0.5 s | 0.2% | 27% |
| medium | 206 | 0 s | 0% | 19% |
| brawler | 420 | 2.4 s | 0.6% | 26% |
| sniper | 268 | 5.5 s | 2.1% | 24% |
| thirdparty | 204 | 0.6 s | 0.3% | 40% |
| farmer | 329 | 14.5 s | 4.4% | 29% |
| ALL | 1976 | 43.5 s | 2.2% | 27% |

- 14 roof visits of 0.5–8.1 s. Height above terrain p10 6.7 m, p50 9.1 m, p90 12.5 m, **maximum 14.0 m** — they get
  there only as the landing of the 15 m hop (take-off 5–48 m away horizontally, 18–75 energy), never by a
  deliberate climb to a tall roof.
- During these visits they fired 10 gun shots (9 at mechs), took 0 weapons, 1 cube, destroyed 0 crates. No sniping
  perch behaviour: 20 s of the 43.5 s is one expert (id 6) hopping across low roofs next to its spawn.
- Roof loot: 10 of the 40 floor weapons lay on roofs 13.3–23.2 m above terrain: **0 taken** (ground: 11 of 30).
  9 of 36 crates on roofs 4.0–34.6 m up: 2 destroyed (ground: 14 of 27). 22 gun shots were fired at roof crates
  from below (farmer 7, sniper 6, medium 5).
- Do ground bots shoot up? 8 shots from the ground at a mech standing on a roof, 3 hits; 10 shots from a roof at
  ground mechs, 2 hits. Too few to rate. At 40–130 m the hit rate against targets more than 6 m higher was 69%
  (n=134), but those are mostly mechs in a hop. Nobody stood on a roof above 14 m, so whether house bots can deal
  with a mech set back on a tall roof **cannot be answered from this replay**.

## 6. Loot economy (`loot.txt`)

**Weapons.** 10 of 16 took a second weapon within 1.7–10.4 s (the nearest ground pickup, 24–103 m from spawn); one
(sniper 3) at 110.9 s; 5 never did and died with the gun only at 41.7–125.1 s (hard 1, expert 6, expert 13, sniper
10, medium 15), although a ground pickup lay 49–152 m from their spawn. A bot with an empty slot that came within
15 m of a ground pickup took it in 11 of 12 cases, so the five simply never came near one: they do not detour far
for a weapon. Bots already holding a secondary walked past another kind 14 times and past the same kind 4 times;
only the farmers and one medium ever swapped. Take distance at the decision: 2.7–3.5 m.

| type | takes (kind) | held at death / end |
|---|---|---|
| expert | laser 1 | gun+laser, gun, gun |
| hard | laser 1, mortar 1 | gun+laser, gun+mortar, gun |
| medium | laser 1, then swapped to mortar | gun+mortar, gun |
| brawler | laser 1, lightning 1 | gun+laser, gun+lightning |
| sniper | laser 1 (at 111 s) | gun+laser, gun |
| thirdparty | mortar 2 | gun+mortar ×2 |
| farmer | lightning 2, mortar 3, laser 1 (6 takes, 4 swaps) | gun+mortar ×2 |

Swaps seen: farmer lightning→mortar→lightning→mortar, farmer laser→mortar, medium laser→mortar. Nobody dropped the
gun. Floor spawn mix: mortar 16, lightning 13, laser 11.

**Crates.** 142 gun shots at crates, 16 of 36 destroyed in 210 s. Per minute alive: farmer 10.0 shots / 0.73 crates,
hard 6.0 / 0.92, medium 4.4 / 0.29, thirdparty 4.1 / 0.59, sniper 3.1 / 0.22, brawler 1.7 / 0.57 (plus lightning),
expert 1.2 / 0. Range when shooting crates p10 18 m, p50 56 m, p90 170 m. Of 35 runs of shots on a crate, 12 started
with an enemy mech geometrically visible within 130 m (farmer 6, hard 4).

**Cubes.** 87 spawned (crates 16, drones 18, dead mechs 53), 48 picked up.

| cube source | cubes | picked up | median delay | p90 delay | picked by the killer |
|---|---|---|---|---|---|
| crate | 16 | 14 (88%) | 3.3 s | 4.7 s | 14 |
| drone | 18 | 16 (89%) | 5.1 s | 20.2 s | 14 |
| dead mech | 53 | 18 (34%) | 12.3 s | 64.0 s | 12 |

39 cubes were never collected, 38 of them at ground level. Cube pickups by type: brawler 14, expert 8, medium 8,
sniper 8, hard 6, thirdparty 2, farmer 2 (the "farmer" shoots crates but ended with at most 2 cubes).

**Upgrades** (24 picks): plating 5, gun_damage 4, reactor 3, gyros 2, nanites 2, lightning_efficiency 2, and one each
of gun_mag, mortar_splash, mortar_reload, armor, laser_damage, lightning_chain. By type: expert gun_damage / reactor /
plating / reactor; hard plating ×2 / gun_mag / nanites; medium armor / reactor / laser_damage; brawler gun_damage ×3 /
lightning_efficiency ×2 / lightning_chain; sniper gyros ×2 / plating ×2; thirdparty mortar_splash / nanites; farmer
mortar_reload. The offered choices are not in the replay, so preference order cannot be derived.

**Drones.** 9 of 12 killed, 8 of them in the first 48 s; the 3 survivors had homes 454–479 m from the zone centre.
Kill time 2.6–5.5 s (one 16.2 s); the killer took 0–238 damage. Gun shots at drones: expert 32 (3 kills, all within
6 s of the start), hard 10, farmer 10, medium 8, sniper 8, brawler 0 (lightning kill), thirdparty 0. Damage taken
from drones: 930 in total (2.4% of all damage); 27 of 35 drone hits were on a mech that had attacked that drone in
the last 10 s, 8 on a mech that had not.

**Supply drops.**

| drop | called / landed | alive at call | who went | result |
|---|---|---|---|---|
| 20000 at (97, −48) | 70 s / 95 s | 11 | expert 0 (149 m away at the call) stood in the ring from 85.7 s, 9 s before landing; sniper 3 (77 m away) arrived at 103.3 s. Next closest approaches: 48 m, 67 m, 105 m. | 0 was killed by 3 at 98.5 s; 3 captured at 107.25 s (+3 cubes, HP 1322 → 1624 = new maximum) |
| 20001 at (−36, −70) | 140 s / 165 s | 5 | brawler 9 (93 m at the call) entered at 169.1 s; three others came no closer than 56–66 m | 9 captured at 173.05 s, uncontested |
| 20002 | 210 s / – | 2 | – | match ended at 209.65 s |

Two drops is not a sample; what can be said is that one or two of the nearest bots walk into the ring, one of them
long before landing, and the capture clock ran its 4 s both times.

## 7. Zone (`zone.txt`)

- They start for the next circle when it is announced (the previous `shrink_end`), not at `shrink_start`. Phase 1
  (announced at 0 s, shrink 60–110 s): the five mechs outside the next circle (by 25–146 m) were inside it 34–58 s
  **before** `shrink_start`. Phase 2 (announced 110 s, shrink 155–195 s): farmer 5, 92 m outside, was moving in at
  110.5 s and inside 33 s before `shrink_start`.
- Position in the current circle (distance from centre / radius): p10 0.22, p50 0.41, p90 0.71; margin to the edge
  p10 139 m, p50 278 m. Per type p50: sniper 0.29, hard 0.32, thirdparty 0.39, expert 0.41, medium 0.43, farmer
  0.51, brawler 0.57. Time in the outer 20% ring: 7% overall (brawler 23%, farmer 11%, everyone else ≤ 3%).
- Zone damage: 1456 in the whole match (3.7% of all damage), all on one mech. Brawler 2 was inside the stadium
  bowl (x −190…−260, y 48…83) from about 130 s, hopping between surfaces 0–23 m above terrain with its energy at
  0–54, never got out, was outside the zone from 178 s and died at 209.65 s after 31.2 s outside. Every other
  mech: zero zone damage.
- Zone damage rate seen: 1.75 per tick (35/s) from 178 s to 195 s, 3 per tick (60/s) after 195 s — the phase value
  switches at the end of the shrink.

## 8. Laser, mortar, lightning (`lasers.txt`, `lasers2.txt`, `lasers3.txt`, `mortar_lightning.txt`, `mech_weapons.txt`)

**Laser (replay build — locked aim, see the warning in section 11).**

- 40 charges, 39 beams (one charger died mid-charge). Every charge lasted exactly 13 ticks (0.65 s = full charge in
  that build). Shortest beam-to-next-charge gap 53 ticks for three holders, 55 for the fourth.
- The beam left exactly along the yaw recorded at charge start in 39/39 (difference p10–p90 0.0°). That yaw points at
  `target position + velocity × 0.65 s`: median |error| 0.03°, p90 0.38° (other horizons are worse: 0 s 1.30°,
  0.5 s 0.31°, 0.75 s 0.21°).
- Hits 11/39 = 28%: expert 3/12, hard 1/13, medium 4/8, brawler 2/4, sniper 1/2. Hits at 49–192 m (median 82 m),
  misses median 114 m. Victim lateral speed median 3.6 m/s in hits, 6.7 m/s in misses. Of 23 unblocked misses, 13
  passed more than 2.5 m behind the victim's motion, 8 more than 2.5 m ahead; 5 more beams were stopped by
  geometry.
- 7386 damage from 11 hits (19% of all damage, 3 kills): 66% of it from rear hits, 6 hits carried cook-off
  (+60% on a mortar holder). Largest single hits 1169 and 1089 (rear × cook-off).

**Mortar.** 57 shells by hard 7 (21), thirdparty 4 and 11 (16), farmers (15), medium 8 (5).

| range at fire (m) | shells | did damage | median miss (boom to target centre) | median flight time |
|---|---|---|---|---|
| 0–40 | 1 | 1 | 4.6 m | 0.40 s |
| 40–80 | 31 | 13 (42%) | 9.7 m | 0.75 s |
| 80–130 | 14 | 4 (29%) | 14.1 m | 1.43 s |
| 130–240 | 8 | 0 | 30.3 m | 2.83 s |

- 18 of 57 shells did damage (32%); 4 were direct hits (base 200), the rest splash. No self-damage in the match.
  Total 2425 damage (6%), 1 kill.
- Range at fire min 34 m, p10 51, p50 72, p90 141, max 182 m. One shell in the whole match was fired inside 40 m.
- Lead: for moving targets with flight > 0.5 s (n=41) the blast landed a median 2.2 m from the linear-lead point
  and 11.0 m from where the target stood at fire. Same first-order lead as the gun, aimed at the ground.
- 46 of 54 were fired with a clear line to the target; 26 at a target that was airborne at that moment (those
  mostly missed: the shell goes to where a hop is, not where it lands).
- Spacing between shells 56 ticks (46 with `mortar_reload`).

**Lightning.** Brawler 9 held it for 199 s: 46 zaps (33 on mechs, 7 on crates, 6 on a drone), 3739 damage (3000 on
mechs), 1 kill (sniper 3) and 1030 of the last 1615 damage on expert 6. Farmer 12 held one for 84 s and zapped once (a crate).

- Every one of the 47 zaps had a target (no dry zaps); longest zap 42.1 m. Zap spacing 6 ticks.
- Brawler 9 had an enemy mech within 45 m for 18.0 s of the 199 s (12.2 s inside the 30° cone).
- A burst runs until the energy is gone: 11 zaps took energy 43 → 1 (120.5–123.5 s, killing expert 6 together with
  the gun), 18 zaps 78 → 2 (192.1–197.2 s, 1852 damage on sniper 3). On drones and crates it zapped once per second
  at about 40 energy, i.e. it was energy-starved by its own boosting and hopping.
- No chain was ever triggered (never two targets within 14 m), so chain damage is unverified.

## 9. Deaths (`deaths.txt`)

| victim | t (s) | killer | weapon | mech attackers in the last 10 s | damage in the last 10 s (by weapon) | median distance to main attacker | rear share of damage | unbroken fight before death | nearest wall at death | attackers the victim never shot at |
|---|---|---|---|---|---|---|---|---|---|---|
| hard 1 | 41.7 | brawler 9 | gun | 2 | 708 (gun) | 72 m | 21% | 3.1 s | 33 m | farmer 5 |
| expert 13 | 66.1 | medium 15 | gun | 2 | 884 (gun) | 47 m | 63% | 8.3 s | 22 m | sniper 3 |
| medium 15 | 67.7 | sniper 3 | gun | 2 | 531 (gun) | 39 m | 36% | 6.1 s | 40 m | sniper 3 |
| thirdparty 11 | 67.8 | expert 0 | laser | 1 | 650 (laser) | 49 m | 100% | one shot | 12 m | expert 0 |
| sniper 10 | 69.5 | medium 8 | laser | 1 | 393 (gun 328, laser 66) | 61 m | 19% | 17.0 s | 40 m | – |
| hard 14 | 81.3 | brawler 9 | gun | 2 | 1186 (gun 1067, lightning 119) | 62 m | 96% | 13.6 s | 28 m | brawler 9 |
| expert 0 | 98.5 | sniper 3 | gun | 2 | 702 (gun) | 66 m | 13% | 13.2 s | 12 m | brawler 9 |
| expert 6 | 125.1 | brawler 9 | gun | 1 | 1615 (lightning 1030, gun 585) | 31 m | 0% | 11.4 s | 12 m | – |
| thirdparty 4 | 136.5 | hard 7 | gun | 1 | 980 (gun 648, mortar 332) | 75 m | 11% | 20.5 s | 22 m | – |
| hard 7 | 136.8 | thirdparty 4 | gun | 1 | 701 (gun 646, mortar 55) | 74 m | 0% | 20.7 s | 28 m | – |
| medium 8 | 137.8 | sniper 3 | gun | 1 | 838 (gun) | 40 m | 0% | 10.8 s | 10 m | – |
| farmer 5 | 160.7 | farmer 12 | mortar | 2 | 1018 (gun 930, mortar 88) | 103 m | 12% | 21.8 s | 26 m | – |
| farmer 12 | 168.6 | brawler 2 | laser | 2 | 1550 (laser 1037, gun 351, mortar 163) | 168 m | 38% | 1.9 s | 7 m | brawler 2 |
| sniper 3 | 198.0 | brawler 9 | lightning | 1 | 2185 (lightning 1852, gun 333) | 35 m | 0% | 11.9 s | 40 m | – |
| brawler 2 | 209.7 | – | zone | 0 | 603 (zone) | – | – | – | 16 m | – |

- Killing blow: gun 9, laser 3, mortar 1, lightning 1, zone 1. Damage in the last 10 s over all deaths: gun 59%,
  lightning 21%, laser 12%, mortar 4%, zone 4%.
- Whole match, damage to mechs: gun 23 852 (61%, 433 hits), laser 7386 (19%, 11 hits), lightning 3000 (8%), mortar
  2425 (6%), zone 1456 (4%), drones 930 (2%). Rear hits were 76 of 530 weapon hits (14%) but 27% of the damage in
  the last 10 s of a life.
- 7 of 14 combat deaths had two attackers, and in **7 deaths the victim never fired at one of its attackers**
  (third party or shot from outside its view). Hard 7 and thirdparty 4 killed each other 0.25 s apart.
- 9 of 15 died more than 20 m from any wall taller than 4 m (median 22 m). Victims were airborne 41% of their last
  10 s. Median distance to the main attacker 62 m (p25 42, p75 74) — inside the 78%-or-better hit band.
- What kills house bots most often: sustained gun fire at 40–75 m while they keep trading in the open with no
  retreat, frequently with a second shooter they are not facing. The lightning brawler and rear / cook-off laser
  hits produce the fastest kills.
- Final ranking: brawler 9 won (4 kills, 7794 damage dealt, 16 cubes, lightning + two gun_damage upgrades); the three
  experts placed 9th, 10th and 15th.

## 10. Server mechanics checked numerically (`mech_move.txt`, `mech_dmg.txt`, `mech_regen.txt`, `mech_weapons.txt`, `mech_splash.txt`, `cadence.txt`, `take_timing.txt`)

Values are for the replay build; see section 0 for what changed since.

| item | result | evidence |
|---|---|---|
| decision / fire timing | all 1118 fire events and 40 charge starts fall on odd ticks (first tick after a decision); beams on even ticks | parity counts |
| walk / boost top speed | 9.0 / 15.0 m/s; 4.5 m/s while charging a laser | modes over 11 060 / 1048 / 202 frames |
| ground acceleration | 45 m/s² (first frame displacement 0.34 m = 3·a·dt²) | 14 mechs at t=0 |
| jump | take-off 11 m/s; apex 2.5 m (clean jumps) | z profile 0.94, 1.65, 2.15 m at 0.1 s steps |
| jet | climbs 8.9 m/s (cap 10 minus gravity·dt); drain 20 energy/s; ground boost drain 26/s | 2024 frames; 104 runs; 34 runs |
| energy regen | 18/s (23.4 with one `reactor`), starts 0.6 s after the last spend | 125 + 10 runs; 590 of 653 delays = 0.6 s |
| gravity | 22 m/s² | second differences alternate 21 / 23 (rounding) |
| HP regen | 45/s (72/s with `nanites`), starts 5.0 s (3.5 s) after the last damage taken | 2295 + 363 frames |
| regen timer reset | by taking damage, by damaging a mech (0 regen frames in 1129), by damaging a drone (0 in 50); **not by damaging a crate** (150 regen frames of 158) | `mech_regen.txt` |
| rear multiplier | ×1.5 exactly; e.g. 45 → 67.5, 46.8 → 70.2, 83.32 → 124.98 | gun hit table |
| cube damage scaling | ×(1 + 0.04·min(cubes, 10)); `gun_damage` ×1.15 each; `armor` −8% each; reported `amt` is clamped to the HP left | 573 of 604 gun hits match to 0.01; the other 31 are clamps (30 on a crate's last hit, 35 on a drone's) or straddle a cube pickup |
| max HP | 1400·(1 + 0.04·min(cubes, 10))·1.15^plating (1960 at 11–16 cubes, 2518 at 9 cubes + 2 plating) | frame table |
| laser damage vs charge | only full charges exist (13 ticks): 420·cube·rear·cook-off, e.g. 453.6·1.5·1.6 = 1088.64 | 11 hits |
| mortar | launch 72.0 m/s, gravity 22.0; direct hit 200 flat, splash 160·f with f = 1 − 0.7·d/R and d measured to the body surface (axis distance − 2.5 m): rms error 0.04 in f | 57 shells, 18 hits, 17 concussions |
| concussion | horizontal 16·f m/s away from the blast, vertical 9·f m/s, energy drain min(45·f, energy left) | 17 events (4 with drain clamped) |
| lightning | 60 base, ×1.1 per `lightning_efficiency`; one target per zap in all 47; arc starts on the mech axis at 7.0 m; about 5.5 energy per zap (3.6 and 2.3 with one and two efficiency upgrades) | 47 zaps |
| laser geometry | beam starts 3.0 m out at 7.0 m; maximum length 280.0 m | 39 beams |
| drones | wander 3.0 m/s, chase 5.0 m/s; bullets 90.00 m/s every 20 ticks, 25 damage (37.5 rear); 66% of their shots hit a mech; never more than 29.9 m from home; fired first (unprovoked) with the nearest mech at 39.8–46.7 m; answered attackers out to 84.7 m | 53 drone shots |
| crate HP | 300 exactly for all 16 destroyed | damage sums |
| turn limits | yaw 4.0 rad/s (5.2 with `gyros`), pitch 3.0 rad/s, pitch range −0.70…+1.30 | 1309 frames at the yaw cap |
| supply drop | +3 cubes, HP set to the new maximum, 4.0 s capture | 2 captures |
| weapon take | all 16 takes happened with the mech 2.7–3.5 m from the pickup on the previous tick | `take_timing.txt` |

Not verifiable here: lightning chain amounts (no chain occurred), laser damage at partial charge (none fired),
drone chase leash (no drone left its 30 m home radius), upgrade offer logic.

## 11. Cross-check on the current build (`stream_check.txt`, `stream_laser.txt`, `stream_dump.txt`)

`kit/check/stream.jsonl.gz` holds 300 observations (ticks 0–736) of one mech, config identical to
`notes/hello_example.json`. Its own actions are not recorded, but its state and what it saw are.

- It behaves like the replay's house bots: the same hop (14.9 m apex, 3.1 s, 22.5 energy = 1.5 s of jet at 15/s),
  a continuous torso sweep of ±46° with a 4.8 s period while walking, strafing with reversals (median 0.6 s).
- **Gun aim, 252 m/s:** its torso yaw equals the first-order intercept computed from the previous observation with
  residual sd 0.02° (n=141, slope 1.00). The enemy it fought (mech 10) shows the same: median |residual| 0.03°
  against the 252 m/s intercept, 1.19° against the direct bearing (n=98, 91–151 m).
- **Gun cadence:** it fired every 6 ticks (0.30 s; cooldown read-outs 0.19, 0.09, 0 on successive observations) and
  reloaded in 50 ticks. A bot that only pulls the trigger when the observation shows cooldown 0 gets 0.30 s, not
  0.24 s. Whether holding the trigger gives 0.24 s cannot be seen in either file.
- **Laser, current build:** mech 10 kept turning while charging (aim stayed within 2.6° of the bearing to the
  target in every charging frame), released at full charge (8 frames), and on the release decision its yaw
  equalled the direct bearing from the previous observation (three releases with a previous observation: 0.0°,
  0.0°, 0.0°, although the gun lead at those moments would have been 0.5–1.5°). Six laser shots: **4 hits of 315**
  at 56–151 m on a strafing target and 2 misses. One miss was fired just after mech 10 dropped out of the stream
  mech's view (line of sight lost at the release; only the sound arrived), the other was released after about
  0.2 s during mech 10's own hop with the aim swung 22° away and level. Shortest gap between beams 54 ticks. So the
  28% laser hit rate of the replay does not carry over: with the torso free during the charge the house-bot laser
  hit every time it still had a line of sight at the release (4 of 4), and missed when it did not (n is tiny).
- Enemy bullets in the observations travel at 252.00 m/s.

## 12. Exploitable patterns

Each line: the pattern, the supporting number, and how far it can be trusted.

1. **Pure first-order lead, no noise, no delay.** Constant-velocity targets are hit 84% of the time at 0.3–1.0 s
   flight time; targets that reverse or turn more than 60° during the flight are hit 22–24% (n=153). Under 0.3 s of
   flight (75 m at 252 m/s) nothing dodges: 41/41 on grounded targets. Beyond 0.5 s (126 m now) grounded strafing
   targets were hit 16–32%. *Solid (805 shots); confirmed on the current build to 0.02°.*
2. **Misses go ahead of the target.** 52% of bullets at 80+ m pass more than 2.8 m ahead, 10–16% behind. Braking or
   reversing is what beats the predictor; holding speed is what gets hit. *Solid.*
3. **Jumping is counter-productive.** Airborne targets were hit 92% vs 57% (0.4–0.5 s flight) and 77% vs 32%
   (0.5–0.6 s). The predictor includes gravity and the ground. The same holds in reverse: a house bot is in its
   3.1 s hop for 32% of its engaged time and is then a ballistic target (jet phase: constant +8.9 m/s for 1.5 s).
   *Solid for the gun.*
4. **Magazine rhythm.** 12 shots, then 50 ticks (2.5 s) with no gun fire; with the current 6-tick cadence a full
   magazine lasts 3.3 s. They never stagger or save rounds. *Solid.*
5. **They only shoot with a clear line (99.6%)** and need a median 1.15 s (p25 0.65 s, floor 0.25 s) from a line
   opening to the first shot. Hard cover removes all incoming damage; exposures shorter than about a quarter of a
   second drew no fire. *Clear-line rule solid; the delay is inflated by unmodelled tree cover.*
6. **View-wedge blindness.** An attacker outside the victim's 120° wedge and beyond 45 m dealt a median 189 damage
   (mean 383) before any return fire, against 61 (mean 110) from inside the wedge; the victim turned within 10 s in
   50% of cases (8 of 9 for sustained attacks, median 2.25 s). While travelling, the rear 60° is in view 1–3% of
   the time. *Moderate (32 cases); the practice squad shares vision, which may remove this.*
7. **No retreat, no healing behaviour.** At under 20% HP they still fire in 77% of frames; regeneration only
   happens when a fight ends by itself. A damaged house bot stays killable. *Solid.*
8. **Third-party deaths.** In 7 of 14 combat deaths the victim never shot at one of its attackers. *Free-for-all
   only.*
9. **Brawler rush.** Closes at +4.9 to +5.6 m/s at every distance from 30 to 140 m (+8.1 beyond) with the least strafing (lateral speed
   3.8 m/s against 4.8 average, 75% of frames closing). With lightning it needs to be within 45 m and was for only
   18 s of 199 s; a burst then lasts until its energy is empty (18 zaps ≈ 5.4 s). *Two mechs.*
10. **Range keepers back off.** Expert opens distance below 70 m (−1.0 to −1.4 m/s), sniper below 70 m (−1.4 to
    −1.5), thirdparty below 70 m (−4.2 to −5.6). Pushing them does not make them stand; the sniper stands still for
    21% of its engaged time and fires 19% of its shots motionless. *Per-type, small samples.*
11. **Mortar is a mid-range weapon in their hands.** 42% of shells did damage at 40–80 m, 0 of 8 beyond 130 m; one
    shell in the match was fired inside 40 m; lead is linear to a ground point. *57 shells.*
12. **They do not react to a laser charge.** Flip / jump / boost rates during a charge equal their baseline. With a
    torso that turns freely during the charge (current build) our own laser should land on them like theirs did on
    the stream mech (4 of 6, both misses without a line of sight). *Reaction finding from the old build; behaviour may have been updated.*
13. **High roofs and roof loot are untouched.** 0 of 10 roof weapons taken, 2 of 9 roof crates destroyed, highest
    roof ever stood on 14.0 m, 2.2% of time on any roof; all roof weapons lay at 13–23 m. *Solid for this match;
    whether they pursue or can hit a mech on a tall roof is unknown.*
14. **Cubes from dead mechs are left behind.** 35 of 53 never collected (median delay 12.3 s for those that were).
    *Solid.*
15. **Shooting crates does not interrupt HP regeneration** (150 of 158 frames). Damaging a mech or a drone does.
    *Replay build; needs one test on the current server.*
16. **Zone and navigation.** They enter the next circle 33–58 s before it starts to shrink and sit at a median
    0.41 of the radius, so the edge is empty of house bots (7% of time in the outer fifth). One bot was trapped in
    the stadium bowl for 80 s and died to the zone. *Rotation solid; the trap is one case.*
17. **Supply drops pull the nearest one or two bots into an 8 m ring**, one of them 9 s before landing; it was
    killed standing there. *Two drops.*
18. **Drones.** Experts spend their first 3–6 s shooting the spawn drone; a drone answers its attacker out to 85 m
    and hit mechs with 66% of its shots, 25 damage each. *Small numbers.*

## 13. What this replay cannot tell

- How the practice squad picks, shares and focuses targets, or how many bots hunt at once.
- Anything about the `easy` type, or whether brawler / sniper / thirdparty / farmer exist in practice matches.
- Hit rates against a target that dodges on purpose (all targets here were house bots).
- Behaviour against a mech holding a tall roof, behind tree canopy, or using cover deliberately.
- Late-game play: the match ended at 209.65 s, before the third circle; no data on circles of 140 m and smaller.
- Whether a held trigger fires every 0.24 s, and whether the regen-while-shooting-crates rule still holds.
- Upgrade preferences (the offers are not recorded), lightning chains, partial laser charges.

## Appendix: scripts

`tools/forensics/run_all.py` runs everything (about 10 s) and writes `tools/forensics/out/logs/<script>.txt`;
`tools/forensics/build_model.py` then writes `notes/housebot_model.json`. `common.py` holds the replay loader and a
bilinear terrain sampler with point-in-prism tests (support-surface check: feet height of grounded mechs matches the
sampled surface to 0.005 m at p99); `shots.py` maps projectile ids to fire events; `gunshots.py` builds the per-shot
table used by the aiming, targeting, movement and death scripts. Line-of-sight tests sample the segment every metre
against terrain and prisms and ignore trees.
