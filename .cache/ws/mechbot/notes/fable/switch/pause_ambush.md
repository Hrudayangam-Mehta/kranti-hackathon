# Switch panel, 3 of 5: pause / ambush designer

Written Sun 22 Nov, about 01:35-02:15 UTC. One author; nothing here is independent review.
Base: `r7work/ckpt_07_LG/lib` with the FNV_s1 SELECT (5.38 official). Nothing under `mechbot/bot`, `mechbot/sim`, `r7work`,
`variants*` or the repo was edited; no git, no server. Scratch: `fable_work/switch/pa/` (`recpa.js` recorder, `run.sh`,
`summ.py`, `cmp.py`, `lib/` = a copy of ckpt_07_LG/lib with the two prototypes, `sim/<tag>/sq<seed>.json`).
Tags: [M] official, [R] replay, [S] simulator (behaviour only, ranks nothing), [C] read in code, [A] arithmetic, [N] no evidence.
Simulator runs: `nice -n 19`, two jobs, on a box with load average 20-30 (other lanes); `fuseMs` 100000 so the load cannot
change decisions; fuse 0 and errors 0 in every match.

## 0. Verdict in brief

1. **The owner's picture ("always reacting and searching") is half right, and the wrong half matters.** Without a mech
   target we move in 88% of decisions (25.1 s per match, 35% of the life) [S]. But the *seek* legs proper are 1.8 s per
   match. The walking is roam 6.8 s, loot 6.9 s, grab 3.0 s, zone 2.7 s. A pause rule in `hunt.seekLegs` alone touches
   almost nothing; the place for a hold is the roam branch of `brain.holdLegs`.
2. **We already shoot first.** Of 172 fights that open from no target, we deal the first damage in 120 and the hunter in
   12 (median 0.9 s to our first hit, 2.5 s to theirs) [S]. An ambush cannot buy much more first-shot advantage; what a
   hold can buy is *where* the fight happens (cover behind us, one approach lane) and a full magazine / charged laser.
3. **The measurable loss is lines, not searching.** Intake is 19.5 dps with one line on us, 37 with two, 50 / 61 / 76 with
   three / four / five [S]: about 18 dps per extra line. 5.4 new non-target lines open per match during a fight;
   **31% of them (1.7 per match) open because we moved** (the shooter had no line to where we stood 1 s earlier), the rest
   because the hunter walked [S]. That 31% is the reach of `pauseMove`.
4. **Proposed presets** (all inert at 'off', byte-identical; all behind `hunt.firewall()`, so the final's FFA play and the
   late zone are untouched):
   - `pauseMove: off / on` : do not strafe into a line of a mech that has none on us (section 3). First to build.
   - `ambush: off / roam / on` : timed hold in place of the SQUAD roam, facing the last fix; `on` adds "let a closing
     prey walk in" (section 2). Second; expected small, sign uncertain.
   - `moveWin: off / on` : relocations (isolate cell, grab, hold-to-move) only inside an enemy silence (section 4).
5. Prototype results are in section 6. They are behaviour checks (does it trigger, does it remove lines), not rankings.

## 1. What the simulator shows today (48 squad seeds, base = 5.38 SELECT) [S]

| measure | value |
|---|---|
| kills / time alive | 193 (4.02 per match) / 71.0 s |
| decisions with no mech target | 12041 of 34077 (35%), 25.1 s per match |
| of those: moving (> 3 m/s) / still | 10617 / 1424 (88% / 12%) |
| legs with no target, s per match | loot 6.9, roam 6.8, grab 3.0, zone 2.7, huntsnd 1.1, hold 0.9, drone 0.9, hunt 0.4, huntlast 0.15, huntring 0.10 |
| fights opened from no target | 172 (3.6 per match), median range 127 m |
| who lands the first damage | we 120, they 12, nobody within 8 s 40 |
| median time to first hit, ours / theirs | 0.9 s / 2.5 s |
| the new line was opened by our motion / theirs | 23 / 149 (hunters come to us) |
| FIGHT decisions, moving | 20611 of 22036 (94%); `standoff` 8845, `isolate` 4021, `grab` 5939 (incl. no-target) |
| intake by lines on us (dps) | 0: 1.4, 1: 19.5, 2: 37.2, 3: 49.5, 4: 60.6, 5+: 76.0 |
| time with n lines, s per match | 0: 21.1, 1: 22.7, 2: 13.0, 3: 6.9, 4: 4.6, 5+: 2.7 |
| new non-target lines during a fight | 261 (5.4 per match) |
| ... opened by our motion / by theirs | 81 (31%) / 180 |
| ... by our leg | isolate 88 (25 ours), grab 73 (27 ours), standoff 56 (15 ours), zone 26 (7 ours) |
| first hp lost, median | 16.6 s |

Method for "opened by our motion": at the decision a mech first gets a line on us (none for 3 s before), cast its muzzle to
where we stood 1.0 s earlier (body centre and top); blocked = our motion opened it. Tree canopy is not a blocker, so this is
buildings and terrain only.

Readings:
- 59% of the intake arrives with 2+ lines on us (62900 of 85500 hp) in 38% of the time. One line fewer for the whole 2+
  time would be worth about 18 dps x 27 s = 490 hp per match [A, upper bound; nobody can remove every extra line].
- The legs that open lines by our motion are the *purposeful* moves (grab 27, isolate 25), not the strafe (15). So the
  line check belongs in the goal choice of those legs as well as in `mover.standoff`.
- "They come to us" holds: 149 of 172 openings are their walk, at a median 127 m, and we hit first. Standing still (21
  openings) kept the first-hit record (13 we, 0 they) but our first hit came later (2.2 s against 0.9 s): we were not
  facing the lane. Facing is the part of an ambush that pays.

## 2. (a) HOLD / AMBUSH: preset `ambush: off / roam / on`

**Trigger** [all must hold]: `B.env === 'SQUAD'` and `hunt.firewall()`; `B.mode === HOLD`; no target, no loot task, no
drop task, no grab; `me.hpf >= ambHoldHpf` (0.7); inside the zone with `B.zoneMargin > 15`; `t >= h50SeekFromS` (20 s; the
opening stays as it is: farm and power first).
- `roam`: the roam branch of `brain.holdLegs` (brain.js 374-391) and the blind seeks `huntring` / `huntlast` in
  `hunt.seekLegs` (hunt.js 303-309) become **hold `ambHoldS` 12 s, then a move window of 6 s** (section 4), then hold again.
- `on`: also, in `hunt.seekLegs` with a listed prey that is **closing on us** (closing speed >= `ambCloseV` 2 m/s, range
  <= `ambPreyR` 200 m, beyond the arrive range): stand, torso on it, let it walk in. A prey that is not closing (parked
  non-hunter) is still walked to as today.

**The hold cell** (new `stance.ambushCell()`, re-planned every 3 s, one A* at most, reuse `hideSearch` / `posEval`
sampling; budget 1-2 ms):
- within 30 m of us, same nav component, `zoneSlack >= 5` for the next 20 s;
- a wall or terrain step within 3-15 m on the side *away* from the expected approach, or hull-down cover (top 5.0-6.5 m
  above our feet) on the approach side (mechanics_deep 1: their centre-aimed shots hit the wall, our muzzle at 7 m clears it);
- a clear muzzle line of 80-160 m along the approach bearing (so the hunter is in the open when it gets its line: gun hit
  rate 92-99% inside 150 m) and at most one more open sector of 60 degrees;
- score = open length along the approach (cap 160) - 2 x open length off the approach - walk distance.
**Expected approach bearing**, first that exists: a remembered mech (conf > 0.3) with the largest closing speed; the
loudest gun / laser sound sector of the last 3 s (`hunt.soundGoal`'s sector table); `B.lastEnemy` within 60 s; the next
zone centre (the squad parks at 0.41 of the next radius).
**While holding**: legs 0 (silent: no `step` sound, hunters within 40 m lose that cue), torso on the approach bearing with a
+-30 degree sweep of 4 s (our 120 degree wedge then covers +-90), gun topped up (`reload` when ammo < 6 and no line), laser
charge started when a remembered closing mech's ETA to the line is <= 0.8 s (the M2 corner ambush code in stance.js
172-216 already does this for a *target*; reuse `amb.eta` for a prey).

**Code sites**: `brain.js holdLegs` (roam branch), `hunt.js seekLegs` (before `mover.moveTo`), `stance.js` (new
`ambushCell`, next to `idleLegs`; `idleLegs` itself stays: it is the opposite rule, `idlePull`, and is off).
**Parameters**: `ambHold` 0/1/2, `ambHoldHpf` 0.7, `ambHoldS` 12, `ambMoveS` 6, `ambCloseV` 2, `ambPreyR` 200, `ambCellR` 30,
`ambLaneMin` 80.

**Expected effect and mechanism**:
- For: the first hit comes sooner when we face the lane (0.9 s moving-and-facing against 2.2 s standing unfaced [S]); a
  full magazine and a charged beam at the opening (315 + 3 bullets in the first 0.25 s = 30% of a 1400 hp easy bot before
  its 0.25-1.15 s first-shot delay ends [R]); cover behind us keeps the *second* hunter's line shut longer.
- Against: seek and aggression were bought officially (`seek on` -0.02 alone, +0.06 with K0; `any70` positive [M]); in the
  simulator 23 of 49 kills were of mechs that were not hunting us [S, panel R7 game]. A hold gives those up. Every second
  of our life is worth about 100 hp dealt when in a fight, so idle seconds only pay if they arrive anyway.
- Net [A]: `roam` +0.00 to +0.05 kills per match, `on` -0.05 to +0.05. Low confidence. It is a re-roll of about a third of
  the matches, not a ladder step. **Do not spend an official slot on it before `pauseMove`.**

**Test**: (i) identity at 'off' (hash-equal action stream, 24 seeds + kit stream); (ii) scene test: no target, hp 100%,
t = 30 s, inside the zone -> legs 0 for 12 s, torso within 30 degrees of the last fix; (iii) scene: FFA latched or
`foreignDeaths >= 1` -> today's legs (firewall); (iv) behaviour, 48 seeds: `ambhold` decisions per match, first-hit time at
openings, share of openings we hit first must stay >= 0.65; stop if kills fall by more than 10% in the simulator.

## 3. (b) PAUSE inside a fight: preset `pauseMove: off / on`

**Trigger**: FIGHT, `hunt.firewall()`, `B.nLos >= 1`, and a listed or remembered (conf > 0.3) non-target mech within
`pmR` 220 m that has **no** line on us now.
**Rule in `mover.standoff`** (mover.js 134, after the strafe sign): for each strafe side test the point `pmHorizon` 0.7 s
ahead (walk speed x 0.7 = 8.2 m) against every such mech (muzzle to our centre and top, `world.shotClear`, 2 casts each).
If the current side opens a line and the other does not: flip (respecting the 0.4 s flip floor). If both open: strafe 0
(stand; the radial part of the dead band still acts). Bullet dodge (`mover.shellDodge`), beam hide and the zone legs stay
above it, so a pause never stands in a shell or outside the zone.
**Rule in the goal legs** (brain.js fightLegs): `isolate` (516-521) already asks `posEval` for `xOther`; with `pauseMove`
on, take the cell only if `xOther === 0` *and* the straight walk to it passes the same line test at 8 m steps; else stay in
the stand-off. `grab` (476, `econ.grabLegs(0.35)`): when `nLos >= 2`, postpone a grab whose walk opens a new line unless
the item is a laser we lack or a kill's cube pile within 12 m.
**Parameters**: `pauseMove` 0/1, `pmHorizon` 0.7, `pmR` 220, `pmMinLos` 1, `pmGrabNear` 12.
**Cost**: at most 2 sides x 6 mechs x 2 casts per decision = 24 casts, well under 0.5 ms; no A*.

**Expected effect and mechanism**: 1.7 own-motion lines per match [S]; a hunter that is denied a line walks on and finds
one, so the gain per denied line is a delay, about 3-6 s at 18 dps = 55-110 hp, i.e. 90-190 hp per match, 1-2 s more
life at the death-fight intake (50-76 dps), 100-200 more damage dealt: **+0.05 to +0.15 kills per match** [A]. It also
keeps the duel count down in exactly the k = 3-5 escalation fight where the R7 game note says the points are lost. Risk:
standing still against the *target* raises its hit rate (the strafe exists for a reason: gun spread 0.6 degrees does not
miss a still mech at 130 m). That is why the rule prefers the flip and stands only when both sides open a line.
**Test**: identity at 'off'; scene: target north at 100 m, a second mech behind a wall whose corner is 6 m to our east ->
strafe sign never points east while the second mech has no line, and flips within one decision; behaviour, 48 seeds:
own-motion lines per match (target: 1.7 -> under 1.0), decisions with 2+ lines, intake at 1 line (must not rise by more
than 10%: the stand-still penalty).

## 4. (c) MOVE windows: preset `moveWin: off / on`

A relocation is any leg that is not the stand-off strafe: ambush hold -> next cell, `isolate`, `grab`, `regain`.
**Open a move window when** (first that holds, all from data we already keep):
- every mech with a line on us is silent: `B.magStartT` is 12 shots x 0.30 s = 3.6 s old or a `reload` sound within 60 m
  on its bearing -> its gun is dead for 2.4 s [P/S]; this is the 2.5 s reload silence;
- a beam by the target or the top attacker ended in the last decision (`obs.beams`, `senses.js` already dates it): its
  laser is dead for 1.65 s + 0.75 s charge = 2.4 s;
- no line on us at all (`B.nLos === 0`) and no remembered mech with an ETA to a line under 2 s;
- our own weapons are both down (`hunt.spent()`): moving costs no damage dealt.
**Close it** after `mwMaxS` 2.4 s or when a new `laser_charge` sound / `charging:true` at us appears (then the strafe
flip of mover.js 128 takes over).
**Never wait for a window** when: zone (ZONE mode keeps priority), a shell is inbound, `B.killSecure` / a finishable
target (finish first), or the window has not come for `mwPatienceS` 4 s (a house bot fires a magazine in 3.6 s, so a
window always comes within one magazine).
**Code sites**: one helper `mover.moveWindow()` returning `{ open, until }`; consulted in brain.js fightLegs before
`isolate` and `grab`, in the ambush hold-to-move switch, and in `regain` only when hp < 0.5.
**Parameters**: `moveWin` 0/1, `mwMaxS` 2.4, `mwPatienceS` 4, `mwMagShots` 12, `mwShotS` 0.30.
**Expected effect** [A]: the 52 own-motion lines from grab + isolate (1.1 per match) move into silences, when the newly
exposed hunter is the only one that can fire: +0.02 to +0.08; mostly it removes variance. **Test**: scene with a scripted
12-shot magazine: the relocation starts within 0.2 s after the 12th shot and ends before 2.4 s; behaviour: share of
relocation decisions inside a window (today unknown [N]; measure before building).

## 5. (d) When to break the hold

| reason | exact trigger | action |
|---|---|---|
| zone | `B.zoneMargin < 15` or `zoneSlack(cell, t + 20) < 5`; ZONE mode always wins | leave now; next cell inside 0.6 of the next radius |
| a lone hunter | a listed mech within the band, `B.nLos <= 1`, no other mech within 100 m of it (`chooseStance`'s `alone`) | FIGHT as today (the aggr any70f gate); if it stalls 3 s without closing (`ambushStallS`), walk to it |
| a hunter that will not come | hold has lasted `ambHoldS` 12 s with no new sound or track | move window: 6 s toward the gunfire sector / last fix / parking ring (today's seek order), then hold again |
| crate / cube / laser | value per second: cube (+5% hp, size) or laser we lack within `ambLootR` 60 m of the cell and no closing mech with ETA < walk time + 3 s | fetch, return to the cell; a laser is always worth it before k = 3 (gun-only in 82-85% of decisions until then [S R7]) |
| supply drop | never in practice (lands at 95 s, we are alive at landing in 5 of 40 [S R7]) | unchanged |
| hp | `me.hpf < ambHoldHpf` | today's rules (HEAL is rare and closed officially; no new heal hold) |
| two or more hunters closing at once | 2+ remembered mechs closing, ETA within 3 s of each other | do **not** hold the open lane: step back so the cell's wall cuts the lane to one mech at a time (`posEval` with `xOther === 0`) |
| FFA latch / first foreign death / late zone | `hunt.firewall()` false | preset inert; FFA posts (`postLegs`, gate post) as today |

## 6. Prototype behaviour check [S]

Prototype = `fable_work/switch/pa/lib` (params `ambHold`, `pauseMove`; identity at the defaults checked on seeds 1 and 5:
same kills, time alive and leg histogram). `amb2` = hold in place of roam / blind seek plus "wait for a closing prey"
(a plain stand where we are: **no ambush cell search, so it tests the pause, not the position**). `pm1` = the strafe rule
of section 3 only (no change to `isolate` / `grab`).

Seeds 1-24, squad, against the base on the same seeds:

| measure (24 matches) | base | amb2 | pm1 |
|---|---|---|---|
| matches whose play differs | - | 24 | 19 |
| kills | 95 | 86 (8 up, 11 down) | 100 (5 up, 8 down) |
| time alive, s | 1692 | 1935 | 1772 |
| `ambhold` decisions | 0 | 2530 (10.5 s per match) | 0 |
| no-target decisions / of them still | 6038 / 579 | 7171 / 3078 | 6388 / 806 |
| own-motion non-target lines in a fight | 52 | 61 | 49 |
| decisions with 2+ lines on us | 6467 | 7206 | 6373 |

Readings (behaviour only; 9 kills either way in 24 matches is inside the seed noise, and the up / down counts say so):
- **`amb2` does what the owner asked and the simulator does not reward it**: 10.5 s per match of standing, 14% longer
  life, 9 fewer kills. A plain stand where we happen to be trades kill reach for seconds. This is the expected failure of
  a hold without a chosen cell, and it agrees with the official record that aggression pays. It sets the design bound:
  the hold must be short (12 s was too long: try 5), must never replace a walk to a listed prey unless that prey is
  closing, and is only worth a slot with the cell search of section 2.
- **`pm1` triggers and is small, as measured reach predicts**: the strafe owns only 15 of the 81 own-motion lines (48
  seeds), so the strafe rule alone moved 52 -> 49 and trimmed the 2+ line time by 1.5%. The reach is in `isolate` and
  `grab` (52 of 81): the walk test of section 3 is the part to build, not an afterthought.
- Neither prototype raised the decision time visibly (not timed on this box: load 20-30 makes a timing void).

## 7. Build order and gates for the rebuild

1. `pauseMove` strafe rule (20 lines in mover.js, prototype exists) -> then its `isolate` / `grab` walk test.
2. `moveWin` helper; first only *measure* (counter of relocations inside / outside a window), then gate.
3. `ambush: roam` with the cell search; `on` last.
Gates for each: identity at 'off' on 24 seeds and the kit stream; decision time p99 and max printed (budget: +0.5 ms,
no extra A* except one per 3 s for the ambush cell); scene tests above; firewall scene (SQUAD posture with
`foreignDeaths = 1` -> inert). Official slots: one for `pauseMove` on the 5.38 base; `ambush` only if `pauseMove` does
not lose.

## 8. What I did not establish

- Whether the real house bots behave like the simulator's at an opening (first-shot delay after a *re*-opened line is
  unmeasured [N]); the 120-to-12 first-hit record is a simulator fact.
- Any ranking. The prototype runs are 24 seeds on a loaded box and say only that the rules trigger and what they move.
- The ambush cell search is specified, not built; the prototype hold stands wherever we happen to be.
- `moveWin` is not prototyped; the share of relocations that already fall in a silence is unknown.
- On "wait X ms": it is queue time, not our decision time (1-8 ms, worst about 16 ms locally against 50 ms). The pause
  rules add under 0.5 ms and no path search per decision.
