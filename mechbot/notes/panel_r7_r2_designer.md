# Panel R7, round 2: chief game designer and owner-doctrine lead (role `designer`)

Written Sat 21 Nov, about 21:50-22:15 UTC. Read: the brief, the moderator's digest, all five round-1 memos (game,
stats, eng, psych, stress), all four research memos (exploit, risk, bestof, engage), `submissions.md`,
`build_r7a_log.md`, `build_spec_r5.md` / `build_spec_r6.md` (item lines), `panel_r6_rewards.md` (RW, heal rows),
`bot/lib/params.js`, `tactics.js` (`engaged`, `losing`, `decideMode`), `hunt.js` (seek gate). No simulator runs, no
sub-agents, no web search: every number below is quoted from those notes or is arithmetic on them.
Tags: [M] official, [T] top bot, [S] our simulator (behaviour only), [A] arithmetic / model, [N] no evidence.

Build status at 21:49 (owner asked for hashes ready to test): nothing from the R7 build is pushed yet (the build log
stops at checkpoint 01, RB2-RB6, unpushed). The hashes that `submissions.md` lists as pushed and gated (GO 35/1 waived)
are: KB s0 `8428d2e3a17b6e79f26a3308a61918b0bdf46f1e`, KB s1 `d4518215b1e51cfdc493c88227ee483f93e9e500`,
KS s3 `82aaa51eb42092bcae2364924e98ccbc401e6ffd`, KS s4 `dc2cedddd9f7a231388508f10013c6e786cb6689`,
KS s5 `03d0b946799d2d03bbff6c9f2bcb42362921831e`, and from the earlier batch KS s1
`5898265c0b4fc41935c515aba851c7e695c4636a`, KS s2 `692325a02ff803829ac6615eedeaf5085bb1c1e5`. I could not check which
of these have been submitted since.

## Step 1. The objective in numbers

- Score = mean over 48 seeds of house bots dead before we die = our kill count before death [S 49/49].
- Leader family true mean about 5.0 (KS 5.19 is one draw; stats fit 4.93 +- 0.06 for V4; bestof 5.03) [M, A].
- Cut: about 5.4 now, 5.6-5.8 expected at close. A safe qualification needs a true mean of about 5.3 (cut 5.6) or
  5.5 (cut 5.8) [A stats]. So we need +0.3 to +0.5 of true mean, not of one draw.
- Budget: about 100 slots to Sun 15:15 UTC, 6 per hour. Salts alone give P(5.8) about 0.06 [A bestof].
- Final: the nominated commit must itself score above the cut; it then plays a free-for-all on new seeds where
  points come from others' deaths (placement), so the same code needs a tighter posture there.
- In kills: 5.0 is 4 easy + 1 medium. The target is one more medium kill in a third to a half of matches.

## Step 2. Claims that matter for this role

| # | Claim (source) | Steelman | Refutation attempt | Verdict |
|---|---|---|---|---|
| 1 | Practice is a phase-1 match; score = our kills; we die in the escalation fight at k 3-5 with 3.1 attackers, entered at 44-64% hp (game) | 13/13 deaths in phase 1, 49/49 kills ours [S]; official mean 5 at 80-100 s agrees [M+A] | sim hunters follow an assumed "1 + k" rule [N]; real non-hunters may behave differently | Accept as the frame [S, A]. Every practice item is judged by "one more kill before the pile-up" |
| 2 | The 14 knob flips moved the mean by about 0 (tau 0.04); only behaviour-level arms can carry +0.3 (stats, bestof) | homogeneity p 0.51 over 14 draws [M, A] | KS 5.19 and V1-V2 +0.38 are also single draws | Accept [M, A]. Consequence: no more slots for single-number flips as solo draws |
| 3 | Leaving fights loses: A25 -1.10, A06 -0.60, far-cover exits -0.25 per match (game, engage) | shared vision, house bots never retreat, so a retreat sheds nobody and stops our damage [M, S] | A05 -0.41 when low-hp hiding was removed; heal breaks +0.17 on one draw (0.00 pooled) | Accept with the A05 clause: leave only when cover is close or hp < 25% [M]. The 70% gate never ends a fight |
| 4 | FIN is first in the queue (game, psych, engage, exploit as Smith's rule) | 23 near-kill exits never converted per 20 matches, 7 of 10 on an empty magazine [S]; G01 +0.39 and A32 +0.34 on other teams' bots [M] | those two official readings are other bots with possibly more wasted near-kills; our `finishHpf` 0.2 rule already keeps some | Accept. It is the only queued item with both a per-match count large enough for +0.3 (1.15 wasted near-kills per match) and official same-sign readings of that size |
| 5 | Gun-only is the largest gap: 540 hp per kill against 343 with a laser; laser held in 15-18% of decisions to k = 3 (game) | a 36% cut in hp per kill over 82-85% of early decisions is the biggest arithmetic lever on the board; [T x3] hold a laser by 24-50 s | the 343 figure is confounded (lasers arrive from kill drops in matches already going well); official laser-seek readings are flat or negative (K0 -0.11, laser-first walks -0.06..-0.11) and the leader runs `laserEcon` off [M] | Half accept. The cause is information (loot is listed only while seen: laser known in 4 of 13 openings [S]), so the fix is a look, not a longer walk. High variance, which the best-of scoring rewards |
| 6 | Heal variants are near 0 because lulls are short: median 6.3 s, P(>= 13 s) 0.14; exit 70 -> 90 changed 1 of 40 matches (RW) | regen needs 5 s of silence then 45 hp/s; a heal 45 -> 70% completes in 14% of lulls [S] | entry 80-100% gives 2.43 kills against 1.78 at 60-80% [S], so hp at entry is valuable if it could be had | Accept: the value is real but the hunters set the lull, not our threshold. Heal presets are doctrine hygiene, not the +0.3 |
| 7 | KB (any70) is the doctrine gate (owner, engage) | hp >= 70% pays for a two-line fight (63% of hp, Lanchester) [A]; idle time at full hp is wasted (-0.08 per 10 s) [S] | opening more fights was punished three times on other bots (A12 -0.37, R11 -0.29, A23 -0.18) and G02 +0.23 for leaving idle bots alone [M]; a non-hunter opened at k >= 3 adds a line exactly when the next fight is already multi-line (q 0.75-0.88) [S] | Open; the two draws decide. My prior: +0.05 (-0.25..+0.30) |
| 8 | The one-volley guard almost never binds at 70% (engage) | needs 3-4 lasers at once [A] | none found | Accept. It is a rail for the final; no practice slot |
| 9 | ISO first of R5a by Lanchester (exploit) against "peek/cover fighting -0.71" (same memo) | one line at a time costs n, not n(n+1)/2 [A] | isolate legs take 73 hp/s against 42 in stand-off [S]; A17 -0.71 [M] | ISO `near` is the right form because it removes long isolate legs. Rank it behind FIN and LC |
| 10 | PRE precharge +0.03..+0.10 for 60-90 min (psych) | the 0.25-1.15 s first-shot window is real [R] | size is below tau; `laserEcon` off (no holding) won [M]; we are gun-only when it would matter | Reject for tonight under the doctrine (over-coding) |
| 11 | `calm: 'rear'` (psych) against KB | G02 +0.23 [M other bot] | it is the opposite of KB; both cannot be right | Conditional: draw it only if KB reads <= -0.15 on two draws |
| 12 | `risk: sched` nine maps over 20 read sites, practice +0.05 (game); "below one draw's sd, one slot at most" (risk) | principled | 60-90 min, 20 sites, size below tau | Reject for practice. Keep `risk ffa` only as a final-only preset |

## Step 3. The open question

**No single change has better than about a one-in-five chance of a true +0.3.** Fourteen draws put every past item
within +-0.06 [M, A], and that prior has to be respected. Ranked by the chance of reaching +0.3:

1. **FIN, widened to one behaviour: "never give up a kill we can finish before we die".** Chance of +0.3 or more about
   0.2; expected +0.12 (-0.10..+0.35).
   - Why it fits the arc: the score stops in a fight with about 3 attackers that lasts 18.6 s and already carries 1.7
     kills [S]. In that fight hp cannot be saved (retreat sheds nobody), so the only thing left to buy is the next
     kill. 1.15 near-kills per match are abandoned today [S]; converting a third is +0.35.
   - It is the doctrine's "maximum reward" read correctly: every house bot is worth exactly 1, so the best target is
     the cheapest kill, which is the one closest to dead.
   - LC (`loseCover: 'near'`, with the hp < 25% clause) and LX (`loseExit: 'on'`) are the same behaviour seen from
     the retreat side: leave only when leaving works, and do not flip in and out. I treat FIN + LC + LX as one
     "commit" arm after FIN's solo draw.
2. **A laser before the first hunter (LG, plus a spawn look-around).** Chance of +0.3 about 0.15; expected +0.10
   (-0.20..+0.40). It is the widest distribution on the list, which the best-of scoring pays for.
   - Arithmetic [A]: about 13 floor lasers on the 560 m circle is one per 74,000 m2. The 120 degree, 200 m wedge plus
     the 45 m disc covers about 46,000 m2: P(a laser in view at spawn) about 0.46 before walls, 0.31 measured (4 of
     13 [S]). A full turn covers 126,000 m2: about 0.82 before walls. The mean nearest laser is about 140 m away, a
     14 s walk, inside the window where nothing hurts us (first hurt at a median 32 s [S]).
   - This is also the doctrine: at 100% hp with no line on us, the maximum reward is the item that cuts hp per kill.
3. **KB (any70).** Chance of +0.3 about 0.1. Already pushed; read it, do not extend it.
4. Everything else on the list is below +0.1 in expectation and is either a ride-along or a final-only rail.

Judgement of each named item against "one more kill before the pile-up":

| Item | Verdict | Expected practice delta | Slot policy |
|---|---|---|---|
| KB `aggr: 'any70'` | the doctrine gate; sign open | +0.05 (-0.25..+0.30) | 2 draws pushed. Mean >= 5.10: it becomes the base. Mean <= 4.85: drop and draw `calm: 'rear'` once. Between: KS stays the base |
| One-volley guard `aggr: 'h70g'` | never binds in practice | 0 (+-0.02) | no practice slot; on in the final posture |
| FIN `finish: 'ttk'` | top | +0.12 (-0.10..+0.35) | first new-code slot |
| LC `loseCover: 'near'` | same behaviour as FIN, retreat side; keep `hpf < 0.25` | +0.05 (-0.15..+0.20) | inside the commit arm |
| LX `loseExit: 'on'` | bug fix | +0.03 (-0.05..+0.10) | inside the commit arm; no solo draw |
| ISO `isolate: 'near'` | fewer costly isolate legs | +0.05 (-0.10..+0.20) | one solo draw after FIN and LG |
| LG `laserGrab: 'wide'` | the structural ticket; needs the look-around to act often | +0.10 (-0.20..+0.40) | second new-code slot |
| AVO `focus: 'av'` | same rule as `focus: mult` + FIN; a targeting rewrite for about 0 | 0 (-0.15..+0.15) | last; only if FIN reads >= 4.95 |
| PRE `precharge: 'line'` | over-coding for +0.03..+0.10 | n/a | veto for tonight |
| `calm: 'rear'` | opposite of KB | -0.05..+0.15 | only if KB fails |
| `h50CrowdR` 60 -> 120 | right direction (a hunter with a neighbour costs three times a lone one [A]) | +0.03 (-0.05..+0.10) | ride-along on the next seek-base re-draw; no solo slot |
| heal `need` / `full`, `healExit` 90 | lull-limited | 0 (-0.15..+0.15) | see the rule set: one param line, ride-along. HF (100%) one draw at most, as the owner's earlier request |

### The doctrine as an exact, minimal rule set

Four rules, no schedule, no clock, all on existing or already-queued keys. `aggr` key names are the engineer's.

**R1. Gate to start or seek a fight (out of contact, or choosing a non-hostile mech).**
- Allowed when `me.hpf >= 0.70` and the one-volley sum of lines on us leaves at least 10% of max hp
  (`aggr: 'h70g'` guard; in practice it is always true).
- Seek: `seek: 'on'` with `h50SeekHpf` 0.60 -> 0.70 (as KB sets it), `h50SeekFromS` 20 (the opening guard stays).
- A mech that already shoots us is always answered at any hp (D0 hostile rule, unchanged). The gate never applies to
  a fight in progress.

**R2. Target value.** Every house bot is worth 1, so value = 1 / (hp it costs us).
- In contact: `focus: 'mult'` (nearest first, x2 finishable, x1.6 the mech that hit us, x1.3 current) plus
  `finish: 'ttk'`: a target we can kill before we die is never dropped.
- Seeking: the existing prey cost (`h50Hp` 0.05, `h50Hostile` 80, `h50Laser` 60, `h50Crowd` 100 inside `h50CrowdR`),
  with `h50CrowdR` 120: prefer the lone, the wounded and the one already hostile.
- With no laser and none of the above in view at full hp: the best reward is a laser (`laserGrab: 'wide'`).

**R3. When to leave a fight.** Only by `losing()` at the V4 lines (`retreat: 'd3'`: `lose1Hpf` 0.35 with
`lose1Margin` 0.10, `lose2Hpf` 0.50, `lose3Hpf` 0.60, `lose6` 6), and then only if
- no finishable target (`finish: 'ttk'`), and
- cover is reachable within `lcCoverS` 1.5 s or hp < 25% (`loseCover: 'near'`), and
- the exit is not a one-tick dip of the threat count (`loseExit: 'on'`).
Otherwise fight on at the shortest time-to-kill. The 70% number never ends a fight [M A25 -1.10].

**R4. When to heal.** Out of contact for `healQuietS` 1.5 s and `me.hpf < 0.70`: HEAL in the nearest hide cell until
hp >= 0.80, contact, or a finish arms.
- Params: `healEnterHp` 0.55 -> 0.70 and `healExit` 0.70 -> 0.80 (one preset line, for example
  `heal70: { healEnterHp: 0.70, healExit: 0.80 }`), or `heal: 'need'` with `healMinExit` 0.70 once built.
- This closes today's dead band: under KB, between 55% and 70% we neither seek (`h50SeekHpf` 0.70) nor heal
  (`healEnterHp` 0.55) nor farm (`farmHp` 0.90). We stand in the open, where one stray hit resets the 5 s regen clock.
- `farmHp` 0.90 stays (a drone hit resets regen).

That is the whole doctrine: R1 gate at 70%, R2 cheapest kill, R3 leave only when leaving works, R4 heal below 70%.

## Step 4. Recommendations (ranked)

1. **FIN `finish: 'ttk'` on the base, first slot on new code.**
   - Site: `tactics.js` `losing()` (the `finishing` line, `finishHpf` / `finishThreats`) and `selectTarget`, as
     `build_spec_r5.md` item 2 specifies. No change to the spec.
   - Delta +0.12 (-0.10..+0.35). Engineering: already in the queue (about 20 min). Ask the engineer to move it ahead
     of the remaining `aggr` variants if those are not done: `h70` and `h70g` do not need a practice slot.
   - Failure mode: it holds us in a fight that a retreat would have survived (A05 -0.41 is the warning).
   - Test: salt 0 on KS (or on KB if KB's two-draw mean is >= 5.10), then a fresh salt if the first draw is >= 4.95.
2. **LG `laserGrab: 'wide'` with a spawn look-around, second new-code slot.**
   - Site: `economy.chooseGrab` (`grabLaserR` 60 -> 130 with no laser, `nLos <= 1`) as specified, plus one addition:
     during the opening guard (`earlyOpenS` 20, no line on us, no laser known) run one full torso turn. `lib/scan.js`
     already has a torso sweep behind `scanOn`; reuse it with a spawn trigger rather than writing a new one.
   - Delta +0.10 (-0.20..+0.40). Engineering: LG as queued plus about 25 min for the look-around trigger.
   - Failure mode: the walk meets the first hunter gun-only and in the open (the measured -0.06..-0.11 of laser-first
     walks). Guard already in the spec: hostile mechs are answered, grabs yield to a new attacker (eng amendment).
   - Test: salt 0 on the same base as FIN; keep if >= 4.95.
3. **Commit arm: FIN + LC (with `hpf < 0.25`) + LX as one SELECT, after FIN's solo draw.**
   - Delta +0.15 (-0.15..+0.40). Engineering: none beyond the queue (one SELECT string).
   - Failure mode: three retreat-side changes in one draw cannot be told apart. Accepted: they are one behaviour.
   - Test: one draw at salt 0, a second on a fresh salt if >= 4.95. If FIN's solo draw is < 4.75, draw LC + LX only.
4. **KB decision rule, then the doctrine heal line as a ride-along.**
   - KB two-draw mean >= 5.10: KB becomes the base for 1-3 and carries `healEnterHp` 0.70 / `healExit` 0.80 and
     `h50CrowdR` 120 on its next re-draw (params only, 5 min). <= 4.85: drop KB, one draw of `calm: 'rear'`.
     Between: KS stays the base and the ride-alongs go on a KS re-draw.
   - Delta of the ride-alongs +0.03 (-0.10..+0.15). Failure mode: more HEAL time in a hide cell while a hunter
     closes. Metric: deaths within 3 s of a heal exit not above the base [S, behaviour].
5. **ISO `isolate: 'near'`, one solo draw; then stop adding.**
   - Delta +0.05 (-0.10..+0.20); queued. After it, slots go to second draws of whatever read >= 4.95 and to one
     stack of the survivors, per the stats and bestof rules.
   - Not tonight: PRE, `risk: sched` in practice, AVO before FIN is read, any kiting or peek work, HF beyond one draw.
   - Final posture (no practice slot, identity draw only): `aggr` guard on, `risk ffa`, the psych 62 m bubble, the
     stress ZG1 fix. I defer the detail to those memos.

## Step 5. Self-critique

- **FIN would be wrong if** the abandoned near-kills are abandoned for good reason: we leave because 2-3 other lines
  are killing us, and staying converts the kill only rarely while removing the low-hp hiding that A05 measured at
  +0.41. The two supporting official readings come from other teams' bots.
- **Cheapest check:** the draw itself, plus two behaviour counts from the engineer's smoke run on seeds 1-10 (no
  ranking): never-killed near-kill exits per 10 matches (spec target below 4, today about 11), and kills landed
  inside FIN holds against deaths inside FIN holds. If holds end in our death more often than in a kill, do not stack.
- **LG would be wrong if** real hunters arrive before 20 s more often than the simulator's median 32 s, or if a
  floor laser is worth less than the confounded 540 / 343 figures say. Check: share of openings with a laser known by
  10 s and held by 30 s, before and after [S]; if the "known" share does not rise from about 0.3, the look-around is
  not acting and the arm is only the old laser walk.
- **The whole memo would be wrong if** the escalation rule is by clock and not by kills (game memo question A2):
  then faster early kills do not bring the pile-up forward and KB / seek are worth more than I give them. KB's two
  draws are the evidence.
- A dead end I considered: retreating from approaching hunters between fights to stretch the lull (equal walking
  speed means a 170 m run would buy a full heal). It has no evidence [N], needs new movement code, and sits next to
  ten failed hide-first tests [M]. Not proposed.

## Summary for the moderator

Memo: notes/panel_r7_r2_designer.md. No sim runs; arithmetic on the round-1 and RW numbers.
1. Objective: family mean about 5.0; need a true +0.3 to +0.5 (mean 5.3 for a 5.6 cut, 5.5 for 5.8) in about 100
   slots. In kills: one more medium in a third to a half of matches.
2. Honest size: no single item has more than about a 0.2 chance of a true +0.3 (14 draws: every past item within
   +-0.06 [M, A]).
3. Most likely single change: **FIN, read as "never give up a kill we can finish before we die"**. 1.15 near-kills
   per match are abandoned [S]; G01 +0.39 and A32 +0.34 on other bots [M]. Expected +0.12 (-0.10..+0.35).
   LC (keep `hpf < 0.25`) and LX are the same behaviour from the retreat side: one "commit" arm after FIN's solo draw.
4. Second: **LG with a spawn look-around** (reuse `lib/scan.js`). A laser is in view at spawn in about 0.3-0.46 of
   openings; a full turn makes it about 0.8 before walls [A]. +0.10 (-0.20..+0.40): the widest ticket.
5. KB (any70): prior +0.05 (-0.25..+0.30). Two-draw mean >= 5.10: new base. <= 4.85: drop it and draw `calm: 'rear'`
   once (they are opposites). Between: KS stays the base.
6. One-volley guard: never binds in practice; no practice slot; on in the final posture.
7. Ride-alongs only (no solo slots): `h50CrowdR` 120; doctrine heal line `healEnterHp` 0.70 / `healExit` 0.80.
   It closes a dead band: under KB at 55-70% hp we neither seek, heal nor farm. Heal is lull-limited (median lull
   6.3 s [S]), so expect 0 (+-0.15).
8. ISO `near`: one solo draw after FIN and LG. AVO last, only if FIN reads >= 4.95.
9. Vetoes for tonight: PRE, `risk: sched` in practice, kiting or peek work, more than one HF draw, solo draws of
   single-number flips, any rule where the 70% gate ends a fight in progress.
10. Doctrine, four rules: R1 start or seek at hp >= 70% with the volley guard (`aggr`, `h50SeekHpf` 0.70); hostile
    mechs always answered. R2 target = cheapest kill (`focus: 'mult'` + `finish: 'ttk'`; prey cost with
    `h50CrowdR` 120; a laser when gun-only and nothing in view). R3 leave only by `losing()` at the d3 lines, and
    only with no finishable target, cover within `lcCoverS` 1.5 s or hp < 25%, and `loseExit` on. R4 heal out of
    contact below 70% to 80%.
11. Engineer order I ask for: FIN, LG + look-around, LC, LX, ISO; `h70` / `h70g` after those.
12. Hashes ready now: no R7 build is pushed (log stops at checkpoint 01). Pushed and gated per `submissions.md`:
    KB s0 8428d2e3a17b6e79f26a3308a61918b0bdf46f1e, KB s1 d4518215b1e51cfdc493c88227ee483f93e9e500,
    KS s3 82aaa51eb42092bcae2364924e98ccbc401e6ffd, KS s4 dc2cedddd9f7a231388508f10013c6e786cb6689,
    KS s5 03d0b946799d2d03bbff6c9f2bcb42362921831e (submission status since 21:40 not checked).
13. Questions: Engineer: can the smoke run report never-killed near-kill exits and kills against deaths inside FIN
    holds? Is the `scanOn` sweep reusable at spawn in under 30 min? Stats: is escalation by kills or by clock (it
    sets KB's value)?
