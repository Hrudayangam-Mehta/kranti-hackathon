# FFA counter module: hook-up guide and rationale

Files: `bot/lib/counters.js` (new, self-contained, no imports), `tools/test_counters.js` (15 checks).
Run: `taskset -c 3 node tools/test_counters.js` (about 4 s; `--seeds=30 --verbose` for the stress run).
Written against `bot/lib` as of 07:30 UTC Nov 21. Anchors below are code strings, not line numbers, because
`bot/lib` was being edited while this was written.

## 1. What it gives the brain

```js
import { createCounters } from './counters.js'
const cx = createCounters(hello, P.counterParams)   // params: any COUNTER_PARAMS key overrides
cx.update(obs, t)            // every decision, in BOTH postures (about 40 us with 15 mechs; read-only on obs)
cx.archetypeOf(id)           // { archetype, confidence, candidate, obsS }   (reused object per id)
cx.adviceFor(id, ctx)        // advice (reused object per id; copy it if you keep it past the next call for that id)
cx.threatRank(ctx)           // [{ id, score, archetype, confidence }] most dangerous first (reused array)
cx.debugState()              // fresh object: counts, per-mech label, scores, features (debug only: allocates)
```

`ctx` = `{ env, bandLo, bandHi, myLaser, myLightning, myGun, myHpf, myHp, myEnergy, alive }`. Only `env` is
required; missing fields fall back to what the module saw in `obs.self`. Pass the brain's own current band
as `bandLo/bandHi`: neutral advice then echoes it back, so replacing the brain's band with `adv.lo/adv.hi`
is a no-op whenever the advice is neutral.

Advice fields (all plain numbers / booleans / one short string):

| Field | Meaning | Neutral value |
|---|---|---|
| `active` | true only when `ctx.env === 'FFA'`, the mech has a label and the blend weight is above 0 | false |
| `lo`, `hi` (`band`) | preferred range band to this mech: back off inside `lo`, close only beyond `hi` | `ctx.bandLo/bandHi` (else D2 band of our loadout) |
| `engage` / `engageLevel` | 0 `avoid` (never a target unless hostile), 1 `respond-only` (shoot back only while hostile, never first), 2 `opportunistic` (the brain's own D11 rules, unchanged), 3 `attack` (may open on it inside its band) | `opportunistic` / 2 |
| `targetMult` | multiplier for the D5 target score of this mech | 1 |
| `dodgePriority` | 0..1; 0.5 = brain default dodge weight | 0.5 |
| `breakLosOnCharge` | treat its charging flag as "get behind cover now", with a wider hide radius | false |
| `reason` | short code, see section 4 | `N/squad`, `N/none`, `N/unknown`, `N/lowconf` |
| `archetype`, `confidence`, `weight` | the read behind it; `weight` is the blend weight actually used | `UNKNOWN`, 0, 0 |

Inertness: outside FFA `adviceFor` returns the neutral object (`active: false`) and `threatRank` an empty
array, for every id and every tick (tested: 127,500 calls). `update` touches no brain state.

Bounded loss: weight `w = 0.9 x ramp(confidence, 0.35, 0.85)`; every number = neutral + w x (counter -
neutral), so a wrong read never moves more than 90% of the way and a doubtful read (confidence under 0.35)
moves nothing. Engage: a bolder level than neutral (`attack`) needs w >= 0.6; a more careful level steps
down by `round(w x distance)`. Rails: a mech that damaged us in the last 4 s is never `avoid` (D0); `attack`
is dropped below 60% hp. Confidence is recomputed every tick from the held label's live score, so a
contradiction (a "hider" that starts shooting) drops the weight at once even while the 3 s hysteresis still
holds the label.

## 2. Wiring (about one hour; every hook is behind `B.env === 'FFA'` and `adv.active`)

0. **params.js**: add `ffaCounters: true, counterParams: null` to `PARAMS` and a preset
   `ffaCounters: { on: { ffaCounters: true }, off: { ffaCounters: false } }` with `SELECT.ffaCounters = 'on'`
   (a one-change submission can switch it off).

1. **senses.js `newTrack`**: add `cxMult: 1` to the returned object (keeps the hidden class stable).

2. **brain.js `createBrain`**, after `const stance = makeStance(B, mover, hideSearch, posEval)`:
   ```js
   const cx = P.ffaCounters ? createCounters(hello, P.counterParams || undefined) : null
   B.cx = cx
   B.cxCtx = { env: 'SQUAD', bandLo: 0, bandHi: 0, myLaser: false, myLightning: false, myGun: true, myHpf: 1, myHp: 1400, myEnergy: 100, alive: 16 }
   B.cxRank = null; B.cxDodge = 0.5; B.cxBreakLos = false
   ```
   (or put the five fields in the `B` literal). Import: `import { createCounters } from './counters.js'`.
   Do not name it `B.counters`: that is the statistics object.

3. **brain.js `act`**, right after `stage('sense', ...)`:
   ```js
   if (cx) stage('counters', () => cx.update(obs, B.me.t))
   ```
   and inside `stage('assess', ...)`, after the loop that sets `B.chargeAtMeT` and before `selectTarget(B)`:
   ```js
   if (cx) {
     const c = B.cxCtx, me = B.me, bd = bandFor(B)
     c.env = B.env; c.bandLo = bd.lo; c.bandHi = bd.hi
     c.myLaser = !!me.laser; c.myLightning = !!me.lightning; c.myGun = !!me.gun
     c.myHpf = me.hpf; c.myHp = me.hp; c.myEnergy = me.energy
     if (Number.isInteger(obs.alive)) c.alive = obs.alive
     B.cxRank = null; B.cxDodge = 0.5; B.cxBreakLos = false
     if (B.env === 'FFA') {
       B.cxRank = cx.threatRank(c)
       for (let k = 0; k < B.trackList.length; k++) {
         const tr = B.trackList[k]
         if (tr.npc) continue
         const a = cx.adviceFor(tr.id, c)
         if (!a.active) continue
         if (tr.losIn && a.dodgePriority > B.cxDodge) B.cxDodge = a.dodgePriority
         if (a.breakLosOnCharge && tr.chargeAtMeT === B.me.t) B.cxBreakLos = true
       }
     }
   }
   ```
   `B.env` is last tick's value here (stance.update sets it later): a one-decision lag at the latch, harmless.

4. **tactics.js `selectTarget`** (D5), mech branch of the candidate loop. Change `const ok = ...` to `let ok = ...`
   and insert before `if (!ok) continue`:
   ```js
   tr.cxMult = 1
   if (ffa && B.cx) {
     const adv = B.cx.adviceFor(tr.id, B.cxCtx)
     if (adv.active) {
       tr.cxMult = adv.targetMult
       if (adv.engageLevel <= 1 && !tr.hostile && !tr.finishable) ok = false               // avoid / respond-only: no first shot
       else if (adv.engageLevel === 3 && !ok && tr.losOut && tr.dist <= adv.hi) ok = true    // attack: may open inside its band
     }
   }
   ```
   In the scoring loop, after `if (!tr.losOut) s *= P.wNoLos`: `if (ffa && !tr.npc) s *= tr.cxMult`.

5. **stance.js `applyStance`**: after the `B.holdFirst = !!(ffa && B.stance === 'DEFENSIVE' && ...)` line and
   before `if (B.holdFirst && !B.killSecure) B.holdFire = true`:
   ```js
   if (ffa && tgt && !tgt.npc && B.cx) {
     const adv = B.cx.adviceFor(tgt.id, B.cxCtx)
     if (adv.active && adv.engageLevel <= 1 && !tgt.hostile) B.holdFirst = true
   }
   ```
   **stance.js `chooseStance`**, at the top of the FFA branch (`} else if (tgt && me.hpf >= 0.7 && n1 <= 1) {`),
   or just before `const cur = B.stance`:
   ```js
   const adv = ffa && tgt && !tgt.npc && B.cx ? B.cx.adviceFor(tgt.id, B.cxCtx) : null
   if (adv && adv.active && adv.engageLevel === 0) want = 'DEFENSIVE'
   else if (adv && adv.active && adv.engageLevel === 3 && !defensive && n1 <= 1) want = 'OFFENSIVE'
   ```
   `firecontrol.js` needs no change: it already honours `B.holdFire` (`const hold = B.holdFire` in `run()`).

6. **brain.js `fightLegs`** (the range band; `mover.standoff` already takes `lo, hi`). After
   `let hold = bd.hold, lo = bd.lo, hi = bd.hi`:
   ```js
   const adv = ffa && B.cx && !tgt.npc ? B.cx.adviceFor(tgt.id, B.cxCtx) : null
   const cxOn = !!(adv && adv.active) && !(B.killSecure || B.finishing)
   if (cxOn) { lo = adv.lo; hi = Math.max(adv.hi, adv.lo + 5); hold = Math.min(Math.max(hold, adv.lo), adv.hi) }
   ```
   (`ffa` is declared just above `bd` today; move the `const ffa = B.env === 'FFA'` line up if needed.) In the
   lightning-rush condition add `&& !(cxOn && adv.lo > P.rushR + 20)` (no rush into a keep-out band). Keep the
   two D11 lines after it (`hi = Math.max(hi, tgt.dist + 1)` and the 50 m lightning floor): they still apply.
   In the D4 beam-hide block change the reach to
   `(canBoost ? P.laserHideBoost : P.laserHideWalk) * (B.cxBreakLos ? 1.5 : 1)`.

7. **brain.js `legs`** (beam hide outside FIGHT, e.g. while looting), just before `switch (B.mode)`:
   ```js
   if (B.env === 'FFA' && B.cxBreakLos && B.mode !== MODE.ZONE && B.mode !== MODE.FIGHT && B.me.t - B.chargeAtMeT < 0.9 &&
       B.hide.state === 'found' && B.hide.dist <= P.laserHideBoost * 1.5) {
     mover.moveTo(B.hide.x, B.hide.y, 1, 0.8); cmd.boost = me.energy >= P.boostReserve && me.grounded; B.legKind = 'beamhide'; finishLegs(); return
   }
   ```

8. **mover.js `blend`**: replace `w = P.dodgeWeight` by
   `w = B.env === 'FFA' && B.cxDodge !== 0.5 ? Math.min(1, P.dodgeWeight * (0.6 + 0.8 * B.cxDodge)) : P.dodgeWeight`
   (0.5 gives exactly the old weight; 0.9 gives 1.0).

9. **tactics.js `fillThreats`** (hide search and position evaluator, cap 4): in FFA fill from the rank first,
   then run the existing two passes for the free slots, skipping ids already put:
   ```js
   if (B.env === 'FFA' && B.cxRank) for (let k = 0; k < B.cxRank.length && n < T.cap; k++) {
     const tr = B.tracks.get(B.cxRank[k].id)
     if (!tr || tr.npc || tr.conf < 0.25 || tr.dist > 320 || (withTargetFirst && tr === tgt)) continue
     put(T, n++, tr, B)
   }
   // existing passes: add `let dup = false; for (let q = 0; q < n; q++) if (T.id[q] === tr.id) dup = true; if (dup) continue`
   ```

10. **brain.js `debugState`**: `cx: P.debug && B.cx ? B.cx.debugState() : null`.

Checks after wiring: `tools/test_counters.js` 15/15; `tools/test_brain.js` unchanged; SQUAD bit-identity:
replay `kit/check/stream.jsonl.gz` (and the arena scenarios) through `createBrain` with `select: { ffaCounters:
'off' }` and `'on'` under `env: 'squad'` and diff the actions tick by tick (must be identical); FFA smoke:
`./bun tools/redteam/ffa_probe.js --field top15 --seeds 1,2` with `ffaCounters` on and off.

## 3. Archetype rules (scores in 0..1; candidate = best score >= 0.5 and 0.15 above the second; label after 1 s
of observation and 3 s of the same candidate; windows are exponential in observed time, 8 s, plus 30 s for the
hider's stillness and the rusher's boost)

| Archetype | Gate | Score terms (ramp a..b) | Evidence for the numbers |
|---|---|---|---|
| LASER_KITER | laser in list | nearest foe (us or another mech) held 80..110 m (or charge range / beam length); boost share 0.2..0.35 (down); not closing inside 90 m (3..7 m/s, down); charge or torso-on-mech evidence (without it max 0.45); farming cuts it | holds 95-125 [WV][KY], 110 [BD], 100-165 [IL], 125-185 [AB], ~100 [TT], 100-200 m [AT B]; winners boost 7-14% [S1] |
| LIGHTNING_CLOSER | lightning in list | engaged (torso on a mech or it hit us) and closing on its foe 2.5..6 m/s (read inside 150 m without a laser, 90 m with one), or holding inside 70..45 m, or lightning seen (arcs / lightning damage) | 8.7 m/s walk, 14.5 boost [WV][KY]; +9.8..+13.1 [AT]; ~9 m/s [BD]; 28 m band [WV][KY][BD], 30 m [MH], arcs at 22-42 m [AT] |
| GUN_STRAFER | gun, no laser (x (1 - closer score) if it holds lightning) | torso on a mech 0.3..0.6 or on us 0.25..0.5 or it hit us; sideways reversals 0.15..0.45 per s or sideways share 0.5..0.8 (x0.75); range 30..50 up, 180..230 down; heavy boost halves it; not closing inside 90 m | reversal gaps 1.4 [WV], 1.0 [KY], 0.75 [IL], 0.45-0.95 [MH], 0.7 [AT], 0.9 [AT B], 0.35-0.9 s [TT]; settles 55-140 m |
| BOOST_RUSHER | no laser, no lightning | boost share 0.2..0.35 on both windows; closing on us or on any mech 3..8 m/s; engaged | 314159265 boosts 41%, lives 36 s [S4]; bottom half 25%, winners 11% [S1] |
| HIDER | any | still (< 1.5 m/s) 0.3..0.5 or slow (< 5 m/s) 0.4..0.65 on the 8 s window AND 0.45..0.65 / 0.5..0.7 on the 30 s window; torso not on mechs; not hurting us (x0.2 for 10 s after a hit); not charging; no boost (0.1..0.25 down); cubes 8..12 down; not farming | Bob the builder still 74%, 9.5 cubes [S4]; Mahalas 14 s waits, 40-110 m hops [MH]; ae1b122 holds fire [WV]; tigerbyte motionless [TT]. A 14 s + 5 s cycle bottoms at 0.49 (8 s) / 0.67 (30 s) |
| FARMER | any | torso on a crate / drone nearer than any mech in the same line, 0.12..0.35 of the time, or cube gain 3..7 per minute (x0.85, at least 2 cubes); not aiming at us or at mechs | AT 19%, BobBuildIt 35% of idle time on loot [AT]; farming pose 38 m from a drone, 30 m from a crate [WV][KY]; winners 7 cubes/min, places 2-4 3/min [S1] |

## 4. Counter advice per archetype (full-confidence values; reason code)

| Reason | When | Band m | Engage | Target x | Dodge | Break LOS | Rationale and sources | If the read is wrong |
|---|---|---|---|---|---|---|---|---|
| `LK/cover` | laser kiter, default | 150-200 with our laser, 200-280 without | respond-only | 0.7 | 0.9 | yes | D11 "laser carrier at 100+ m: only from a corner or as third party; break its sight line at release"; beam clock / corner peek [AB C2][BD C2][IL C2][KY 4]; full beams from 150-190 m [AT B1]; winners keep 187 m from the nearest mech [S1]; without a laser stay outside its 200 m vision (gun duels beyond 130 m lose, D2) | we only keep distance and duck: cost is lost tempo |
| `LK/third` | it is busy with another mech and under 50% hp, or busy with its back to us and we hold a laser at 55%+ | 100-190 | opportunistic | 1.3 (1.5 if under 50%) | 0.9 | yes | D11 third party; blind-side beams [AT A3][BD C4][KY 1] | the brain's own D11 gates still decide the first shot |
| `LZ/keep` | lightning closer | 65-95 | respond-only | 1.1 | 0.7 | if it holds a laser | D11 "keep 50+ m along cover, shoot while backing"; 60 m disc, 65-80 m band [BD C1]; walk-away kite [WV C6]; never inside 60 m [KY 2] | ground given up; no damage cost |
| `LZ/brawl` | we hold lightning, our hp >= its hp, energy >= 60, hp >= 60% | 25-45 | opportunistic | 1.2 | 0.6 | if it holds a laser | "fight only with lightning in hand and at least its hp; fire lightning first" [AT A5]; showdown table "let it in only if we hold lightning and more HP" | the brain's rush rules still apply |
| `GS/break` | shoot-on-sight strafer, default | 150-200 with laser, 130-200 without | respond-only | 0.8 | 0.8 | no | D11 "break sight, let it find someone else"; 9 s break [WV C7][KY 2]; never trade at 90-130 m in the open [WV C4]; do not answer its opening fire in the open [AT B2] | only distance and silence |
| `GS/third` | it is aiming at another mech, more than 75 deg off us, our hp >= 55% | 60-150 | opportunistic | 1.5 | 0.8 | no | largest modelled gain in three studies: third-party flank outside its wedge [WV C2], blind-side third party [KY 1], rear-quarter hand-off [IL C1] | D11's own first-shot gate still applies |
| `BR/hold` | boost rusher | 30-160 | attack (needs w >= 0.6 and our hp >= 60%) | 1.3 | 0.6 | if it holds a laser | D11 "corner ambush"; "no energy on arrival, gun only; do not run" [S4]; it lives 36 s | the only bolder-than-neutral advice; bounded by the 0.6 weight gate, the hp rail, and the gate (no laser, no lightning) |
| `HD/pass` | quiet hider | 120-280 | avoid | 0.5 | 0.4 | if it holds a laser | D11 "pass beyond 55 m, out-farm it"; 120 m from tigerbyte opening at 83 m [TT T2] and A-bot's 120 m hide-first bubble [AB C1]; Mahalas attacks only weak mechs [MH K4] | rail: never avoid once it hits us |
| `HD/harvest` | we hit it twice (2 reactions) and it never returned fire, 7-14 alive, our hp >= 70% | 150-190 | opportunistic | 1.3 | 0.4 | if laser | "harvest the non-returner" before it re-arms at six alive [WV C1] | D11 gates still decide |
| `HD/late` | it is under 50% hp and not facing us, or 4 or fewer alive | 90-200 | opportunistic | 1.2 | 0.4 | if laser | D11 "finish it late"; Mahalas prey line [MH K4] | D11 gates still decide |
| `FM/strike` | farmer whose torso is more than 100 deg off us, we hold a laser, hp >= 70% | 140-200 | opportunistic | 1.3 | 0.6 | if laser | hidden-shooter laser beyond the 140 m charge sound [KY 3]; rear-arc first strike [AT A2]; shoot the stops [WV C3] | D11 gates still decide |
| `FM/watch` | farmer otherwise | 140-200 | respond-only | 0.9 | 0.6 | if laser | farm only with the nearest mech beyond 150 m [S1 rule 3, D11] | distance only |

`UNKNOWN`, low confidence, SQUAD: neutral (codes `N/...`).

Threat rank (FFA only): `(1 / (1 + d / 120)) x weapon term (laser within 280 m +0.5, lightning within 90 m
+0.7, gun +0.2, mortar +0.2) x (1 + 0.04 x cubes, cap 10) x (0.5 + 0.5 hpf) x live factors (aiming at us 1.5,
charging at us 2.0, hurt us in 3 s 1.8, busy with another mech 0.6, fired on us first 1.2) x archetype factor
blended by the same weight (kiter 1.4, closer 1.5, strafer 1.2, rusher 1.3, hider 0.5, farmer 0.8)`.

## 5. Test results (`node tools/test_counters.js`, core 3)

- 13 synthetic tracks built from the study numbers (A-bot, BackwardsDeployeds and TigerTown27 kiters;
  Wolverines/Kanyaraasi and AT closers; Wolverines, BobBuildIt and ImagineLosing strafers; 314159265 rusher;
  Bob the builder and Mahalas hiders; drone/crate and laser farmers), each with position noise 0.4 m, velocity
  noise 0.6 m/s, aim noise 0.04 rad and 5% dropped observations: 130/130 runs (10 seeds) correct within 5 s
  of observation (slowest 4.6 s; nothing earlier than 4.0 s by construction) and no label change over 60 s.
  Stress run with 30 seeds: 390/390.
- 4 mixed / ambiguous tracks (traveller passing at 150-190 m, random mode every 1.5 s, laser + lightning
  holding 70 m, half farmer half kiter): UNKNOWN on every tick, 40/40 (120/120 with 30 seeds).
- Hysteresis: a 1.5 s burst of hider behaviour inside a strafer leaves the label alone; a lasting change is
  followed no sooner than 3 s; no label before 1 s + 3 s of observation.
- SQUAD and any env other than `'FFA'` (including `'ffa'`, missing, null ctx): 127,500/127,500 advice calls
  neutral, threat rank empty.
- FFA advice direction per archetype, bounded-loss property, the D0 rail, threat order (closer and kiter
  above a hider).
- 30,000 fuzzed observations and calls (junk types, NaN, huge numbers, time going backwards, ids out of
  range): no exception, every number finite, the internal catch never used. Frozen inputs accepted (the
  module never writes into `obs`). Two instances on one stream: identical state. Kit stream replay: the
  house bot (gun + laser, 100-150 m) reads LASER_KITER.
- Cost with 15 listed mechs, 12 drones, 30 crates, beams and events: mean 41-61 us per update, p99 75-146 us
  across runs on a shared core (single outliers of 2-8 ms are garbage collection or JIT, node and bun alike);
  16 x adviceFor + threatRank 5-15 us. Also passes 15/15 under `./bun`.

## 6. Limits and open points

- All validation is synthetic, built from numbers the studies report; no per-mech recording was replayed.
  The TigerTown27 study says raw recordings of 11 real showdowns exist (`intel/shaunkar1__proj1-agentboard/
  recordings`, outside what this task could open): replaying them through `update` and comparing labels
  with the known teams is the cheapest real check.
- Labels describe behaviour, not teams. Several families switch posture after foreign deaths (A-bot,
  Mahalas, TigerTown27, Wolverines ae1b122): expect relabels at 3 s hysteresis when they do.
- A weapon pickup changes the gate at once but range means take about 8 s to follow (for example gun
  strafer -> laser kiter).
- HIDER needs the 30 s window to stay high: a hider first seen during a long relocation takes longer than
  5 s to read. A mech motionless with its torso on us (a waiting laser) is deliberately not a hider.
- Hygiene: archetype names and reason codes are string literals and survive minification. Property names
  were checked against the REPO_HYGIENE grep (`cosUs` renamed). Unrelated, existing: the case-insensitive
  pre-push grep in REPO_HYGIENE.md matches `headExposure` (params.js / tactics.js) in today's `dist/bot.js`
  ("osu"); `tools/package.sh` uses `\bOSU\b` and passes.
