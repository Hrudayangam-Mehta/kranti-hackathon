# Counters addendum: team 2696 (merge into `notes/counter_dossier.md`; hooks for `bot/lib/counters.js`)

Written 08:10-08:25 UTC, 21 Nov 2026, from `notes/intel/top_2696.md` (read that for evidence). Clean-room: our
own words and numbers; nothing from the other repository was run or copied. Grades as in the dossier.
**Section 6 (added 08:30-08:55 UTC): the mapping onto `bot/lib/counters.js`, measured on synthetic tracks, with exact
parameter / advice changes, before / after results and the backfire analysis.** Where section 3's "Where" column and
section 6 disagree (K3, K7), section 6 holds.

## 1. Replacement for dossier section 1, row 1 (2696)

| # | Team (score) | Repo | Identity | Lineage | Play style (one line) | Two biggest limitations | Signature (observable) | Best counter |
|---:|---|---|---|---|---|---|---|---|
| 1 | 2696 (5.60, 06:58) | code: shaunkar1/proj1 lot `4374077` (profile f75kite, **read**); team repo none | **likely** (lot tip for the whole submission window; the only practice-distinct proj1 commit since 06:11; its 4.96 and 5.42 match the proj1 tips of their moments). Team: probably a separate team submitting proj1 tips (recorded 03:00-04:00 UTC with its own non-proj1 bot) | proj1 / "paw" | Practice: no first fight until 10 cubes or 75 s (answers only hits from inside 100 m), then attack on sight inside 160 m at >60% health, **fixed 170 m hold** with boost-back under 145 m, 35% retreat to 80%. FFA: the TigerTown27 posture plus an opening blind spot and a drone-biter rule | (1) **until the first death anywhere it answers only damage from inside 100 m** (no reply to aim, closeness or fire from 100-280 m); (2) hostile-only + blind arcs; retreat watches only the last attacker, 19 s to 80% | proj1 fingerprint (full turn in the first 1.7 s, then +-109 deg sweep every 5.7 s); gun + laser, never L+Z, never mortar; ~100 m from gun(+laser), ~55 m from L+Z; 14-15 m crate stops | K2 (do not read its sweep as hostility), K1 opening amnesty, K3 retreat finish, K4 corner beam in its windows, K5/K6 loot and drops |

## 2. Changes to the proj1 cluster row (dossier section 2)

- "f75kite is unread" is resolved: **every proj1 profile, f75kite included, changes practice only.** f75kite =
  farm10t75 + a fixed 170 m practice range. Members cannot be told apart in a free-for-all by profile.
- **New cluster limitation (builds before 07:19 with a farm gate: farm6 `a178c88`, farm10t75 `b116ee0` /
  `a53c31a`, f75kite `4374077`; that is the known best entries of TigerTown27, benchmaster's 5.42 and 2696):** the
  farm gate also runs in a real free-for-all until the first death the bot did not cause. Until then it targets
  only a mech that damaged it from inside 100 m in the last 4 s. It keeps farming down to 70% health under fire
  from beyond 100 m, then hides; latches a retreat at 35%. First deaths in the 11 recordings: 6-17 s.
- **Newer builds (07:05-07:41; only relevant if one becomes a member's best):** no opening blind spot; avoids any
  mech rated above 0.85x its own strength within 300 m (was 2x); walks to deaths it heard nearby (near / mid band)
  to collect cubes, giving up after 45 s; laser-less it climbs roofs for weapons unless a mech within 110 m is
  hostile or has a line, and explores unseen ground when nobody is near. Lot tip at 07:41 = f75a220 (attack radius
  220 m at >45% health, no fixed kite).
- Added to "what is shared": a drone that hit it in the last 3 s gets its torso and gun whenever it has no mech to
  shoot (torso pulled off other bearings).

## 3. Counters to add

Where it runs: the module acts only in FFA (after our latch at 3 foreign deaths); anything earlier is a D0 rule and
changes SQUAD play (one-change submission, D0 bit-identity).

| Id | Trigger (observable) | Action (numbers) | Exploits | Expected gain | Backfire / bound | Where |
|---|---|---|---|---|---|---|
| K1 | alive = 16 (no death yet); a gun or gun + laser mech at 100-200 m that has not damaged us (stronger with the proj1 fingerprint) | no new code beyond K2: keep farming and taking weapons in its view; pass at 100 m or more; never damage it | opening blind spot (section 2) | uncontested opening loot (first laser, 1-3 cubes) for 6-17 s, no fire from up to four finalists | a shoot-on-sight look-alike costs one hit before D0 answers; window closes at the first death; newer builds lack it | D0 (already compliant if K2 is in) |
| K2 | our aim test sees a torso within 12 deg of us inside 160 m | aim-hostility only after 3 consecutive decisions (0.3 s) within 12 deg, or at once if that mech's laser is charging aimed at us; damage-hostility stays immediate | our own false positive: an idle proj1 sweep crossing us is flagged ~42% of the time (model, `tools/top10/t2696_sweep_flag.py`; 2 crossings per 5.7 s) | no self-started opening duels with the strongest recorded FFA family (9.9 points a match); a first hit on proj1 makes it hostile for 25 s | 0.2-0.3 s later reaction to a real aimer that has not fired (house hunters are caught by the damage rule at their first hit) | D0 / `senses.js` aim test (`aimAtMeDeg`, `hostileAimMemS`); SQUAD-affecting, own submission |
| K3 | after the latch: gun + laser mech at 40% or less turning away boosting, or standing behind cover with a fixed torso | approach to 60-150 m from >= 60 deg off its torso, beyond 45 m; charge 0.3 rad off-axis, swing, release; gun follows; 2nd beam 2.4 s later; stop on cover or a third mech aiming 0.3 s | retreat holds fire, watches only its last attacker, 19 s from 35% to 80% | 315-472 per beam against <= 490 health: kill + cubes | a bot that fires while retreating; D3 break-off bounds it | module: section 6 change C1 (finish rail: `opportunistic` below 50%, not `attack`; supersedes "engage 3 at <= 40%") |
| K4 | it is our target and: its beam (or flag drop) within the last 1.5 s; or torso >= 60 deg off us beyond 45 m; or a 14-15 m crate stop; or a late zone run | off-axis pre-charge behind our corner, swing, release, back in cover within 0.8 s; never beam it while it sits at a corner facing us with our laser ready | mechanical laser caution (hides when any laser could fire within 0.85 s, out ~1.5 s after a beam); 120 deg wedge + sweep | 315-472 per beam, no beam back for 2.4 s | none beyond a corner peek | module M8 (`peekUntil = lastBeamT + 1.65`) |
| K5 | > 2 alive and it already fled from us once (boosted out of our line inside 170 m) | walk in its view toward the crates / drop we want; no fire | strength avoidance: drops all loot within 160 m of a mech rated > 2x (newer builds 0.85x) | free loot | none if used only after an observed flight | brain (D6), keyed on an observed flight |
| K6 | a supply drop within 200 m of a corner we hold, 25 s either side of landing | watch the ring from 100-190 m in cover, laser pre-charged off-axis; beam whoever captures | it walks to any reachable drop, even held, and stands inside 2 m for 4 s | 2 beams (630-944) + a magazine | none; D6 already never contests | brain (D6) |
| K7 | lone pair, it shows gun + laser, holds ~55 m from our L+Z, no lightning on it; our hp >= 70% and >= its fraction, energy >= 70 | right after its beam, boost 68 -> 43 m (it starts no charge while we close through 68-46 m), then continuous lightning (240/s inside 45 m, shorts its laser 2 s per hit); abort at hp < 50%, energy < 25 beyond 45 m, or a third mech aiming | it holds its computed 55 m and trades even when out-cubed; chaser rule | a kill in ~6 s for ~600 of our health | high against a lightning brawler; bounded by trigger | module: section 6 change C3, sub-case `LB/dash` (off by default; band 0-43, engage 3) |
| K8 | nobody died by 20 s (quiet final) and a proj1-looking mech in view | before 75 s: treat it as harmless beyond 100 m; after 75 s it attacks within 160 m at > 60% and holds 170 m (boosts back inside 145 m), no laser caution: break its line and wait at a corner 60-100 m from where it last saw us; beam + gun as it walks round | quiet-final practice misread | a corner kill | none in practice; never seen in 11 recordings | no code: we are still in SQUAD (no latch), D2 `far` already holds 125-185 m |
| K9 | (only if a 07:05+ build becomes a member's best) a mech died in our view within 180 m of a proj1-looking mech | hold a corner 100-190 m from the death spot for 20 s, laser pre-charged off-axis; beam the mech that walks onto it | death-site walks (up to a few hundred metres, 45 s give-up) | a standing target collecting cubes | we stay near a fight's survivor: D11's third-party gate | brain, conditional |

Safe as general rules: K2, K3, K4, K6. Signature- or build-specific: K1, K5, K7, K8, K9.

## 4. Changes to dossier section 4 (practice lessons)

1. **Lesson 1 (opening guard), refined:** the proj1 ladder (aggro 4.96, farm4 / 50 s 5.19, farm6 / 75 s 5.31,
   farm10t75 5.42, farm10 / 130 s 5.10; kills 238 / 249 / 255 / 260 / 245 of 48 matches) was measured with the gate
   answering only hits from inside 100 m, i.e. never fighting the practice hunter that stands at 100-150 m. Keeping
   D0's "answer any hostile at once" is therefore a different, unmeasured rule. Run two one-change submissions:
   `openGuard75` (75 s, D0 answers) and `openGuard75q` (75 s, during the guard answer only damage from inside 100 m).
   The q-variant also plays the final's opening (no latch yet), where it copies proj1's limitation 1 (K1 shows the
   price: up to 6-17 s of unanswered long-range fire). [1] monotone ladder + [C].
2. **The warning against the `far` laser preset is lifted.** The losing "fixed 150-200 m" proj1 profiles (kite150,
   kite200, 4.1-4.4) were bundled with always-fight and never-retreat on the old farming code. The clean single
   change (f75kite: 170 m, retreat kept) went 5.42 -> 5.60 (+9 kills / 48, inside the 0.27-0.33 noise). With the
   5.58 bot's 125-185 m, the two top practice scores both hold 150 m or more. Keep `far` as the default; optional
   preset `far170` (hold 170, band 145-195). [T] x2 + [1] inside noise.
3. **New lesson (D2 detail):** f75kite boosts back as soon as a mech is 25 m inside its hold (under 145 m) with
   energy above 30; D2 boosts only inside 90 m. One-change candidate: boost-back below the band's lower edge. [code]
4. **New lesson (D0 detail, K2):** require 0.3 s of aim dwell (or a charging flag) before aim counts as hostility.
   [code] + [model]; SQUAD-affecting.
5. Lesson 2 (laser cover step OFF in SQUAD) gains one more top-bot agreement: the 5.60 build has no laser caution
   in practice. [T]
6. Lesson 12 (`farmHp` 45-50%) gains one: the 5.60 build farms crates above 45% and drones above 60%. [T]
7. Lesson 9 (method): the proj1 group re-pins its reference profile on every new build before reading a profile
   delta; do the same after any code change of ours. [S]

## 5. Open items

- 2696's next visible score: if a lot-tip follower, its next entries are f75a220 (`362cb6c`) or later, which drop
  the 170 m kite and carry the newer free-for-all rules; they show only if they beat 5.60.
- If any proj1 member posts a best after 07:19, re-check which build it is: the opening blind spot (K1) exists
  only in builds before `f872923` (07:19:12).
- Not checked (scope): benchmaster's 5.50 (07:21) and giddygiddyboy's 5.54 (07:37).

## 6. Mapping onto `bot/lib/counters.js` (07:36 version, sha256 `4eec66c4...`; not edited)

Method: 16 synthetic tracks of the 5.60 build's free-for-all play, built from the numbers in `notes/intel/top_2696.md`
(sections 3.1, 6, 7.1, 8), plus 7 backfire controls of other families (23 in all). Each runs 30 seeds with the test suite's noise
(position 0.4 m, velocity 0.6 m/s, aim 0.04 rad, 5% dropped listings) through the module (read-only import) and
through a scratch copy with the changes below. Context: FFA, our hp 90%, 10 alive, our band 125-185 m with a laser.
Shares below are the share of decisions in the stated window. Script `tools/top10/t2696_cx_tracks.mjs`, output
`t2696_cx_tracks_out.txt`; the scratch module is built by `t2696_cx_mkmod.py` (exact old -> new edits), diff in
`t2696_cx_mod.diff`.

### 6.1 Which archetype it is in each phase (current thresholds)

| Phase | 2696 behaviour in the track (numbers from the study) | Read now | Advice now | Verdict |
|---|---|---|---|---|
| Farming (opening and mid-game, full health) | crate circuit: 40-80 m legs at 11.7 m/s with the +-109 deg / 5.7 s torso sweep; stops 14.5 m from each crate, torso on it, 1.7 s of gun; walks onto the cube. Gun only or gun + laser, 100-210 m from us | FARMER 74-75%, UNKNOWN 25-26% | FM/watch 40-42% (respond-only, 134-194 m), FM/strike 30-32% (opportunistic, x1.3) | **correct.** Level 2 at most, so no first shot on a healthy proj1 (D11 decides) |
| Farming, a full laser charge per crate (nobody in its view) | same, the stop is a 0.75 s charge and a beam | UNKNOWN 52%, LASER_KITER 27%, FARMER 20% | neutral / LK/cover / FM | acceptable: every branch keeps 130-200 m and fires no first shot |
| Kiting vs our gun + laser (its FFA hold ~100 m) | band 92-108 m, strafe reversals every 0.35-0.9 s, torso on us, gun on us; laser caution: behind its corner while our laser is ready, out for 1.5 s after our beam (full charge, release) | at 100 m LASER_KITER 100%; **at 95 m only 56% (UNKNOWN 44%)**; at 85 m UNKNOWN 100% | LK/cover (139-193 m, x0.83; respond-only 53-77%, the rest neutral because the weight is under 0.5) | right archetype, **fragile at its own hold**: the LK range ramp runs 80 -> 110 m, so 95 m scores 0.5, on the 0.5 threshold |
| Kiting vs our laser + lightning (its hold ~55 m) | as above at 50-60 m | **UNKNOWN 100%** | neutral | **gap** (dossier M1: no mid-range laser holder) |
| Fighting another mech at 100 m, healthy, we watch from the side | torso and laser on that mech, strafing | LASER_KITER 100% | LK/cover 98% | correct (no first strike on a healthy proj1) |
| **Retreat** (35% -> 80% in about 19 s) | boosts 2.6 s straight away from its attacker, then still, torso fixed on that attacker, no fire, repair from 5 s at 45 hp/s (under 50% for the first ~9.7 s) | LASER_KITER 100% (the boost burst does not break the read) | its attacker listed to us: LK/third (opportunistic, x1.4); **its attacker hidden from us: LK/cover, respond-only 95-100%, x0.75** | **wrong for K3**: respond-only makes the hookup's step 4 drop it as a candidate (only `finishable` is exempt), i.e. it vetoes the brain's own D11 finish clause (FFA, after 90 s, hp under 50%, not aiming at us) |
| Quiet final (nobody dead by 20 s) | fixed 170 m, boost back inside 145 m, laser every 2.4 s | LASER_KITER 100% | (module inert: no latch yet) | fine |

### 6.2 Changes (exact; all in `counters.js`, nothing else)

**C1 (priority 1): finish rail.** A wounded mech that is not facing us is never held at respond-only / avoid.
- New params (advice block): `finOn: true, finHpf: 0.5, finFaceCos: 0.5, finLoLaser: 100, finHiLaser: 190, finLo: 60,
  finHi: 150, finMult: 1.5`.
- New module constant next to `ARCHETYPES`: `const FIN_REASON = Object.freeze(['N/finish', 'LK/finish', 'LZ/finish',
  'GS/finish', 'BR/finish', 'HD/finish', 'FM/finish', 'LB/finish'])` (one entry per archetype index).
- In `counter(s, c)`, after the closing brace of the `switch`:
  ```js
  if (P.finOn && s.label !== UNK && CT.level < 2 && s.hpf < P.finHpf && !(s.aimDot > P.finFaceCos) && !s.chargeOn && t - s.lastDmgUsT > P.hostileS) {
    CT.lo = myLaser ? P.finLoLaser : P.finLo; CT.hi = myLaser ? P.finHiLaser : P.finHi
    if (s.lightning && !myLight) CT.lo = Math.max(CT.lo, P.lzLo)
    CT.level = 2; CT.mult = Math.max(CT.mult, P.finMult); CT.reason = FIN_REASON[s.label]
  }
  ```
  In words: under 50% hp, torso at least 60 deg off us (the last seen aim, so a dropped listing does not flip it),
  no charging flag, no hit on us in the last 4 s -> `opportunistic` (= the neutral level, so the brain's own gates decide
  the first shot), band 100-190 m with our laser (60-150 m without; never inside 65 m of a lightning carrier when we
  have no lightning), target x1.5 before blending, dodge and break-LOS of the archetype kept. The thresholds are the
  brain's (50%, as `tactics.js` and LK/third use) and K3's / HD/late's (60 deg). It turns off the moment the mech
  charges, hits us or turns its torso onto us.

**C2 (priority 2): laser-kiter range ramp** `lkR0: 80 -> 70`, `lkR1: 110 -> 100`. proj1's FFA hold (about 100 m, the
TTUN laser band 95-125 m) then scores the full range term instead of sitting on the 0.5 threshold.

**C3 (priority 3, optional): new archetype LASER_BRAWLER (dossier M1 / A4).**
- `const UNK = 0, LK = 1, LZ = 2, GS = 3, BR = 4, HD = 5, FM = 6, NA = 7` -> `..., FM = 6, LB = 7, NA = 8`; append
  `'LASER_BRAWLER'` to `ARCHETYPES`; `rankArch: [1, 1.4, 1.5, 1.2, 1.3, 0.5, 0.8]` -> `[..., 0.8, 1.3]`.
- Classification params (after the FARMER line): `lbOn: true, lbR0: 38, lbR1: 46, lbR2: 70, lbR3: 82, lbBoost0: 0.3,
  lbBoost1: 0.5, lbBoostCut: 0.5`.
- Score (in `score()`, after `out[FM] = ...`, before `out[UNK] = 0`): gate gun AND laser AND no lightning; held range
  H = the charge range at the mech it aims at (`f.chR`) when measured, else the nearest-foe range `f.rFoe`;
  `LB = ramp(H, 38, 46) x (1 - ramp(H, 70, 82)) x E x N x Wk x Fm`, with E = 1 if `f.chR >= 0`, else
  `ramp(f.aimMech, 0.3, 0.6)` (engaged with a listed mech now; cumulative charge counts are not enough); N = the LK
  closing term (`1 - ramp(f.cl90, 3, 7) x f.cl90w`); Wk = `1 - 0.5 x ramp(f.boost, 0.3, 0.5)`; Fm = the LK farming cut
  (`1 - 0.7 x ramp(f.aimLoot, 0.12, 0.35)`).
- Advice params: `lbLoLaser: 125, lbHiLaser: 185, lbLo: 200, lbHi: 280, lbMult: 0.9, lbDodge: 0.8, lbDashAlive: 0,
  lbDashLo: 0, lbDashHi: 43, lbDashMult: 1.3, lbDashDodge: 0.6, lbDashHpf: 0.7, lbDashEnergy: 70`.
- Advice case `LB` (before `default`): `LB/cover` = band 125-185 with our laser (our own D2 laser band, so no band
  change), 200-280 without (outside its vision, like LK without a laser, instead of a 55-95 m gun trade), level 1,
  x0.9, dodge 0.8, break-LOS on its charge. `LB/dash` (K7) only if `lbDashAlive > 0` and we hold lightning, it has none,
  alive <= `lbDashAlive`, our hp >= 70% and >= its fraction, energy >= 70: band 0-43, level 3 (still behind the 0.6
  weight gate and the 60%-hp rail). **Off by default** (`lbDashAlive: 0`) until a duel check in `sim/`.

**Not changed here:** K4's timing output (dossier M8, `peekUntil = last laser beam + 1.65 s`, needs a separate
last-laser-beam time because `lastBeamT` also counts lightning arcs) and K2 (it is D0 in `senses.js`; data in 6.5).

### 6.3 Results before / after (30 seeds; all three changes on)

| Track (window) | Before | After |
|---|---|---|
| farm, gun / gun + laser | FARMER 74-75%, FM/watch + FM/strike 72% | identical |
| farm, laser on crates | UNKNOWN 52, LK 27, FM 20% | UNKNOWN 54, LK 29, FM 17% (C2) |
| kite 100 m, corner peeks / open | LK 100%; respond-only 53% / 77% (weight below 0.5 part of the time) | LK 100%; respond-only 100% / 100% |
| **kite 95 m** | LK 56%, UNKNOWN 44% | **LK 100%** (C2) |
| kite 85 m | UNKNOWN 100% | LK 39%, UNKNOWN 61% (boundary) |
| kite 70 m (our gun + laser) | UNKNOWN 100% | LASER_BRAWLER 99% (C3) |
| **kite 55 m (our laser + lightning)** | UNKNOWN 100%, neutral | **LASER_BRAWLER 100%: LB/cover** (125-185 m, respond-only, x0.91, dodge 0.77, break-LOS) |
| fights another mech at 100 m | LK/cover 98% | identical |
| **retreat, attacker hidden, we 90 deg off its torso**: boost window / <=40% / 40-50% | LK/cover 47% / 100% / 100% (respond-only, x0.73-0.75) | **LK/finish 47% / 100% / 100%** (opportunistic, 103-190 m, x1.39-1.45) |
| same, 50-80% | LK/cover | identical |
| retreat, attacker hidden, we 45 deg off its torso | LK/cover | identical (inside its 60 deg half-wedge; K3 says reposition first) |
| retreat, attacker in our view | LK/third (opportunistic, x1.41-1.45) | identical |
| control: its attacker almost in line with us (torso 15 deg off us) | LK/cover | identical |
| control: it retreats from us (torso on us) | LK/cover | identical (respond-only 86% -> 93%, C2 weight) |
| quiet-final 170 m kite | LK 100% | identical |
| `LB/dash` switched on (`lbDashAlive: 2`), 2 alive, our L+Z, our hp 100% | - | LB/dash 100% (attack, blended band 13-57 m, x1.27); with 10 alive, our hp 90% (< its 100%) or no lightning: LB/cover |

Regression: `tools/test_counters.js` pointed at the scratch copy (`t2696_test_counters_mod.mjs`) passes 15/15 at 30
seeds (archetype tracks 390/390, slowest first read 4.7 s as before; mixed tracks 120/120 UNKNOWN, midDual included;
SQUAD 127,500/127,500 neutral; fuzz, determinism, frozen inputs; kit stream house bot still LASER_KITER 0.705; cost
mean 54 us per update with 15 mechs). The original module passes the same 15/15 at 30 seeds.

### 6.4 Backfire analysis

| Change | Who else it touches | Measured / reasoned | Bound |
|---|---|---|---|
| C1 | any labelled mech under 50% with its torso 60+ deg off us, not charging, not hitting us | wounded (40%) kiter charging at us: LK/cover unchanged. Wounded gun strafer shooting us: GS/break unchanged. Wounded gun strafer busy with a mech hidden from us: UNKNOWN before and after (no read, already neutral). Wounded gun + lightning closer on a hidden mech at 28 m: LZ/keep (respond-only, 76-112 m) -> LZ/finish (opportunistic, 104-188 m, x1.40): the D11 wounded third party, from beyond its 45 m reach | the rail only lifts the level to the neutral 2, so target eligibility equals the module-off brain; no first shot is created by the module. Dossier warnings kept: no harvest of a healthy proj1 (needs < 50%), M4's "40% if bolder than level 2" (it is level 2). Residual risk = module-off risk: the mech that wounded it may still be near and unseen |
| C2 | laser holders 70-110 m from their nearest foe, walking, not closing inside 90 m | suite unchanged (the AT closer starting at 80-95 m still reads LIGHTNING_CLOSER: its closing term kills LK before the 4 s label); TTUN with a laser (95-125 m) reads LK more firmly, which strengthens the existing M10 behaviour (LK third-party band 100-190 m) but adds no new conflict; RN SUS at 75 m (reasoned, no track): LK range term 0.17, LB 0.58, so LB under C3 | LK/cover is respond-only + cover: a wrong LK read costs tempo, not health |
| C3 read | gun + laser, no lightning, engaged with a listed mech at 46-70 m (0 at 38 and 82 m): proj1 vs L+Z (measured at 55 and 70 m); by the dossier's numbers also 404 (60 m), RN SUS (75 m), 314159265 (45 m, edge) (not tracked) | no suite track reads LB; gun + laser passing at 60 m without aiming: UNKNOWN; laser + lightning holding 55 m: LIGHTNING_CLOSER as before; healthy gun + laser at 60 m on a mech hidden from us: LK/cover (LB needs a listed target) | LB/cover = our own band with a laser; the level drop only removes voluntary candidacy (finishable is exempt in the wiring, wounded comes back through C1). Without our laser it moves us to 200-280 m instead of 55-95 m (both guns hit 75-100% at 45-75 m) |
| C3 dash | only when switched on | not duel-tested; K7's worst case (a lightning brawler) is excluded by the gate; timing "right after its beam" needs M8 | 'attack' needs weight >= 0.6 and our hp >= 60% (existing rails) |

Hygiene: the new strings (`LASER_BRAWLER`, `LB/cover`, `LB/dash`, `*/finish`) contain no forbidden word. Practice
score: unchanged (module inert outside FFA; SQUAD check 127,500/127,500).

### 6.5 Where each K counter lives after this

| K | Lives in | Status |
|---|---|---|
| K1 opening amnesty | D0 / SQUAD (before our latch the module is inert) | no module change |
| K2 aim dwell | `senses.js` D0 aim test. Measured on the same tracks (12 deg, inside 160 m, 1 s memory): proj1 farming sweep flagged 11-16% of decisions; with a 0.3 s dwell 5-7%; with 0.6 s 1%; gun + laser passer at 60 m 22 / 17 / 5%; real aimers (kite tracks) 100 / 100 / 98-99%. The study's 42% is for our worst bearing inside 160 m; along a real circuit it is lower. **0.3 s halves the false flags, 0.6 s (proj1's own dwell) removes about 93% and still flags 98%+ of real aimers**: test 0.6 s, keep "at once while its laser charges at us" | D0 one-change submission (SQUAD-affecting) |
| K3 retreat finish | C1 + the brain's D11 clause | fixed for the hidden-attacker case; still only after `ffaQuietS` (90 s). An earlier finish would need level 3, which overrides D11's quiet period: not proposed |
| K4 corner beam in its windows | LK/cover's break-LOS and dodge (exists); the 1.65 s peek window is dossier M8 | M8 unchanged |
| K5, K6, K9 | brain (D6 / D11) | no module output needed |
| K7 lightning dash | C3 `LB/dash` | off by default; needs a `sim/` duel against the roster's proj1 copy |
| K8 quiet-final corner | none (we are still in SQUAD) | - |

Merge order for the engineer: C1 alone first (smallest, the only measured advice conflict), then C2 (two numbers), then
C3 if time allows; rerun `tools/test_counters.js` after each.
