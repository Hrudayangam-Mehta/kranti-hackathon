# Fable panel, round 1: behavioural psychologist / opponent modeller (+ playtest design)

Written Sun 22 Nov, about 01:10 UTC. Read: FABLE_BRIEF (incl. 00:45 update), FABLE_PLAN, moderator_r1, BUILD_LOG,
panel_r7_r1_psych, stance_playbook, housebot_model.json, forensics (headings + sections quoted in the R7 memo),
submissions (tail), measured_deltas (lightning rows), ckpt_07_LG/lib/{params, tactics, brain, hunt, senses}.js.
Scratch: scratchpad/fable_work/r1_psych/ (patched copy of lib + sim runs). Nothing outside the two allowed folders was
written. Tags: [M] official, [R] replay / kit stream, [S] simulator (behaviour only, ranks nothing), [A] analysis,
[N] no evidence.

## 0. Bottom line

1. The base (5.35, low10) has already removed nearly all retreats: in the simulator the LC veto fires on about 59
   decisions per match against about 2 LOSING entries per match [S, 36 seeds]. "Retreat less" is close to spent
   (never / low05 are the last two values). The next gains from the house habits are about **where the torso points and
   who we shoot while we stay**, not about leaving later.
2. The largest untouched behaviour that contradicts a measured house habit is the **torso veto** (tactics.js
   selectTarget, the `att` loop): about 9.4 forced target switches per match [S], each made toward an attacker that is
   hitting us, including one that has just emptied its magazine and cannot fire for 2.5 s [R, 72/72 never reload early].
3. Five proposals below. **Measured caveat (section 4): the bot's "it is reloading" sensor fires about 0.5 times per
   match in the simulator, so P1 and P2 need a small sensor fix (`magCarry`) first.** Ready-to-draw order:
   P3 `hostMem` (a first look is possible today with a plain override) > P4 `openPick` (fresh salt) > P1 `vetoSilent` + `magCarry` >
   P2 `lcSilent` > P5 `lightFirst` (measure first). By expected value if the sensor works: P1 > P3 > P4 > P2 > P5.
4. Final: seven of the twelve house habits do not transfer. All five proposals sit behind `hunt.firewall()` or the
   `a7` clause, so they stop at the first foreign death; the residual leak is the final's opening (before that death),
   which the current nominated build already has (any70f, low10). One existing FFA code site uses a practice habit and
   is listed for the moderator (section 3).
5. Simulator: only the sensor measurement is valid (8 seeds, fuse 0). My probes of P1 / P2 / P4 were lost (fuse trips
   under machine load, then overlapping runs); no divergence counts are claimed. See section 4.

## 1. The habits, restated as decision rules for a bot that stays in the fight

| Habit [evidence] | What it means when we do not retreat | Used today? |
|---|---|---|
| First shot 0.25 / 0.65 / 1.15 s (p10 / p25 / p50) after a line opens [R, 77 acquisitions] | A new (third) line is harmless for about half a second: keep shooting the current target, do not turn | no: the veto turns us as soon as its dps estimate reaches 60 |
| 12 rounds in 3.3 s, then 2.5 s silent; never reloads early [R 72/72] | A hunter whose `magN >= 12` is worth 0 dps for up to 2.5 s. With two hunters both are silent about 18% of the time [A] | only brain.js:459 (close in, gun-only builds). Not in the veto, not in LOSING |
| House laser: releases at full charge, at least 2.4 s between beams [R stream, n=6] | After a beam the laser holder is gun-only for 2.4 s | only FFA rule 1 |
| Turn to an unseen attacker: median 1.6 s, return fire 2.6 s, 189 hp taken first [R n=32] | A mech showing its rear is the cheapest opener (x1.5 damage, 2 s free) | no: the opening pick is nearest-first |
| Never retreats, never heals; under 20% still closes [R] | A hunter that hit us is a hunter until it dies; it will come round the wall | no: hostility lapses 4 s after its last hit (`hostileDmgS`) |
| Shared vision; hunters weakest tier first; more hunters per kill, arriving from 150-400 m [track page, L] | The third attacker is the next hunter walking in, 13-35 s after our kill, on a straight path to our true position | seek prey has a crowd term (`h50Crowd`); the opening pick has none |

## 2. Proposals (at most five)

Common to all: new preset, first value = today (byte identity by construction); behind `B.env !== 'FFA'` and
`hunt.firewall()` (SQUAD posture, no foreign death, next radius > 70, more than 3 alive). Each needs a T-F2 case (acts
in SQUAD, identical in forced FFA) and the 84/84 identity run at the old value. "Divergence class": L = under about 5
of 36 sim matches touched, M = 5-15, H = more.

### P1 `vetoSilent` (rank 1): the torso veto ignores an attacker that cannot fire
- **Site**: tactics.js selectTarget, the `att` loop (line "if (tr.npc || tr.a < 60 || t - tr.lastDmgInT > 2 || tr === pick) continue").
  Add one skip line: when `P.vetoSilent && !ffa && B.hunt.firewall()` and
  `tr.magN >= P.magSize && t - tr.lastBulletT < P.magReloadS - P.vetoSilentPadS (0.8)` and not
  `(tr.hasLaser && t - tr.lastBeamT > P.vetoSilentBeamS (1.4))`, do not take it as `att`.
  Preset: `veto: { std: { vetoSilent: false }, silent: { vetoSilent: true } }`; params `vetoSilentPadS: 0.8, vetoSilentBeamS: 1.4`.
  A working patch is in `fable_work/r1_psych/lib/tactics.js` (1 line) and `params.js` (1 line).
- **Why**: `tr.a` is a 3 s average, so it stays above 60 for the whole reload silence. Today we swing the torso (0.4-0.8 s
  of slew, no damage out) onto a mech that is harmless for the next 1.7-2.5 s, and off the one that is still firing. With
  the skip we keep killing the firing one and turn to the silent one when its pad expires (0.8 s before it can fire, one
  180 degree turn).
- **Expected**: fewer wasted slews, earlier kills in 2-line fights (the fights that kill us). +0.00..+0.08 [A].
- **Divergence**: M (the veto fires in most matches; the silent share of it is a minority).
- **Playtest**: (a) unit scene: target A at 0 deg firing, attacker B at 120 deg with `magN` 12, last bullet 0.5 s ago,
  `a` 80: `std` picks B, `silent` keeps A; same scene with last bullet 1.9 s ago: both pick B; with B holding a laser and
  no beam for 2 s: both pick B. (b) forced FFA: identical. (c) sim 36 seeds: report `counters.vetoSilent` per match,
  matches that differ, and deaths within 3 s of a skipped veto (stop if above 1 in 36). (d) one official slot on salt 1.

### P2 `lcSilent` (rank 2): do not START a retreat while every line on us is silent
- **Site**: tactics.js losing(), after the LC block: if `lose && !B.losing` and the firewall holds and every mech counted
  in n1 (line within 2 s, aiming or hit us within 3 s) has an empty magazine (`magN >= 12`, last bullet under
  `magReloadS - 0.5` ago) and no live second weapon (laser with no beam for 1.4 s, mortar, lightning within 70 m), then
  `lose = false`. Preset `loseSilent: { off, on }`. Patch (12 lines) in the same scratch tree.
- **Why**: the remaining retreats on the low10 base are the "cover within 1.5 s" ones. Leaving costs our damage for the
  walk plus 6 s of HEAL window; leaving while nobody can shoot buys nothing, and the silence is exactly when our gun
  is unanswered. If they reload and we are still losing, LOSING starts then (the test repeats every decision).
- **Expected**: very small and in the direction that has paid four times [M]. +0.00..+0.04.
- **Divergence**: L (about 2 LOSING entries per match, a minority silent).
- **Playtest**: unit scenes (one silent threat: fight; one silent + one firing: leave; silent laser holder with a ready
  laser: leave); forced FFA identical; sim counter `lcSilent`; official slot only as a low-divergence ticket.

### P3 `hostMem` (rank 3): a house hunter stays hostile for 10 s, not 4 s
- **Site**: tactics.js assess(), line `tr.hostile = t - tr.lastDmgInT <= P.hostileDmgS || ...`: use
  `(sq ? P.sqHostileDmgS : P.hostileDmgS)` with `sq = B.env !== 'FFA' && B.hunt && B.hunt.firewall()` evaluated once
  before the loop. Preset `hostMem: { '4': { sqHostileDmgS: 4 }, '10': { sqHostileDmgS: 10 } }`. `hostileDmgS` itself
  must not be changed: it is read in FFA.
- **Why**: a house bot that hit us never gives up [R]. Between 55% and 70% hp, once its hits stop for 4 s (its reload
  plus a wall), it is no longer a candidate (the unengaged clause needs 70% hp), the target becomes null, the mode drops
  to LOOT / HOLD / DISENGAGE, the torso leaves it, and it re-opens on us with its own first shot. Keeping it hostile
  keeps FIGHT with the regain / chase leg (`tgt.hostile` is a chase condition, brain.js fightLegs) and keeps
  `lastContactT` fresh.
- **Expected**: unknown sign, plausible +0.05, plausible -0.05 (it also delays farming between fights). One arm.
- **Divergence**: M-H. `ofAnswer` (tactics.js:125) reads `P.hostileDmgS` itself, so with a separate `sqHostileDmgS`
  the farm-first opening is unchanged.
- **Playtest**: the plain override `hostileDmgS: 10` in the squad simulator is a first look (it also widens the farm-first
  answer window, which the real preset would not):
  36 seeds, report share of time in FIGHT / regain, kills, and deaths while chasing with hp under 40%. Stop rule: if
  deaths during `regain` legs rise by more than 3 in 36, do not build.

### P4 `openPick` (rank 4): choose the opening target by its back and its company, not only by distance
- **Site**: tactics.js selectTarget, multiplicative scoring, after `if (!tr.losOut) s *= P.wNoLos`: when
  `P.openPick && a7 && !tr.npc && !tr.hostile` (a7 = any70f clause: SQUAD, no foreign death): `s *= opRear (1.5)` if
  `tr.rearOn && !tr.aimAtMe`; `s *= opCrowd (0.6) ^ c`, c = other listed live mechs within `opCrowdR` (60 m) of it.
  Preset `openPick: { off, on }`. Patch (6 lines) in the scratch tree.
- **Why**: any70f opens on the nearest listed mech at once. A mech facing away gives x1.5 damage and about 2 s before
  it answers [R]; a mech with company within 60 m is where the second and third lines come from (seek already avoids
  such prey through `h50Crowd`; the pick that actually starts the fight does not).
- **Expected**: this is the only proposal that can move many matches; sign unproven. -0.10..+0.15.
- **Divergence**: H (it fires in every match: a near full re-roll of salt 1). By the moderator's arithmetic that is a
  poor ticket on a lucky base, so: draw it on a FRESH salt as the second-base slot (F6's slot), not on salt 1.
- **Playtest**: unit scenes (two calm mechs at 100 m and 120 m, the far one facing away: `on` picks the far one; a
  hostile mech always outranks both because the factor is skipped for hostile tracks); sim 36 seeds: first-target
  rear share, lines on us 5 s after our first shot (target: lower than base), kills.

### P5 `lightFirst` (rank 5, measure before building): a lightning carrier walking in is shot first
- **Site**: same scoring block: `if (P.sqLightFirst && sq && tr.hasLightning && tr.dist <= 90 && closingV(B, tr) > 1) s *= 2`.
  No keep-away leg: "stay 60-75 m from lightning carriers" appears only in two losing bundles (R03, R05) and is rated
  UNSUPPORTED in measured_deltas.
- **Why**: lightning is 240 dps inside about 45 m; the carrier closes at 0.59 of walk speed and zaps to empty [R].
  In the moderator's 36-seed base sweep 8 of 36 deaths were by lightning (gun 22, laser 5, npc 1) [S]. The simulator's
  house roster is a stand-in, so this share may be an artefact.
- **Playtest first**: re-run 12 base seeds keeping the event stream and report, for each lightning death, our loadout,
  the carrier's distance over its last 10 s and what we were shooting. Build only if at least half of those deaths show
  us aimed at another mech while the carrier closed from beyond 90 m.
- **Divergence**: L-M.

## 3. The final: which habits do NOT transfer

Points in the final come from outliving others, and the field is practice killers that mostly turn hostile-only after
the first death. Against them:

| House habit | Transfers? | Why |
|---|---|---|
| Empty magazine = 2.4 s reload | yes (physics), with care | a top bot may reload early or carry `gun_mag`; `magN >= 12` still means empty on a stock gun |
| Laser dead time after a beam (1.65 s + charge) | yes (physics) | but top bots release partial lethal beams (kyoto) or hold to 2.75 s (MAGIC) |
| Slow first shot (0.25-1.15 s) | NO | top bots pre-aim and fire on the first clear tick |
| Never reloads early, fixed cadence | NO | |
| Ignores our charge flag | NO | giddy, MAGIC and kyoto sidestep on the flag |
| Slow turn to an unseen attacker | NO | kyoto turns to unexplained sounds; proj1 sweeps +-109 deg |
| Never retreats, never heals | NO | giddy takes cover at 38%, proj1 flees; a wounded bot returns healed, so "it will come to us" fails |
| Shared vision, weakest-first hunters, escalation per kill | NO | no squad; hiding does shed pursuit; our kills attract vultures, not hunters |
| Never fights each other | NO | third parties are the main cause of death |
| "Fighting on longer pays" | NO, reversed | quiet beat fighting 10.75 vs 9.33 [L S08] |

Consequences for the nominated build:
1. P1-P5 are all behind `hunt.firewall()` / `a7`: inert from the first foreign death and in forced FFA (T-F2 must show
   it for each). They never touch a parameter that FFA code reads (`hostileDmgS`, `wAttacker`, `finishHpf`,
   `lose1-3Hpf` are deliberately left alone).
2. Residual leak, already present in the 5.35 entry: until the first foreign death the final is played in the SQUAD
   posture, so any70f + low10 (and P1-P5 if kept) act for the opening seconds against real bots. Of mine, P4 is the
   one to worry about there (it picks whom we open on); P1 and P2 only act once 12 rounds have been counted from one
   mech, which is physics. If the moderator wants a tighter wall, the cheapest is a time cap on the firewall
   (`h50FwMaxT`, e.g. practice-only clauses also require a squad clue: three mechs damaged us with no foreign death, or
   two visible mechs with mutual lines ignoring each other, stance playbook section B "Q"). That is a new firewall
   term, so it changes practice play only where the clue is absent; it needs its own identity argument and I do not
   put it in the five.
3. Existing site to review (not a proposal): ffa.js:203 (Z8 CLOSE) treats `magN >= magSize` within `magReloadS` as an
   opening on the stronger mech. It is physics-safe on a stock gun but wrong against `gun_mag` or a bot that fires in
   bursts shorter than `magSilence` (2.0 s) apart; no change asked, only awareness.

## 4. Simulator measurement (behaviour only; salt 1, low10 base, fuse disabled with `fuseMs` 100000)

Valid data (8 squad seeds 1-8, fuse 0 in all, low10 base, instrumented copy of senses.js attribute()):

| measure | value |
|---|---|
| enemy gun bursts closed by a pause of 2-4 s (`magEnd`) | 30 in 8 matches |
| of those, counted length exactly 12 | 3 (lengths 1-6: 21; 8-9: 5; 11: 1) |
| times any track reached `magN === 12` | 4 in 8 matches (0.5 per match) |
| pauses of 0.5-2.0 s inside a counted burst of 6 or more | 37 |
| torso vetoes / LC vetoes / LOSING entries | 100 / 539 / 21 |

**Finding [S]: our magazine sensor almost never says "reloading".** `magN` restarts after any 2.0 s pause
(`magSilence`) and needs all 12 rounds seen and attributed, so the only code that uses the house reload today
(brain.js:459, gun-only close-in; ffa.js:203) is close to dead, and P1 / P2 exactly as written above would fire about
once in two matches. Whether the short bursts are real (the simulator's house bots stop when the line breaks and carry
a part-used magazine) or missed bullets, I could not separate in the time. The official replay says a house bot never
reloads early (72/72) and fires whenever it has a line and a cooled gun, so the right count is CUMULATIVE: add one per
attributed bullet, never reset on a pause, reload silence when the sum reaches 12, resync to 0 on an observed gap of
2.3-2.7 s under a continuous line. That is a sensor change of about 10 lines in senses.js attribute()
(`magCarry: { off, on }`, practice-only: the "never reloads early" habit does not transfer, so it must set a separate
field, e.g. `tr.magCum`, read only by the firewalled P1 / P2 clauses and never by ffa.js).

**So P1 and P2 are conditional on `magCarry`.** Order of work: (1) engineer adds `tr.magCum` and a counter
`reloadSeen`; (2) sim 12 seeds, fuse 0: `reloadSeen` should rise from 0.5 to several per match and at least 70% of
flagged silences should really show no bullet from that mech for 1.7 s or more; (3) only then build P1, then P2.

Not obtained: valid divergence counts for P1, P2, P4. Two batches were lost: the first to fuse trips under load (23
trips in 6 base matches), the second because the first batch's loops were still writing into the same folders. The
patches for P1, P2 and P4 are in `fable_work/r1_psych/lib/` (all default off; `senses.js` there also carries the
measurement counters and must not be shipped). In the one clean P4 match (seed 1) the crowd term applied on most
decisions before the first kill and the match changed (7 -> 6 kills): consistent with class H, nothing more.

## 5. Playtest protocol for the line (QA lens)

- One change per slot, on salt 1 and the best base, kept only if strictly higher [M rule]. P4 on a fresh salt.
- Before any slot: identity 84/84 at the old value; T-F2 SQUAD acts / forced FFA identical; a trigger counter in
  `B.counters` for every new clause so the sim report can say "fired N times in M matches" (a switch whose counter is 0
  across 36 seeds is not submitted: healDoc 'on' changed 0 local decisions and cost 0.21 officially, so "inert locally"
  is not "safe").
- Run simulator sweeps with the fuse disabled or on a quiet core and check `fuse === 0` in every meta file; discard
  any batch with trips (my first batch: 23 trips in 6 matches at load 17, 5 of 6 matches "changed" with the switch
  never firing).
- Record per slot: matches touched in the sim, counter rate, official delta. After six slots, compare official delta
  against matches touched: if sign is unrelated to the count (as so far), stop reading the simulator's net column.

## 6. Questions for round 2
- Engineer: `ofAnswer` reads `P.hostileDmgS` directly (tactics.js:125), so a separate `sqHostileDmgS` leaves the
  farm-first opening unchanged while the plain override `hostileDmgS: 10` does not: the sim probe of P3 over-states
  its reach. Can `magCarry` be built and measured in 30 minutes?
- Mathematician: with P1 at divergence M and P2 at L, which goes first on a base that is about 0.2 above its mean?
- Red team: is a time or squad-clue cap on `hunt.firewall()` worth one identity slot before the final freeze?
