# Structural strategies for a practice score of 9 (Fable panel, structural strategist)

Written Sun 22 Nov, about 01:30-02:15 UTC. Read-only on `bot/`, `sim/`, `r7work/ckpt_0*`, `variants*`. Scratch:
`scratchpad/fable_work/struct/` (`geo.js`, `geo_out.txt`, `replay_stadium.py`, `roofbot.js`, `perchstat.js`,
`run_{ground,roof,peek}.{txt,json}`, `simw/` = a copy of the simulator). No fuse trips in any batch used.
Tags: [M] official, [R] replay / kit stream, [G] geometry computed from the map files, [S] simulator (mechanism
only, ranks nothing), [A] arithmetic, [N] no evidence.

## 0. Verdict

1. **9 is an hp-budget problem, not an aim problem.** Kills before death = (damage dealt per hp lost) x (hp we can
   spend) / 1400. Today the spend is one life (1.05-1.3 x 1400 [S]) at about 5.4 kills per life [M 5.38]. 9 needs the
   exchange ratio x 1.67, or 1.67 lives. Regeneration (45 hp/s after 5 s without taking or dealing damage) gives
   0.67 of a life in 26 s of real silence, in two or three breaks.
2. Every official attempt to buy that silence on the ground lost (healDoc -0.21, FHE40 -0.06, pulse retreat -0.17, LX,
   FOH) because the squad shares vision, never retreats and walks as fast as we do. **The one place where silence is
   geometric is above them: a roof the house bots do not climb.** In the replay no house bot ever stood higher than
   14.0 m above terrain (16 mechs, 209 s) [R]; this map has 35 roofs at 17 m or more with a centre point 9 m from every
   edge [G].
3. Ranking: **(1) roof sanctuary (fight from the edge, heal at the centre)** > **(2) timed peeks with a pre-charged
   laser** (works at any corner, best from a roof edge) > **(3) deep pockets / courtyards** (same idea, 3 usable sites
   on this map) > **(4) ground choke holding** > **(5) economy first** (already measured negative; only the upgrade
   order changes under 1).
4. Simulator, trivial shooter, 24 seeds: standing on a roof gives 2.6 x the survival time (162 s against 62 s), 1.55 x
   the hp budget (1.65 x in the 19 matches that reached the roof) and half the intake rate (12.7 against 23.5 hp/s),
   with the same exchange ratio (2.2-2.5). That is the mechanism of point 1: more hp to spend, not better trades.
   With our real brain's ratio the same budget factor reads 5.4 x 1.65 = 8.9 [A on S + M; not a prediction].
5. **The whole line rests on one unknown [N]: whether official squad hunters follow onto a roof above their hop
   height or fire up from long range.** The server is deterministic, so one probe submission answers it (section 6).

## 1. Evidence gathered now

### 1.1 Replay: nobody reached the stadium bot, and house bots stay low [R]
- `replay_stadium.py`: the brawler that spawned inside the stadium (id 2) took **0 mech damage in 209.65 s**, killed one
  mech with a laser from 144 m (target at ground level, it was on the stands, z up to 42 m), and died to the zone in
  2nd place. No other mech ever came within 70 m of the stadium centre.
- `geo.js` part A: share of grounded frames more than 4 m above terrain: 11 of 16 mechs 0-1%, the rest 4-24%; **maximum
  height over terrain 14.0 m** (decks and low roofs, reached with the fixed 1.5 s jet hop: 2.5 m jump + about 12 m of
  jet). Hits on elevated victims exist (161 of 476 mech hits), so low decks are not safe.
- Limits: one free-for-all match on the older build; the practice squad's path code is unknown.

### 1.2 Map geometry (`geo.js`, 2 m sampling, 9 s total; at match start the perch table alone takes 0.5 s) [G]
- Roofs: 176 prism tops at 6 m or more over terrain; 84 have a point 6 m or more from every edge and 300 m2 or more.
  Heights: 31 at 6-15 m, 45 at 15-25 m, 6 at 25-40 m, 2 above the jet ceiling (59 m with 100 energy).
- Sanctuary filter (height >= 17 m, centre setback >= 9 m, a main-component launch cell beside it, climb <= 45 m):
  **35 perches**, climbs 13-34 m (median 20 m = 2.2 s of jet, 34 energy). 32 lie inside the first circle, 19 inside
  380 m of the start centre, 7 inside 240 m, 0 inside 140 m. From the 16 replay spawns the nearest launch cell is at
  4 / 73 / 204 m (min / median / max): 6 s of walking at the median.
- Exposure = share of ground cells within gun range (230 m) with a clear shot from muzzle height to our body centre.

  | Where we stand | lines within 230 m (median) | weighted by house hit rate | lines within 60 m (median) |
  |---|---:|---:|---:|
  | random ground cell (400) | 0.67 | 0.41 | 1.00 |
  | roof centre, all 82 usable roofs | 0.29 | 0.16 | 0.24 |
  | best 15 roof centres | 0.02-0.21 | 0.02-0.08 | 0.00 on 7 of 15 |

  On the tall roofs the nearest ground cell with a line is 65-108 m out: a hunter that closes (they all do) walks
  into the blind strip under the wall. The house gun hits 87% at 76-101 m, 53% at 126-151 m, 27-29% beyond 176 m [R].
- Ground: only 0.4% of ground cells have weighted exposure <= 0.03 and 1.3% <= 0.05; even the best 12 ground cells
  show 15-62% of the cells within 60 m with a line.
- Pockets (ground components other than the main one, 25 cells or more): 12. Only three have no ground line at all:
  the stadium bowl (40,132 m2, exit climb 3.7 m), a courtyard at (202, 210) (552 m2, walls 20.6 m) and a corner at
  (532, -208). The other nine are low decks with exposure 0.1-0.6.
- The geo script's "edge stance" row is not used: its edge walk can stop at a higher neighbouring roof.

### 1.3 Simulator mechanism run (`roofbot.js`, squad mode, seeds 1-24, one job each, fuse 0) [S]
The bot is a trivial shooter (nearest visible mech, first-order lead). `ground` stands in the next circle; `roof`
climbs the cheapest perch inside the next circle and stands at its centre; `peek` steps 6 m toward its target while
the gun has rounds. The simulator's house bots are our own stand-ins: their roof behaviour is a guess.

| arm | n | kills | alive s | taken/s | dealt/s | dealt/taken | hp spent / 1400 | hunters at death |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ground | 24 | 1.12 | 62.4 | 23.5 | 58.9 | 2.51 | 1.05 | 2.3 |
| roof, all | 24 | 1.42 | 162.2 | 13.4 | 29.2 | 2.18 | 1.55 | 3.0 |
| roof, reached the roof | 19 | 1.53 | 182.2 | 12.7 | 28.4 | 2.23 | 1.65 | 3.3 |
| roof, never got up | 5 | 1.00 | 86.3 | 19.0 | 36.1 | 1.90 | 1.17 | 2.0 |
| peek, reached the roof | 19 | 1.53 | 126.9 | 14.6 | 34.8 | 2.39 | 1.32 | 2.6 |

- The climb itself works in the simulator's physics (19 of 24; the 5 failures are launch cells my 16-ray search chose
  badly, 5-14 retries).
- Kills did not rise much because the probe never heals on purpose, splits its fire and cannot shoot into the blind
  strip. Deaths on the roof: gun 12, lightning 7, laser 5, mean killer range 69 m; I did not check whether the
  stand-ins climbed.

## 2. Strategy 1: roof sanctuary (rank 1)

**Mechanism.** A roof higher than the house hop (17 m or more) with a centre 9 m or more from the edges has two
stances: *edge* (lines only to the hunters on that side, further than about 1.2 x (H + 2.5) m because pitch stops at
-0.7 rad) and *centre* (no line to anything within 65-108 m). Moving between them costs under 1 s and no hunter can
follow. So: fight at the edge while hp >= 50%, step to the centre, wait 5 s + (deficit / 45) s, return on the side
with the fewest hunters.

**Numbers [A].** Per 26 s break: +940 hp = 0.67 life = +3.6 kills at today's 5.4 per life. Two breaks before the
second circle closes (195 s) is 52 s of 110 s spare. Kill time with a laser is 10.7 s per hunter (131 dps), so 9 kills
need about 96 s of firing: the budget fits inside phases 1-2 only if we are on a roof by about 30 s.
Lanchester: at the edge the lines are the hunters of one side beyond the blind strip, about 1-2 of 3-4; cost n(n+1)/2
drops from 6-10 to 1-3 per round.

**Computing it without this map.** At `hello`: sample `world.surfaceZ / surfacePrism` on the nav grid (2 m); roof cell
= prism top, open sky, top - ground >= `sancMinH`; setback = distance to the nearest cell whose top differs by more
than `step_up`; per prism keep the max-setback point; launch cells = main-component cells 4-9 m outside the edge with
`top - level <= energy / jet_drain x (max_rise - 1)`. `sancMinH` = 1.2 x the highest mech seen above terrain so far,
starting at jump apex + 1.5 s of jet (config values). 0.5 s here for 35 perches; exposure of each perch (shotClear to
a 6 m lattice within gun range) another 1-2 s, or lazily for the 3 nearest.

**Code.** New `lib/sanctuary.js` (about 220 lines: table, pick by walk + 2 x climb inside `next_radius - 25`, exposure,
edge points per side). `mover.js` +60 (leg `climb`: stop at the launch cell, wait for energy, jump + boost, drift in
once feet > roof + 0.8; leg `drop`). `nav.js` +40 (roof membership test so `findPath` is not asked for roof goals;
reuse `hopPlan` for getting down). `brain.js` +50 (mode SANCTUARY: enter when hp < `sancEnterHp` or 2+ lines and a
perch within `sancReachM`; centre until hp >= `sancLeaveHp`; edge-side choice = fewest known hunters). `tactics.js`
+20 (targets from the edge: prefer the hunter outside the blind strip with the lowest hp). Preset `sanc: { off, heal,
hold }`, off = byte identity. About 400 lines, one engineer-day; a `heal`-only first cut (go up only to heal, come
down to fight) is about 250.

**Risks.** (a) Hunters climb or the squad parks at range with lines: then a roof centre is still 0.16 against 0.41
weighted exposure, but there is no silence; the probe tells us. (b) House lasers (315 per 2.4 s, 280 m) and mortars
from range: step back from that side; lasers need the same line as guns. (c) Zone: only 7 perches inside 240 m and
none inside 140 m, so this is a phase 1-2 plan (to 195 s), which is all 9 kills need; leave when the perch is outside
the next circle 8 s before the shrink. (d) Hunters hugging the wall are unshootable from above (pitch limit): drop on
the far side, or carry a mortar for the strip. (e) Climb failure under fire: 2.2 s airborne and slow; climb only with
<= 1 line or at spawn. (f) Final map: the table is computed, but a flat map has no perches; preset falls to off.

## 3. Strategy 2: timed peeks with a pre-charged laser (rank 2)

**Mechanism.** House first shot comes 0.25 / 0.65 / 1.15 s (p10 / p25 / p50) after a line opens [R, 77 cases]; the
laser charges in 0.75 s and may be charged out of sight (`charge_move_mult` 0.5 slows the step, so charge standing,
release on the first clear decision). Peek = charge hidden, step 3-6 m to the edge or corner (0.3-0.5 s), release,
step back. Exposure about 0.5 s per 2.4 s cycle.

**Numbers [A].** P(a given hunter fires inside 0.5 s) about 0.2; it then lands about 2 rounds = 90 hp. Per peek with
n lines: 315 dealt for 18 n taken: ratio 17 / 8.7 / 5.8 for n = 1 / 2 / 3, against 2.5-5.4 today. Gun-only peeks do
not work (a magazine needs 3.3 s of line). So it needs a laser early: we hold one in 15-18% of decisions at k <= 3.

**Computing it.** Peek pairs (hide, show): for the current target, cells within 8 m of us where `shotClear` to the
target is false / true with 3-6 m between them; on a roof these are (centre-side, edge) pairs, on the ground wall
corners with `wallDist` 3-5 m. Computed per decision for the current target only (about 60 casts).

**Code.** `firecontrol.js` +40 (hold a full charge while hidden, release gate), `tactics.js` +80 (peek pair search,
cadence state machine keyed to laser cooldown 1.65 s and the 2.4 s house beam gap), `mover.js` +20. About 140 lines.
Preset `peek: { off, laser }`.

**Risks.** Hunters round a ground corner in 3-6 s (never retreat), so on the ground it is two or three peeks per
hunter; on a roof edge it is unlimited, which is why it ranks under 1 and with it. Needs the sensor fix for house
reload state already noted in `r1_psych.md`. LG wide (laser first) read -0.19 officially at salt 1.

## 4. Strategy 3: deep pockets and courtyards (rank 3)

Same silence as a roof where the walls are higher than the house hop: on this map only the courtyard at (202, 210)
(walls 20.6 m, 552 m2) qualifies; the stadium bowl has a 3.7 m rim (inside any hop) and leaves the default zone at
about 110 s, the third is at the map edge. The replay result (0 damage in 209 s) was a free-for-all without a squad
that knows where we are. Computation is already in `nav.js` (`comp`, `compSizes`, `hopPlan`); add `wallH` per pocket
= min exit climb, and treat pockets with `wallH >= sancMinH` as sanctuary sites in strategy 1's table (+30 lines).
Not a strategy of its own: fold into 1. Risk: inside a pocket we see nobody either (no kills while hiding), and a
hunter that does hop in fights us at point-blank with a 100% hit rate.

## 5. Strategies 4 and 5: ground chokes; economy first (ranks 4, 5)

- **Ground choke holding.** [G] 1.3% of ground cells have weighted exposure <= 0.05 and at the best of them 15-62% of
  the ground within 60 m still has a line; hunters walk until they have one. A choke therefore removes long-range
  crossfire but ends as a 60 m fight at 98% house hit rate, one or two lines at a time if arrivals are 13-35 s apart.
  Expected: fewer 3-line deaths, no new hp: about +0.3..+0.8 [A]. Compute: exposure field on a 6 m lattice (2 s) +
  articulation cells of the nav graph inside low-exposure regions; `lib/cover.js` about 200 lines + brain hook 40.
  It is `loseCover` / ISO taken further, and loseCover was worth +0.06 [M]; ISO is unread officially (3.75 against 4.04 in the simulator).
- **Economy first.** [M] farm-first opening -0.38 (V2), farmHp 90 inside noise. Three platings = 1.52 x hp only after
  about 3 offers, which arrive with kills. Under strategy 1 the order changes: nanites (regen 72/s, delay 3.5 s)
  cut a 1,000 hp break from 27.2 s to 17.4 s, and `jets` (-25% drain) buys a second climb; `upg` preset `sanc`:
  nanites > plating > jets > armor (10 lines in `economy.js`). Not a strategy alone.

## 6. What to do next

1. **Probe (one slot, answers [N]):** current best brain (FNV s1) + `sanc: heal` first cut: at hp < 55% with a perch
   within 90 m and <= 1 line, climb, stand at the centre until hp >= 90% or the perch leaves the next circle, drop on
   the side away from the last seen hunters. Read: score >= 5.9 = hunters do not reach us (build the full strategy 1
   + 2); 5.2-5.6 = they shoot up from range (keep `heal` only if above 5.38); < 5.0 = they climb (close the line).
   The simulator cannot answer this: its house bots are our guess.
2. Before the slot, in the simulator only as a filter: fix launch-cell choice (5 of 24 never got up), log lines on
   us at centre / edge, count of breaks and hp regained per match with the real brain.
3. If the probe is positive: edge fighting (strategy 1 `hold`), then laser peeks (strategy 2), then nanites-first.
