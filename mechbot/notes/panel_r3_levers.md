# Panel R3: rules and scoring levers (legitimate placement points only)

Written 2026-11-21, about 16:40-17:30 UTC, by the rules and scoring-levers analyst.
`P` = `/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot`

Sources read again for this note:
- `kit/protocol.md` (all of it), `notes/hello_example.json` (config and upgrade texts).
- The saved pages `web/tracks_builders.html`, `buildathon.html`, `lb_1637.html`, `status.html`, `watch.html`. I took the
  visible text and page data (chat included) as data with `tools/panel_r3/strip_page.py` and `chat_extract.py`.
  Outputs: `tools/panel_r3/*.txt` and `chat_all.tsv`.
- Notes: `rules_audit.md`, `compliance_check.md`, `mechanics_deep.md`, `measured_deltas.md`, `forensics.md`,
  `counter_dossier.md`, `notes/intel/top_*.md` (prose only), `stance_playbook.md`, `DOCTRINE_V4.md`,
  `release_candidate.md`, and the `bot/lib` sources (read only).
- New measurement: `tools/panel_r3/body_block.py`, run on the official replay.
- All arithmetic: `tools/panel_r3/levers_calc.py`, output in `levers_calc.out`.

Not opened: `P/intel`. Nothing was edited under `bot/` or `sim/`, `/home/user/kranti-hackathon` or the workbench.

Tags: **[R]** rule text, quoted; **[M]** measured (ours or another team's official scores); **[I]** inference;
**[E]** model estimate (the assumptions are stated).

---

## 0. Ranked levers (expected points)

"Board" means the practice score, where we need about +0.6 to +0.9 to stay above a cut that is still rising.
"Final" means the expected change in 16 - place per free-for-all match. Section numbers refer to the text below.

| # | Lever | Where | Expected gain | Confidence | Cost / risk | Status in bot |
|---|---|---|---|---|---|---|
| 1 | **Draw management.** Every behaviour change re-rolls the 48 fixed matches and only the best score counts. Spend every slot on a candidate change or a salt | board | +0.25 to +0.40 over 16-32 draws | medium | Each push publishes code. Worth 0 in the final | `PARAMS.salt` exists |
| 2 | **Zone as a weapon late.** Hold the next centre from about 295 s. Hunters keeping a 100-150 m stand-off then stand outside a 70 m / 25 m circle at 100-260 HP/s | board (+ final) | +0.2 to +0.5 if we live to 295 s in about 25% of matches | low (how hunters treat the zone is unknown) | None if the leash holds. Verify; do not add code | D9 / late leash built |
| 3 | **Shadow positioning.** Stand where the second shooter's line to us passes through the first one's body (bodies stop bullets and beams) | final (+ board) | final +0.1 to +0.3; board +0.05 to +0.2 | medium (physics) / low (squad) | O(n²) ray tests, about 0.05 ms. FFA: keep 50+ m from the blocker | not built |
| 4 | **Pull-through.** Drag a nearest-target chaser past a bystander until the bystander is nearer or easier than we are | final | +0.1 to +0.4 | medium | Needs a hide route. Abort rules below | not built (playbook M6) |
| 5 | **Third party within 4 s and loot the pile.** Duel survivors cannot regenerate for 5 s, and 66% of death cubes are left on the ground | final | about +0.3 (already in the bot) | medium | Exposure to a fourth mech | built (rule 3, R1b) |
| 6 | **Supply-drop magnet.** A contested ring freezes, so two bots brawl at 8 m. Watch from 60-120 m and strike the survivor | final | +0.1 to +0.2 | medium | Being seen by the ring fighters | partly (D6, M8) |
| 7 | **Last-gasp kill.** A kill that lands before our death is +1. A same-tick death shares the place | both | +0.05 to +0.15 | high (rule) | None | killSecure exists; add the trigger in section 3.5 |
| 8 | **Latch-leak and friendly-fire probes.** Two identity submissions with existing presets, no new code | board | 0 to +0.3 (only if the latch leaks) | high (method) | 2 slots | presets exist |
| 9 | **Cheap zone crossing in phases 1-2** (20-35 HP/s) to break a line or shorten a retreat | both | 0 to +0.1 | medium | Regeneration stops while outside | not built (any outside is "urgent") |
| 10 | **Sound lure.** Gunfire from cover beyond a bystander turns idle bots' wedges onto it | final | +0.05 to +0.15 | low | Reveals our bearing within 320 m | not built |
| 11 | **Drone drag** (playbook M7) | both | 0 to +0.05 | low | Conflicts with farming drones for cubes | not built |
| 12 | **Tie rules.** Board and final ties go to the earlier submission. Of equal candidates, pick the earliest | both | small, free | high | None | process |

Do not build: the stadium-bowl lure (one replay case, our own navigation avoids the bowl), lightning-chain or
mortar-splash geometry against the practice squad (hunters stay beyond 45 m), and anything in section 1.

---

## 1. Boundaries: forbidden or declined (keep away)

| Item | Rule text or earlier decision | Consequence for this panel |
|---|---|---|
| Recognising the 48 practice matches from the first observation (slot, spawn, first `next_center`) to pick a preset per match | [R] "Practice seeds are private and fixed all event. Your bot never sees the seed, and your slot and spawn vary each match." Declined in `rules_audit.md` 4.5: against the stated intent, worthless on the final's new seeds, and we "may be asked to explain" | No lookup keyed on spawn, slot or first circle. Salts are different: they re-roll every match the same way and keep no per-match knowledge |
| Connecting a program to the play server (the browser game speaks the same protocol over a WebSocket); scripted submissions | No rule allows it. `rules_audit.md` A20: "not allowed". [R] at runtime "There is no network at runtime" | Test matches come only from the scorer, our simulator and the hourly public cast (watching it is allowed) |
| Sharing or copying code between teams | [R] (chat 882, quoting the Blast Radius page) "No sharing code between teams: top entries are compared, and you may be asked to explain yours. A submission with the same repository, commit or archive as another team's is disqualified, the later one." Organizer (chat 1022): "we may remove submissions that are obviously stolen." [R] "Organizers verify the top results before announcing them." | The owner's "find their repos and take their strategy, especially kyoto-max": ideas, observed behaviour and published results only. Re-implement in our own code. **No code, no constant tables, no file copied.** Keep the readable source and the build command for the verification |
| Collusion between teams in the final (a movement "handshake", a pact not to shoot a friendly entry) | [R] "Up to two people, or enter on your own. Each person is on one team." plus the no-sharing rule | No bot-recognition handshakes and no deals. Fingerprinting rivals from public, observable behaviour is fine (we do it already) |
| Anything outside the protocol: stray stdout, abusing the sandbox, wall-clock games | [R] "Anything on stdout that is not a protocol message fails the conformance check"; the sandbox limits in protocol section 3 | The bot only plays. Debug drawings [R] "never affect the match" and stay off |
| Pushing more than the minified build, or pushing outside the submission minute | Owner's `REPO_HYGIENE.md` | Unchanged |

Everything below is play inside the rules: positions, timing and target choice, using only what the observation
shows.

---

## 2. Rule quotes that create levers

- [R] "Placement is the order mechs die in: the last mech alive is 1st, and the first to die is 16th." "Each match gives
  `16 - place` points." [R] `alive`: "Your placement if you died now would be `alive`." **Every other death before
  ours is +1, whoever or whatever causes it.**
- [R] "Mechs that die on the same tick share a placement." (track page: "Same-tick deaths share a place.") Which
  place they share is unknown (rules audit A1).
- [R] "If the clock runs out, survivors are ranked by HP." This never happens with the default config: the zone is
  a point at 415 s at 260 HP/s, and the largest possible pool (2981 HP) is gone by about 426.5 s, before the 480 s cap.
- [R] Practice: "15 house bots (4 easy, 4 medium, 4 hard, 3 expert) acting as one squad: they share vision, never fight
  each other, and hunt you weakest first (one early, more as you thin them out, all of them late)."
- [R] "Equal scores rank the earlier submission first." [R] Final: "The series mean alone decides finalist rankings,
  and earlier submissions break all ties." [R] "your chosen submission (your best unless you pick another) locks
  with its practice score." [R] qualifying and series are "on new seeds".
- [R] "Failed builds or checks are rejected with the reason and never affect your best score." [R] "4 times an hour".
- [R] "If a qualifying entry fails to fetch or build, it sits out and the next practice-board team takes its seat."
  So 33rd to 36th place still has some value, and our own entry must rebuild (the digest is pinned).

Board arithmetic [M]: scores are integer totals over 48 matches, in steps of 1/48 = 0.0208.

At 16:37 UTC three teams stood at 5.33 (= 256/48): Gradient Zero (10:00), 4141 (14:13) and BobBuildIt (15:47).
The earliest of the three holds 32nd. A new 5.33 would rank below all three, so the target is the cut **plus one
step** (5.35 now).

The 32nd score rose from 4.44 (05:19) to 5.33 (16:38), about +0.08 per hour. If it rises at half that rate until
Sunday 15:00, the cut will be about 5.8 to 6.0. From 5.02 we need about +0.8, and +0.6 at the very least.

---

## 3. Practice levers

### 3.1 House deaths we do not cause: what the rules allow

| Cause | Rule text | Evidence | Worth per match |
|---|---|---|---|
| Zone | [R] "Outside it, you lose `dps` HP per second (no armor, no regen)." Applies to every mech | FFA replay: 1 of 16 house bots died to the zone, stuck in the stadium bowl (x -190..-260, y 48..83) from 130 s. Everyone else took 0 zone damage, because they enter the next circle 33-58 s early | early: about 0; late: see 3.3 (lever 2) |
| NPC drones | [R] "They shoot (25 damage, 90 m/s bullets, 1 s cooldown) at whoever attacks them, or at mechs within 45 m with line of sight while the drone is within 30 m of home." [R] "Drones do not take zone damage." | [M replay] 930 damage from drones in a whole match. 27 of 35 drone hits landed on the drone's attacker. 8 of 12 drones were dead by 48 s | under 0.05 (they never kill alone) |
| Squad friendly fire | Mortar: [R] "splash 160 falling to 30% at `splash_radius` 7 m ... Your own splash hurts you at 50% ... every mech the blast reaches is thrown". Lightning: [R] "Hits the nearest target (mech, NPC or crate) ... then chains to up to `chain` 2 more targets within `chain_range` 14 m". Laser: config `"pierce": 0`, and the upgrade text says "Laser passes through one more target", so a beam stops at the first body. Bullets hit the first body in their path | **The rules give no team filter; "never fight each other" describes target choice, not damage. Unclear.** [M] In the FFA replay house fire control fired 3 shots with two bodies on the line; the bullet hit the first body (`tools/panel_r3/body_block.py`). There is no practice data | see 3.2 and the test below |
| Falling | No fall damage anywhere in the rules; [R] "The map edge is a wall" | none | 0 |
| Concussion into the zone | [R] knock 16 m/s plus 9 m/s up | needs our own mortar (cook-off risk) | about 0 |
| Clock-out HP ranking | see section 2 | impossible with the default config | 0 |
| The final collapse | [R] the zone shrinks to radius 0 at 415 s, at 260 HP/s | every house bot still alive dies in HP order | large if we live (3.3) |

**Early non-self deaths are rare in practice** [M]: jackbalseca's switch on "an unexplained death before 90 s, or
3+ overall" gave a byte-identical score (X01), so it never fired in 48 matches. JorgeN0's detector shows 4% false
positives (simulator). The cheap channel is therefore worth at most about 0.1 a match unless we create the geometry
ourselves, and that happens only when two or more hunters engage us. Those are exactly the fights that kill us.

**Single submissions that answer the open questions.** No new code is needed: each is an identity test against
S01-full (5.02), because identical behaviour reproduces the score exactly [M D01-D03].
- **T-FF: S01-full with `beamClue: 'on'`.** This latches FFA after two beams by other mechs that end within 6 m of a
  third mech, which then loses HP that we did not cause (`stance.js`), before 200 s.
  - The beam list includes lightning arcs, whose last point is the last chain target.
  - Score exactly 5.02: no visible squad laser or lightning hits on squad-mates (two per match, before 200 s) in any
    of the 48 matches.
  - Any other score: they happen and leaked the latch. The false-positive path is a squad-mate next to a crate or
    drone that is being shot. **Never ship beamClue on** after that.
  - Mortar splash is not covered by this test.
- **T-LEAK: S01-full with `env: 'squad'`** (planned S02). Equal score: the 3-foreign-deaths latch never tripped in
  practice. A higher score: the latch leaks, so harden it before the final build.

### 3.2 Steering hunters into damage they would not otherwise take

**Shadow positioning (lever 3).** It works whatever the server does, because every case helps or costs nothing:
- If squad bullets and beams stop at squad bodies, the far hunter B hits the near hunter A. A faces us, so B's fire
  comes from outside A's front arc: [R] "deals `mech.rear_mult` (×1.5) damage".
- If house fire control refuses a line through a squad-mate ([M] "fires only with a clear muzzle line": 848 of 851
  shots), B holds fire and we take less damage.
- If the server lets squad shots pass through, nothing changes: B had that line anyway.

Geometry (levers_calc 5): the corridor half-width at our position is (r_A + 0.3) · (d_BA + d_A,us) / d_BA, with r_A =
2.5 · (1 + 0.05 · cubes).

| d_BA | d_A,us | Half-width at 0 cubes | Half-width at 5 cubes |
|---:|---:|---:|---:|
| 50 m | 100 m | 8.4 m | 10.3 m |
| 80 m | 100 m | 6.3 m | 7.7 m |

House strafing (±5.5 m at 10 m/s, reversing every 1.1 s) moves the corridor ±16 m at our position. Centred on its
mean line we stay in it about 40% of the time. By accident the alignment happens only 2-5% of the time (levers_calc
8), so it must be steered. Only bearings within about 20° can be aligned cheaply: a 20° shift at 100 m is 35 m, or
3 s.

Value [E]: B's line is worth 94-157 HP/s (levers_calc 3). Removing 40% of one of two lines in a two-hunter fight cuts
incoming damage about 20%. If 60% of our deaths are two-plus-hunter fights and this geometry is available in 30% of
them, deaths fall about 4%. Each death costs about 4 further points, so the gain is +0.05 to +0.2. Spec in section 6A.

**Drone drag (lever 11).** A hunter passing within 45 m of a drone home takes about 16.5 HP/s (25 × 66%) for up to
60 m of drone chase, and its regeneration restarts. That is about 130 HP a pass.
- It conflicts with farming: a drone is 2 cubes, permanent +8% HP and damage.
- Most drones are dead by 48 s in the FFA replay, and the three survivors sat 454-479 m from the centre.
- Use it only when a retreat already passes 47-55 m from a live drone. Never shoot that drone. Value about 0.

**Zone crossing (lever 9).** A hunter's line costs us 94-157 HP/s. The zone costs 20 / 35 / 60 / 100 / 160 / 260 HP/s
by phase (phase 1 0-110 s, 2 110-195, 3 195-265, 4 265-325, 5 325-375, 6 375-415).
- Phases 1-2: the zone is 3-8 times cheaper than one line of fire, so a short outside leg that breaks a line or cuts
  a retreat is worth it. Our mover currently treats any outside position as urgent.
- Phase 3: only to break a line, at most 6 s.
- Phase 4 and later: never.
- Whether hunters follow us out is unknown. If three follow for 20 s in phase 2, each loses 700 HP, but so do we:
  never plan on it. Spec in 6E.

### 3.3 Outright win and late survival

- Our 5.02 is 241 match-points. kyoto-max's 6.31 is 303: +62 points, which is about six more outright wins, or +1.3
  house deaths in every match.
- An outright win is worth 15 against a typical 5: one converted match adds 10/48 = +0.21 to the score.
- The 4.00-4.25 "wall" of the board is "the four easy bots die, then the entrant does".
- **How a bot plausibly gets there [I]:**
  1. Kill the lone early hunters cheaply.
  2. Survive the two- and three-hunter waves by breaking lines and healing (D3).
  3. Be alive in the last circles. The practice hunter "fights at 100-150 m and does not close inside 45 m" (D1, one
     source). From the phase 4 shrink (295 s, radius 140 down to 70 m) and certainly from 325 s (70 m, 160 HP/s), a
     hunter holding 100 m from a mech on the centre stands 30 m outside. At 160 HP/s 1400 HP lasts 8.8 s; at 260 HP/s
     (390 s on, 25 m circle) 5.4 s (levers_calc 7).
  4. House zone logic only "reaches the next circle early" when the bot is not hunting. Whether a hunter's stand-off
     or the zone wins is unknown, and the answer decides whether late survival converts into many free deaths.
- **What kills us before the end [I]:** two or more lines at once after the escalation, with shared vision (a
  squad-mate's sighting keeps our true position live for 5 s), plus the laser stand-off at 150 m in the open. Lever 2
  costs nothing, but our own 150 m kiting band must never pull us beyond about 0.5 of the next radius late. Verify it
  (6D); do not add code.
- **Early risk: take more, but bounded.**
  - Cubes compound: at 10 cubes damage and HP are both ×1.4, so duel strength is ×1.96.
  - Only one weak hunter comes early, so early risk is cheap.
  - [M] Farming on: +0.27, +0.37; off: -0.65. Farming farther or longer: -0.1 to -0.2 each time.
  - The proj1 line "no fights until 10 cubes or 75 s" reached 5.42-5.94. Our farm-first full build beat the core build
    by 0.12.
  - So keep farm-first and the near radius. Never decline the lone easy hunter: it is the cheapest point of the match.
    Do not extend the farm radius.

### 3.4 Board-level levers

- **Draw management (lever 1).** Seed-only changes moved -0.06 and -0.27 [M D04, D05], and kyoto-max measured 0.27
  re-roll noise. The difference of two draws therefore has an SD of about 0.2, so σ_draw is about 0.15-0.2.

  | Draws | Expected best-of-N gain at σ 0.15-0.2 (levers_calc 1) |
  |---:|---|
  | 8 | +0.21 to +0.28 |
  | 16 | +0.26 to +0.35 |
  | 32 | +0.31 to +0.41 |

  - Every behaviour change is itself a draw, so do not separate "tests" from "salts": submit the best candidate,
    then its salts.
  - This is board-only. All salts have the same true strength, so picking the luckiest costs nothing in the final.
  - It is not enough alone: +0.3 does not cover a gap of about 0.8.
- **Ties (lever 12):** aim at cut + 1/48. When choosing the final entry among candidates of equal strength, take the
  earliest (it also wins final ties).
- **Top 16 = the hourly cast** (participant chat 2025: the top 16 play an FFA "at the start of each hour"). It is the
  only real FFA rehearsal and the only place to watch the field, which is allowed. Reaching it also shows our bot to
  everyone.

### 3.5 Last-gasp kill (lever 7)

[R] `alive` = our place now. A kill landed before our death moves us up one place. A same-tick death shares the
place, and the shared place is never worse than dying first.

Trigger: our hp < 0.5 s × the incoming damage rate from current lines, and an enemy in reach has hp at or below what
we can deliver within 0.3 s. That damage is:
- a ready laser at its current charge: 315 · (0.35 + 0.65 · c / 0.75) · (1 + 0.04 · min(cubes, 10)) · 1.5 if from
  behind;
- or the gun rounds that can land within their flight time.

Action: fire at it now and release the laser immediately; no retreat move. Value +0.05 to +0.15 [E]. It applies in
both postures.

---

## 4. Final (free-for-all): making the others fight

The target rules of the field (dossier section 3 and the `top_*.md` studies, prose only):
- **Nearest or score-based shoot-on-sight:** TTUN family (Wolverines, r1ver, Kanyaraasi, not even close, likely
  sonion), Lance family (BackwardsDeployeds), ImagineLosing (score = hp + 4 · dist, +600 when the body is not in its
  line of fire), BobBuildIt, AT (nearest 19 of 22).
- **Hostile-only:** proj1 family (TigerTown27, 2696, benchmaster, likely giddygiddyboy). Hostile = damaged it (25 s),
  within 30 m in sight, or torso on it while charging. Also 404 (damaged it in 7.5 s, or aims at it), 314159265 for
  its first 40 s, Mahalas (a lone weaker hostile).
- **Retaliate on whoever hit them:** nearly all. A-bot "bonus for whoever hit it in the last 4 s", RN SUS "whoever hit
  it in the last 3 s". [R] `damaged.by` names the attacker exactly, so we cannot frame a third mech with our own
  damage. **We can only arrange for the third mech's own shots to hit someone.**

| Manoeuvre | Mechanism (rule) | Works against | Fails against | Gain / risk [E] |
|---|---|---|---|---|
| **M-S Shadow bait** (lever 3, spec 6A) | Y shoots at us. We stand in X's shadow from Y. Y's bullets and beams stop at X's body (pierce 0) and hit X's back ×1.5. X's `damaged.by` = Y, so X turns on Y | Any Y that shoots us; any X that retaliates (almost all) | A Y that holds fire through bodies (then we are simply covered); an X within 45 m of us (it sees us) | +0.1 to +0.3. Risk: X turns to us. Keep 50 m (60 / 75 m for 1-2 / 3+ cubes: sensors) and stay out of X's ±60° wedge |
| **M-P Pull-through** (lever 4, spec 6B) | A nearest-target chaser X follows us past bystander Y. Once d(X,Y) < d(X,us), with us hidden, X switches. ImagineLosing-type score: hidden is worth 150 m, so X switches when d(X,Y) < d(X,us) + 150 + (hp_us - hp_Y)/4 (levers_calc 6) | TTUN, Lance, ImagineLosing, AT, BobBuildIt (about 8-10 seats) | Hostile-only bots (they need 30 m or damage; push them into each other's 30 m instead); X within 50 m | +0.1 to +0.4. Early deaths (bottom half dead in a median 21 s) are often "chased by one" |
| **M-T Third party** (built) | [R] regeneration needs 5 s without damage. A duel survivor is wounded and damage-locked. [R] "Killed mechs drop all their cubes plus two" and every weapon but the gun | everyone | A fourth mech in view | about +0.3, already counted |
| **M-D Drop magnet** (lever 6) | [R] "While two or more mechs are in the ring, the capture clock freezes." Drops land at 95 / 165 / 235 s and are known to all, so they draw bots together. `holder` and `progress` are visible without a line | everyone who chases drops (most) | - | +0.1 to +0.2. Watch from 60-120 m; strike the survivor or a stationary holder we can kill within its 4 s (a capture heals to full) |
| **M-L Sound lure** (lever 10, spec 6C) | [R] "gun: 320 m"; "Sounds do not say who made them." Idle torsos snap to sounds: ImagineLosing 2.5 s, BackwardsDeployeds 2 s, Kanyaraasi (no target, within 160 m), 404 (4 s weighted), 314159265 (near sounds) | those five | proj1 (sounds only inside 60 m), busy bots | +0.05 to +0.15. Risk: bearing ±7° and a distance class to all within 320 m |

**Endgame (rules, both postures).** Scoring is linear, so an outright win is only +3 more than 4th.
- With 3 alive and the other two fighting, every death is ours for free: wait, then hit the survivor only if our
  E = hp - zone exposure is the lower.
- With 2 alive: hide and heal if our E is higher, attack if lower (M11, built).
- The 260 HP/s finale ranks by HP: plating and cubes count, armour does not ([R] "Armor (upgrades) reduces weapon
  damage, not zone damage").

---

## 5. Scoring and tie details that reward a behaviour

1. **Banked points = 16 - `alive`.** When our death is certain, the only useful act is one that makes another mech
   die first (3.5).
2. **Same-tick deaths share a place.** Never worse than dying first. In the 260 HP/s finale that is 13 HP a tick: two
   mechs within 13 HP of each other die together. Do not plan around which place is shared (unknown).
3. **No kill bonus, no win bonus.** Practice counts only house deaths before ours; the final counts only place.
4. **Practice ≠ final seeds.** A lucky salt seats us but adds nothing in the final. FFA strength must come from
   behaviour.
5. **Earlier submissions win ties** on the board and in the final. 64-match totals are integers, so final ties are
   possible: of equal candidates, choose the earliest.
6. **Qualifying is 16 matches, top 16 of 32.** The standard error is about 1.1 points, so an average bot goes out half
   the time.
   - In qualifying, prefer lower variance if we are above the median and higher if below.
   - Winner takes all in the series ([R] "Second place gets nothing"), so if we are not the favourite, prefer the
     higher-variance option in close calls.

---

## 6. Specs for the engineer

All new rules sit behind presets (`off` / `on`). While unlatched (SQUAD), each one is a single change against
S01-full.

**6A. Shadow positioning (`shadow`, values `off` / `ffa` / `all`).** In the cell scorer the mover uses for fight and
peek cells:

```
for each enemy B with a line of fire to cell c (gun or laser, d(B,c) <= its range):
  for each other listed mech A (SQUAD: house mechs only; FFA: anyone), A != B:
    alongA = projection of (A - B) on (c - B) in xy;  require 8 < alongA < |c - B| - 8
    e = perpendicular xy distance of A's axis from the segment B->c
    rA = 2.5 * (1 + 0.05 * A.cubes) + 0.3
    z  = B.z + 7*sB + (c.z + 4.5*s - B.z - 7*sB) * alongA / |c - B|; require A.z <= z <= A.z + 9*sA
    credit = e <= rA ? 1 : e <= rA + 3 ? (rA + 3 - e) / 3 : 0
  shadow(B,c) = max credit over A
score(c) += w * dps(B, d(B,c)) * shadow(B,c)
```

- `dps` by range (levers_calc 3): <75 m 157, 75-100 m 146, 100-126 m 123, 126-151 m 103, 151-200 m 94.
- Weight w: SQUAD 0.5 (the squad's physics is unknown); FFA 1.0, plus a provocation bonus of +150 when A has not hit
  B or been hit by B in the last 10 s.
- FFA hard limits:
  - d(c,A) >= 50 m (60 m if A has 1-2 cubes, 75 m if 3 or more);
  - skip if A's aim is within 70° of the bearing A->c;
  - never accept a cell that adds a new line of fire to us.
- Budget: n <= 6 nearest tracked mechs, at most 30 tests per cell.
- Tests:
  - a synthetic A at 100 m and B at 150 m on one bearing: the chosen cell lies within the corridor;
  - B 40° off: no shift beyond 35 m;
  - FFA with A at 40 m: rejected.

**6B. Pull-through (`pull`, FFA only).**
- Enter when all of these hold:
  - X is hostile (hit us within 4 s, or its aim is within 12° with a line) and is 40-160 m away;
  - X is closing (> 3 m/s for 1 s) or reads as archetype A5 / A2;
  - our hp >= 60%; zone margin >= 20 s; no second hostile;
  - a bystander Y (not hostile to us in the last 10 s) is 60-200 m from us, and the angle between Y - us and us - X is
    <= 60°.
- Plan: pick a hide cell H from the existing hide search such that:
  - d(H,Y) >= 60 m;
  - the segment X->H passes within 45 m of Y, or through Y's ±60° / 200 m wedge;
  - at X's closest point to Y, H has no line from X and d(X,H) > d(X,Y) + 30 m (use + 150 m for ImagineLosing-type
    scorers when we are hidden).
- Execute: boost while energy > 30, then walk. Torso on X; answer fire only if X keeps its line on us.
- Success: X's aim stays within 0.2 rad of Y for 1 s, Y loses hp while X fires, or a beam by X ends at Y. Then go to
  M5: cover 80-120 m from the stronger mech, more than 110° off its aim; strike when the weaker is under 35%, or the
  survivor within 4 s of a death.
- Abort: Y aims within 0.3 rad of us, X comes within 50 m, our hp < 50%, or 8 s pass without a switch.

**6C. Sound lure (`lure`, FFA only).**
- Trigger, all of these:
  - we have no line to Y;
  - Y is idle (no fire for 3 s, torso sweeping or spinning) at 80-160 m;
  - a mech Z has d(Y,Z) < d(Y,us) - 40 and |bearing(Y->Z) - bearing(Y->us)| <= 40°;
  - Z has not shot us in 10 s.
- Do: 3 gun rounds into a crate (it gives a cube and a 220 m crate sound) or a wall within 30 m that neither Y nor Z
  can see. Then move silently (stick <= 0.42, under 5 m/s) 20 m within cover.
- Limits: 30 s cooldown, 3 per match. Abort on any line to us.

**6D. Late-zone hold (verify only).** From 295 s, or when next_radius <= 70:
- we stay within max(8, 0.35 · nr) of the anchor (`lateLeash`);
- the laser band never moves us beyond 0.5 · nr from `next_center`;
- prefer targets standing outside the circle (they cannot regenerate).

Test: a hunter holding 120 m while r = 70 m; we must stay within 25 m of the centre and keep shooting.

**6E. Cheap crossing (`zoneCross`, both).**
- Allow outside path cells when dps <= 35 and the time outside t_out <= min(15 s, (hp - 0.6 · maxHp) / dps), and the
  leg either breaks a current line of fire or shortens the path to the chosen hide cell, pickup or drop by >= 30%.
  Re-enter >= 30 m inside the next circle.
- At dps 60: only to break a line, and t_out <= 6 s.
- Above 60: never.
- While outside, `zoneUrgent` stays false within these bounds.

**6F. Last-gasp (`lastGasp`, both).** As in section 3.5. The laser releases at any charge >= 0.15 s if the kill
check passes; the gun gets an instant fire on the finishable target, ignoring the 0.55 s flight gate.

**Latch interaction.** Shadow geometry raises "foreign" squad deaths only in multi-hunter fights, which mostly come
after 200 s, and the latch counts only t < 200 s. Keep `beamClue` off. If T-LEAK shows a leak, require at least 2
foreign deaths whose victims never had another mech within 6 m of our line of fire.

---

## 7. Slot plan

| Order | Submission | One change | Reads |
|---|---|---|---|
| 1 | Best real candidate from the other panels (top-5 synthesis) | its change | main gain; also a draw |
| 2 | T-LEAK `env squad` | identity | latch leak (0 or +) |
| 3 | candidate + `shadow all` | 6A | board effect of shadowing (sign only, under 0.3 = noise) |
| 4 | T-FF `beamClue on` | identity | squad friendly fire exists (score not exactly 5.02) |
| then | salts of the best, interleaved with the next candidates | salt | best-of-N |

FFA-only changes (6B, 6C) leave the practice score identical by construction (bit-identical SQUAD). They ride along
in any submission and must be checked in the simulator FFA league, never on the board.
