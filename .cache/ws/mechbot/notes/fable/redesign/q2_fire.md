# Q2 fire control: questions, own numbers, variant spec 'e'

Exchange rate used throughout (rules bible section 9): 1 point = 390 HP of ours = about 1400 damage out.
All numbers derived from the rules, not from 2696's constants. Nothing here is measured yet; every rule has a counter.

## Derived numbers
- Gun spread model: Gaussian 0.6 deg per axis = 0.0105 rad, so sd = 1.05 / 1.57 / 2.09 / 2.41 m at 100 / 150 / 200 / 230 m.
  Body half-width 2.5 + 0.3 (bullet) = 2.8 m. Centre-aim hit chance 99 / 92.5 / 82 / 75% - matches the measured
  99 / 92 / 82 / 76, so the model is right and lateral error is the only thing that matters (vertical half-height 4.8 m is 2-4.5 sd).
- A round costs 0.24 s + 2.4/12 = 0.44 s of cycle; waiting one decision costs 0.10 s. Fire now iff p_now >= 0.77 x p_centre.
  That is a lateral aim error of about 2.0 m at every range (0.7 x 2.8 m), NOT minus spread. Our gate (2.8/R - spread, floor 0.004 rad)
  allows 1.23 m at 150 m and 0.9 m at 230 m: too strict by 2x at long range. 2696's 0.85 r = 2.1 m is about right.
- Gun aim height: centre is best in the open; aiming at 0.65 h loses 1.4% at 150 m, 7.6% at 230 m; their "0.6 m under the top" point
  would lose 28% at 150 m. With cover the best point is the middle of the visible span, not the top.
- Laser DPS(c) = 315(0.35 + 0.867c)/(c + 1.65): 84 at 0.15 s, 131 at 0.75 s, strictly rising. A partial beam is never worth it for
  damage; only for a kill, and then only if the gun cannot do it: a 0.15 s kill-release spends a 1.8 s cycle (up to 315) to save 0.25-0.5 s.
- Laser aim point: no headshots, no spread, so height only buys line clearance. Top-first is right only under partial cover; centre has
  the largest slew margin. A missed beam costs 315 (0.22 point), so measure hit/release before changing.
- Charge cannot be cancelled and a full charge self-fires 2 s later (hold_s). A pre-charged beam lands 0.75 s earlier = +0.31 beam (98 dmg)
  per line opening; a wasted self-fire costs 1.65 s = 0.69 beam. Pre-charge pays only when P(line within 2.7 s) > 0.69.
- Reload is 2.4 s whatever is left; rounds are free. An early reload during a lull is never worse after (ammo x 0.24 + 2.4) s.
  Ours waits for <= 4 rounds; at 5-8 rounds we enter the next fight with 1.2-1.9 s of fire, then 2.4 s silent inside the house bot's
  1.15 s reaction window.
- Regen 45 HP/s = 0.115 point/s. Gun-only fire at 150-230 m = 80-98 DPS = 0.06-0.07 point/s; gun + laser = 0.165 point/s.
  One hit that breaks RUNNING regen costs up to 225 HP (0.58 point) = 810 damage = 3.5 s of gun + laser fire. Starting the clock from
  zero is not worth it (5 s dead; median lull 6.3 s).
- Predictor: a house bot walking straight at us has zero lateral velocity, so the lead is radial and every predictor gives the same
  angle. The five-predictor replay is worth nothing in SQUAD; current velocity is enough. Our jink rule (half lead after 2 reversals)
  can only hurt against bots that never jink.
- Rear x1.5: unreachable in SQUAD (the hunter's torso is on us, +-46 deg sweep < 90 deg). Gun during charge: our code already does it;
  the laser takes the torso only for the last 0.15 s, costing at most 1 round per cycle on crossing targets, 0 on approaching ones.

## Variant 'e' (6 rules)
| # | Trigger -> action | Hypothesis | Sign | Mode | Counter |
|---|---|---|---|---|---|
| e1 | Gun yaw gate = max(0.004 rad, 0.70 x (radius + 0.3) / R), no spread term; pitch gate same form with visible half-height | fewer delayed rounds beyond 120 m at p >= 0.77 x best | + small (0 to +0.05) | both | `gateBlocked` (gunReady and not fired) per match, before/after; hits/shots per 50 m bin vs 99/92/82/76 |
| e2 | Target hp <= 90 x dmgMult AND gun has >= 3 rounds, clear line, R <= 150 m AND our hp >= 25%: no laser release at it (neither full nor kill-partial); hold the charge, gun finishes, beam goes to the next target | saves up to 225-315 damage per kill, about +5% kills | + (0.05-0.15) | both | `beamHeldForGun`, `overkillDmg` (beam damage minus target hp at release) |
| e3 | No line in or out for 0.4 s and ammo <= 8 (<= 10 if no listed mech within 150 m) -> reload; never while a target under 300 hp is in sight | every opening has >= 9 rounds; +180 front-loaded damage per opening | + small | both | `earlyReloads`, `ammoAtLineOpen` histogram, `reloadCaughtByLine` |
| e4 | Regen running (5 s since dealt and taken), hp < 90%, target has no line on us or its torso is > 30 deg off us, shot would not kill -> hold all triggers; cancel on any damage or hp >= 95% | 45 HP/s beats 80-98 DPS gun fire; one beam costs 0.58 point of regen | unknown, likely + (0 to +0.15) | SQUAD only | `regenHoldDecisions`, HP regenerated while held, `regenBrokenByOwnShot` |
| e5 | Listed target (5 s true-position memory) within 260 m, closing >= 8 m/s, and our muzzle line to its position at +0.5 / +1.0 / +1.5 s is clear -> start the charge; force-release delay 1.5 -> 1.9 s | beam within 0.2 s of the line opening; +0.31 beam per opening | + (0.05-0.1) | both | `snapBeams` (release <= 0.3 s after line-open), `blindReleases` (release with no hit event); abort if blind/snap > 0.45 |
| e6 | Laser rung: 0.5 h if clear to the predicted point, else highest clear rung (0.8 -> 0.2); jink half-lead off in SQUAD | larger slew margin, fewer missed beams; correct full lead on turning walkers | + only if the baseline laser hit rate < 95% | rung both; jink SQUAD | `laserHits / laserShots` per rung; gun hits/shots when target lateral speed > 3 m/s |

Test order: e2, e3, e5 (pure arithmetic gains), then e1, e6 (need the baseline counters first), e4 last (sign unknown; one-change test).
Not recommended: motion-predictor replay, partial beams for damage, rear-arc seeking, top-of-body gun aim.
Open [N] that changes e2/e5: whether the server really applies gun fire during a laser charge - count `gunShotsWhileCharging` and their hit events first.
