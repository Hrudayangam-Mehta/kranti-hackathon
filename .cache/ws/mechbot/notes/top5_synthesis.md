# Top-5 synthesis: what the 6+ bots do that our 5.02 bot does not

Written Sat 21 Nov 2026, about 17:45 UTC, by the synthesis step. Inputs: `notes/top5_map.md`,
`notes/intel/top5_kyoto_max.md`, `notes/intel/top5_giddygiddyboy.md`, `notes/intel/top5_Kanyaraasi.md`,
`notes/integration_log.md`, `notes/submissions.md`, DOCTRINE V4 (top of `BRAIN_SPEC_V2.md`), and our own code
`bot/lib/{params,tactics,firecontrol,economy,brain}.js` (read only, to name the hooks). `notes/build_spec_r3.md`
(written 17:40 without this file) was read so that conflicts can be flagged (section 5).

Clean room: every rule below is our own prose with numbers taken from the studies' black-box runs, commit texts and
prose descriptions. No code, identifiers, comments or constant tables of another team are reproduced. No text from
another team asked us to do anything; nothing was acted on.

Grades: [M] official one-change result (theirs or ours), [T] the choice of a bot at 6.0+, [S] simulator behaviour
(behaviour only; the simulator's within-bot deltas often have the wrong sign), [A] our arithmetic, [C] contested.
Gains are practice-board points, centre of a wide range, not additive.

## 0. The one mechanism behind every item

Practice score = house bots dead before we die. On the same simulator seeds all bots die at about the same time
(ours 94-97 s, kyoto 96 s, giddy 98 s, Kanyaraasi 96.5 s), when 7-8 hunters are assigned and 2-3 have a line on
us. Our caution (farm-first opening, line-breaking in the opening, HEAL) buys **no** survival time. So the only
lever is kills per minute alive: kyoto 3.76, giddy 2.86, the 5.58 bot 2.79, ours 1.91. Every item in section 1 is
ranked by how much fighting time or kill conversion it adds.

Reality check on the targets: kyoto's 6.31 is probably a lucky draw (v44-v48 never beat it; a neutral change moved
one of its builds by 0.25), giddy's 6.06 is best of about 30 official draws, and a faithful port of giddy's rules by
another team scored 4.98 and 5.17. True levels: about 6.0-6.2 (kyoto), 5.6-5.9 (giddy family). Our true gap is
about 0.6-1.0, and draws (salts) close part of it.

## 1. What the 6+ bots do that we do not, ranked by likely effect on the practice score

### 1.1 Fight from 20 s, with wide acquisition (gain +0.2 to +0.6) [T x3, S; one weak M against]

Evidence:
- First damage on a mech: Kanyaraasi 15.8 s, giddy 21 s, kyoto 30 s; ours 38-60 s (same seeds).
- Time shares: fighting 44-52% for them, 33% for us; travelling 24-25% for them, 44% for us.
- Cubes at 60 s: 6.0 (kyoto), 6.6 (giddy), 7.8 (Kanyaraasi); ours 1.7-3.2. Fighting earlier gives more cubes than
  our farm-first opening does, because kill drops are the main cube source.
- On the real scorer, three teams rejected opening modes. giddy tried an opening loot mode six times and never kept
  it. Kanyaraasi's opening "until second weapon + 3 cubes or 75 s" was not kept. kyoto's "farm longer" scored -0.13,
  its "farm to 15 cubes" was discarded, and v32 removed its opening mode.
- Against: our full build (with farm-first) beat our core build by 0.12 officially. That is a bundle of five
  changes and inside the 0.3 noise band.

Spec:
- Select `openFarm: 'off'` (the preset exists).
- `PARAMS.openingS` 40 -> 20. This is the D0 opening guard read by `tactics.selectTarget` (`opening`).
- In the same candidate rule (the `ok` expression), add an "engaged" clause for a mech with a line within 240 m:
  - within 60 m; or
  - hit us in the last 6 s; or
  - closing faster than 3 m/s within 180 m; or
  - under 40% hp within 160 m; or
  - torso aimed within 0.22 rad of us within 190 m.
- Keep our existing band clause (any mech within bandHi + 40 m after the guard) and the 20 s unengaged clause.
- FFA safety (must not change practice):
  - The guard ends at 20 s only while no foreign death has been seen. Use the D12 count: alive0 - alive - ourKills
    = 0.
  - Otherwise the guard ends at 40 s as now. In a real final the bottom half dies in a median 21 s, so this keeps
    our 40 s guard there.
- Preset: `open20: 'on' | 'off'`. Submit it as its own draw first.

### 1.2 Laser economy: laser in hand early, fights at about 120 m (gain +0.1 to +0.4) [T x3, S, M (giddy, kyoto)]

Evidence:
- Laser in hand: Kanyaraasi by 6-14 s in 4 of 6 matches; kyoto gun + laser by 24-50 s in 4 of 6; ours 2 of 6 by
  7 s, 3 of 6 never.
- Laser shots per match: kyoto 11.7, Kanyaraasi 16; ours 3.5-4.2.
- Laser hit range, median: 81-91 m for them, 46-53 m for us.
- kyoto: 23 of its 36 kills are laser kills.
- Official tests:
  - giddy's "laser preferred from spawn" (08:27) was kept.
  - kyoto's v32 "laser-first from the start, squad laser range 120" was kept.
  - giddy's laser holds of 110 m (twice), 140 m (four times) and 150 m were all not kept; 120 m was kept.
- Arithmetic: at our 150 m hold the 0.55 s gun flight gate silences our gun (it fires only inside about 139 m). At
  115-120 m the gun fires too. [A]

Spec:
- **Seek.** While we hold no laser, a laser pickup is a LOOT goal out to 240 m of path and outranks every other
  loot. Hook: `economy.js` pickup `consider` (today `lootPickupPath` 120 m for every weapon). Other pickups stay at
  120 m. In contact, keep D6's 60 m laser grab.
- **Swap.** A laser replaces a held lightning (never while charging). Confirm that `wantPickup('laser')` is true
  while holding lightning.
- **No mortar in SQUAD.** `mortarWaitS` 60 -> never (economy.js line 34). None of the three bots ever takes a mortar.
- **Band.** Select `laserRange: 'mid'`: hold 115 m, band 100-130 m, back off at 100 m, boost away inside 70 m. That is
  within 5 m of their 120 m, which is noise, so no new preset.
- **Gun-only.** Hold 75 m (theirs 85 m). Leave as is.

### 1.3 Focus fire: stay on one victim (gain +0.1 to +0.3) [M x3 at giddy (one-knob, kept), T (kyoto v24/v32)]

Evidence:
- Damage dealt into mechs that were not killed, per match: kyoto 852; ours 1,349; the 5.58 bot 1,493.
- giddy kept three focus retunes on the real scorer:
  - current-target bonus 120 -> 200 (60 and 400 not kept);
  - health weight 0.2 -> 0.1 per HP (0.05, 0.3 and 0.4 not kept; later 0.15 and 0.18 kept);
  - low-health bonus 100 -> 200 (400 not kept).
- Mechanism: 45 HP/s regeneration after 5 s without damage erases spread damage.

Our scoring churns:
- It multiplies 100 / (d + 20) by 1.3 for the current target, so a fresh mech 25% closer wins.
- It has no health term except "finishable x2".
- The torso veto switches to any attacker more than 80 degrees behind.
- R2's rear pick switches again.

Spec: new preset `focus: 'add'`, used in `tactics.selectTarget` where the score is built (the `s = 100 / (tr.dist +
20)` loop).
- Cost (lowest wins), in metres:
  - start with the distance;
  - add 0.1 per HP;
  - subtract 200 at 30% hp or less, or when finishable;
  - subtract 200 if it is our target and was chosen within the last 2 s;
  - subtract 40 if it hit us in the last 4 s;
  - subtract 15 if it is closing.
- Store `tr.index = 1000 - cost`, so that the existing readers keep working.
- Keep:
  - the "never leave a target under 25%" rule;
  - drones ranked below mechs in contact;
  - the x1.15 preference for mortar holders when we have a laser, as -20 m.
- Under `add`, the torso veto switches to an attacker behind only when the current target is at 38% hp or more and
  we have not damaged it in the last 2 s.
- Under `add`, R2's rear pick runs in FFA only.

### 1.4 Retreat in short pulses only, no HEAL phase in practice (gain 0 to +0.3) [M x3 (kyoto), T x2, S]

Evidence:
- kyoto officially rejected three heal phases:
  - heal in a walled cell, -0.08;
  - stand still to heal, 5.21 against 5.25;
  - supply drops as heal stations, not kept.
- giddy and Kanyaraasi have no heal state in practice.
- kyoto's fatal fights start at 70-100% hp, and it kites at a median 70% hp.
- Removing the losing-retreat itself was rejected twice by giddy. The 5.58 bot lost 0.41 without its low-hp retreat.
  So keep a short retreat and drop the long one.
- Cost of our HEAL [A]:
  - It outranks FIGHT (`decideMode`) whenever there is no line on us: below 55%, or below 90% within 6 s of a LOSING
    retreat. It then lasts until 70%.
  - From 45% that is the 5 s regen delay plus 350 HP / 45 = 13 s out of the fight. At kyoto's rate that is about
    0.8 kills, and deaths do not come later.

Spec: new preset `retreat: 'pulse'` (SQUAD only; FFA keeps D11's patient heal).
- In `decideMode`, `heal` is false while `B.env !== 'FFA'`.
- In `losing()`, count n = mechs seen now within 160 m. We are losing when:
  - n >= 2 and hp < 55%; or
  - n >= 3 and hp < 80%; or
  - hp < 35% and the target's hp fraction is at least ours + 0.10.
- Never losing when:
  - the target is under 25%, our hp is over 20% and n <= 2;
  - the late zone holds (next radius <= 70 m) or 3 or fewer are alive.
- A retreat ends 1.5 s after the last losing decision (today: a minimum of 1.5 s, then HEAL).
- With no hide cell found, stay in FIGHT. `lastStand` is unchanged.

### 1.5 Spend energy: boost while charging under fire, on dodges, when threatened (gain 0 to +0.25) [T (kyoto), C]

Evidence:
- Boost share of time: kyoto 20%; ours 9%.
- Boost start energy, median: kyoto 30; ours about 100 (we boost from a full tank only).
- kyoto boosts in 56% of its laser-charging frames: 9.8 m/s against 5.9 m/s while charging.
- kyoto kept every boost rule:
  - v38: jinking above 40 energy, not while charging;
  - v39: every dodge above 25;
  - v40: threatened and moving above 30;
  - v43: while charging under fire. That is the 6.31 build.
- v44 added a 30/60 hysteresis and never beat 6.31.
- Against: giddy dropped its dodge and threat boosts and still made 6.06. Kanyaraasi boosts on 7% of decisions.

Spec: new preset `boost: 'spend'` (SQUAD only).
- In `brain.js legs()`, after the mode switch and before `mover.bulletDodge()`, so that the dodge plans at boost
  speed. Boost when all of these hold:
  - in FIGHT, grounded, against a mech target;
  - laser charging, or an active bullet dodge, or a line on us / hurt within 1 s while moving;
  - energy > 30 (dodge: > 25).
- No resume hysteresis: the scored v43 had none.
- `finishLegs` vetoes stay (lightning reserve, airborne, FFA boost veto).
- This replaces build_spec N3's 30/60 hysteresis (section 5).

### 1.6 Walk in to finish (gain 0 to +0.1) [M (giddy kept 14 m and then 20 m), C (kyoto dropped it twice)]

Evidence:
- giddy kept a 14 m finish and then a 20 m finish; 10, 17, 22, 23 and 26 m, a 50% trigger and a boost rush were not
  kept.
- Kanyaraasi's 14 m finisher alone scored +0.02 (noise).
- kyoto's v3 and v33 close-in finishes were not kept.

Spec: preset `finish20` (SQUAD).
- When the target is under 38% hp, our hp is over 42% and at most 2 mechs are within 160 m (late zone excluded),
  the wanted range for every weapon is 20 m (`tactics.bandFor` / the fight legs), with no boost.
- Lowest priority of the list. Build it after 1.1-1.5.

### 1.7 Farm down to 50% hp, crates all match (gain 0 to +0.1) [T x3, M from another team]

- Our floor is 90%. giddy and the 5.19 bot use 50%; kyoto farms down to 40%. nullat0m7's change from 60% to 85% scored
  -0.13.
- With 1.1 on, farming happens only between fights.
- Spec: select `farmHp: '50'` (the preset exists).

### Not a gap (correction): lethal partial laser release

- We already release a partial charge when its estimated damage covers the target's hp. That is a factor of 1.0,
  with the rear and cook-off multipliers (`firecontrol.js`, the `killNow` line).
- kyoto does the same: 16 releases, each at exactly the target's remaining hp.
- giddy's scored 0.7 is a **safety margin**: release when 0.7 x the estimate reaches the target's hp. That needs the
  estimate to exceed the hp by 43%, so it releases *later* than 0.9 or our 1.0.
- Kanyaraasi's clean +0.19 measured switching such a release on. We already have it, so that +0.19 is not available
  to us.
- Our lower count of lethal releases (6 against kyoto's 16) comes from fewer laser shots (item 1.2), not from the
  rule.
- Optional and cheap: raise `laserForceS` 1.5 -> 1.9, so that a full charge waits for alignment up to the engine's
  2 s hold. Hold the charge through a sight blink of up to 1 s; we already do.

## 2. What all of them share (and our status)

| Shared trait | kyoto / giddy / Kanyaraasi | Ours |
|---|---|---|
| Practice profile on from about 20 s; wide (240 m) acquisition of threatening mechs | yes / yes / yes | no (item 1.1) |
| Laser first from spawn; gun always kept; lightning only until a laser turns up; never a mortar | yes / yes / yes | partial (item 1.2) |
| Laser hold about 120 m with gun + laser; gun about 85 m | 120 / 120 / 120 | 150 (item 1.2) |
| Lethal partial-charge release | yes / yes (0.7 margin) / yes | yes (factor 1.0) |
| Sticky target plus low-hp bonus | yes / yes / yes | weak (item 1.3) |
| Retreat only on a crowd/losing rule, short, never in the late game; fight on with no cover; no heal phase | yes / yes / yes | LOSING yes, plus HEAL (item 1.4) |
| Mid-fight cube grab (70 m, 40 m when hurt); victim's cubes at once (kyoto: 56 of 84 cubes within 8 s of its kills) | yes / yes / yes | yes (70/40/12 m; kill cubes to 200 m when clear) |
| Crates all match, drones while under 10 cubes, no roof loot, nothing outside the circle | yes / yes / yes | yes, but 90% hp floor (item 1.7) |
| Drone self-defence (giddy 5.35 -> 5.54, one change) | yes / yes / yes | yes (drones that hit us are candidates) |
| Zone above everything; path factor about 1.45 plus a few seconds of slack; 0 s outside | yes / yes / yes | yes (D9 plus late leash; 0 zone deaths) |
| Bullet, charging-laser and shell dodges; laser-charge sidestep with boost above 25 | yes / yes / yes | yes (D4), boost only above reserve |
| Exposure-aware fight positions (penalty per other mech that could see the spot) | yes / yes / yes | yes (posEval exposure term; evaluated every 0.3 s, theirs every decision) |
| Deterministic (seeded RNG, no clock); fast native code (static binaries, under 2 ms) | yes / yes / yes | deterministic yes (D10); JS 1-3 ms p99, no time cuts, so a Rust port buys nothing (build_spec_r3 0.4) |
| FFA latch on the first foreign death (0.5 s), then a passive profile | yes / yes / yes | 3 foreign deaths before 200 s (D12) |
| One-knob hill climb on the official scorer, every slot used, keep what does not lose | yes / yes / copies upstream | 2 submissions so far |

## 3. What we do that none of them do (possible waste in practice)

1. **Farm-first opening gate** (`openFarm`): until 10 cubes or 75 s we start no fight and break the line on hostile
   mechs. None of them does this; every variant was rejected on the real scorer (item 1.1). Biggest suspect.
2. **HEAL state in SQUAD** (stand or creep in cover to 70%, or to 90% right after LOSING). None of them has one, and
   kyoto rejected three versions. About 13 s out of the fight per heal (item 1.4).
3. **Far laser band** (150 m, 125-185 m, boost away inside 90 m): 140 m and 150 m were tried and rejected (giddy),
   and kyoto moved from 140 to 120 m. It also silences our gun through the 0.55 s flight gate.
4. **Target churn sources**: the multiplicative score with x1.3 stickiness, the torso veto that switches to an
   attacker more than 80 degrees behind, and R2's rear pick. None of them has a veto; giddy's attacker bonus is only
   40 m (item 1.3).
5. **R1 loot stealing in SQUAD**: crates and drones others shoot, pickup races, the 100 m death-cube rush, the
   200 m kill-cube reach. Nobody does it, and our travel share (44% against 24-25%) suggests detours. Test `R1: 'off'`
   as one draw once 1.1 is in.
6. **Supply-drop runs in practice** (D6, 250 m): kyoto's long drop trips scored -0.21 and its drops-as-heal was not
   kept; giddy has none; Kanyaraasi's quiet drop helper was +0.02 and is absent from its 6.06 build. Candidate for a
   SQUAD-off switch.
7. **Mortar fallback after 60 s**: never taken by any of them (item 1.2).
8. **Gun flight-time gate** (0.55 s): none of them gate (giddy fires to about 220 m). This is not clearly waste:
   kyoto's gun hits only 36% beyond 130 m. With a 115 m band it rarely binds. Keep.
9. Practice-inert by construction: R2 late-game sweep (t >= 240 s or alive <= 8; we are dead by 95-130 s), the R3
   laser head ladder, the whole FFA module. Not waste for the score; they cost only bundle size and test time.

## 4. Free-for-all counters, per team

General fact: all three latch to a passive profile 0.5 s after the first death they did not cause; we latch at 3. In
the gap we are the aggressive mech, so the D0 40 s guard must stay in a final (item 1.1 gate). Several giddy-family
bots are likely in the final (Kanyaraasi, caioplcerda, Arnav-M10, Th3r0n's 5.94, lolstershwjav, moonriver0922), and
kyoto shares the family design. Names are not visible in observations, so recognition is by behaviour. All items
here are FFA-only and must keep SQUAD byte-identical.

### 4.1 kyoto-max (compiled; behaviour from commit texts and black-box runs)

Signatures:
- Goes silent after the first deaths: still, or walking under 5 m/s.
- Keeps 110-190 m away while 3-16 are alive.
- `charging: true` while moving at about 9.8 m/s, with boost sounds.
- Gun + laser, partial beams on low-hp targets, mobility upgrades.

It engages only:
- its attackers;
- anyone within 55 m;
- mechs under 50% hp;
- mechs facing away;
- mechs it out-cubes by 3;
- anyone once 4 or fewer are alive.

Counters:
1. Never be a cheap target. Stay beyond 55 m, keep our front to it (our rule 8 courtesy keeps the torso within 0.3 rad
   of it), and leave its sight before 50%. `ffaHideHpf` 0.55 already covers the last point.
2. **Gap: partial release.** It releases as soon as the partial charge kills. Our rule 1 hide budget assumes a
   full-charge timing. Spec: when its estimated beam at the current charge reaches our hp, the budget is zero. That
   estimate is 315 x (0.35 + 0.65 x charge / 0.75), times its cube bonus if known. React (break the line or sidestep)
   on the first charging frame. In particular, under about 350 hp any charge is immediately lethal-capable.
3. It is a vulture. Do not fight a third mech inside its view, and do not show low hp near it.
4. **Hearing.** It turns to unexplained sounds and sidesteps laser charges it hears but cannot see. A hidden
   pre-charge ambush does not work on it: open from a cover edge already in view, or with the gun or lightning.
5. **Endgame (4 or fewer alive)**: it is strongest at 70-120 m with the laser. Deny that range: close inside 40 m
   under cover with lightning (a lightning hit cancels its charge and blocks a new one for 2 s), or stay out of
   sight. After a boost burst it sits at its 30 energy floor and cannot sprint again.

### 4.2 giddygiddyboy (readable; the most copied bot of the event)

Signatures:
- Slow walking (about 4.6 m/s) between low-exposure spots inside 70% of the next circle; long stands.
- Torso sweep about 66 degrees either side of its heading every 4.8 s.
- Boosted sidestep the moment our charging laser points within about 9 degrees of it.
- Gun or gun + laser, never a mortar.
- Withdraws to cover at about 38% hp.
- If nobody has died by 20 s, a sudden 240 m acquisition from 20 s.

It engages only:
- mechs within 60 m;
- a mech that hit it in the last 4 s;
- a charging laser aimed at it within 120 m (0.22 rad);
- a mech under 350 hp within 120 m;
- anyone when 2 or fewer are alive.

Counters:
1. Leave it alone at range. Beyond 60 m, no chip damage (a hit makes us its preferred target for 4 s), above
   350 hp within 120 m. Spec: raise rule 8's no-loot / no-goal radius around a calm mech to at least 60 m (today
   45/60/75 by cubes).
2. Off-axis charge. Our rule 2 charges 0.4 rad off and swings on at 80% charge. That already beats its 0.15 rad
   sidestep and its 0.22 rad hostility trigger. Keep it.
3. Hit and hide. It does not hunt; it runs to cover from the damage bearing. Our rule 4 break legs fit. Fire only
   when the burst can finish it.
4. Finish it in its retreat window. At about 38% it breaks the line and needs 5 s calm before it regenerates. Hold a
   hot laser on its cover exit, or third-party it there.
5. **Endgame conflict.** It goes to the exact next centre once the next radius is 30 m or less, never retreats at 3
   or fewer alive (or next radius 70 m or less), and engages anything at 2 alive. Our rule 7 also stands on
   `next_center` from 390 s, so we meet it there on even terms. Spec for R3b W5: arrive with more hp and cubes, and
   use lightning at under 45 m (it holds gun + laser; lightning shorts the laser). Or hold 120-150 m from hard cover
   and peek right after its beam (1.65 s cooldown + 0.75 s charge = about 2.4 s window).
6. Three mechs in view (two when it is under 65%) make it leave. Do not chase it; shoot the one that stays.
7. Copies kill each other (two of four giddy losses in our FFA runs were to another copy). Stay outside their 60 m
   bubbles and take the survivor with rule 3.

### 4.3 Kanyaraasi (= giddy 601c7a6, byte-identical strategy; even announces "giddygiddyboy")

- Same signatures and counters as 4.2.
- This team repackages whichever upstream revision scores best (Lance -> TTUN/r1ver -> giddy). Re-check giddy's
  head before the final. After 6.06 the only kept changes are the health weight 0.15 and then 0.18.
- Specific counters:
  - Ambush its rotation line. It travels straight toward its own side of the next circle (next radius minus 30%,
    3-30 m, minus 5 m) and never waits outside.
  - Approach from behind: while travelling its torso stays within about 126 degrees of its heading.
  - With 2 alive it crosses open ground at us: lay the beam on its approach.

### 4.4 Antalos (6.00) and onepizzateam (6.00): repositories not found

- Recorded showdowns put Antalos in the same profile as kyoto and giddy:
  - only the starting gun in 40-100% of showdowns;
  - 13-54 m from spawn by 30 s;
  - nearby crates and drones (a cube within 10 s);
  - plating first.
- A giddy copy is plausible: giddy's first boost build was 216 s before Antalos's 6.00, and the 14:29 giddy build
  probably scored 6.00. This is unproven.
- onepizzateam: nothing known.
- Counter: treat any mech that keeps a 60 m bubble, walks slowly between quiet spots and never takes a mortar as
  giddy-type (4.2). Treat one that charges while boosting as kyoto-type (4.1).

## 5. Conflicts with other notes (to resolve before R3a is coded)

1. **build_spec_r3 N2 (`killFrac` 0.7) inverts the top bots' rule.**
   - N2 releases *earlier* than beam-alone, when the beam covers 70% of the hp and the gun is to finish the rest.
   - giddy's 0.7 releases *later*: it is a 43% margin on the estimate.
   - No top bot releases a beam that alone does not kill. N2 is a new untested idea [N], not a copied 6+ choice.
   - Our current factor 1.0 is what kyoto does.
   - Recommendation: drop N2 from R3a, or ship it as its own draw labelled [N].
   - The same inversion is in `top5_map.md` and lesson 2 of `top5_kyoto_max.md` (the giddy study already flags both).
2. **build_spec_r3 N3 hysteresis 30/60** is kyoto's v44, which never beat the v43 6.31 (no hysteresis). Use
   item 1.5: floor 30, no resume threshold.
3. **build_spec_r3 N5 (speed upgrade third).**
   - kyoto kept mobility right after plating and armour (v41).
   - giddy tried exactly that and did not keep it.
   - Our current order (plating, armour, nanites, laser damage, laser charge) is already almost giddy's practice order.
   - Lowest value in the bundle; drop it first.
4. **build_spec_r3 R3a lacks the two largest items** here: 1.1 (fight from 20 s / openFarm off) and 1.3 (focus).
   - 1.1 needs only `openFarm: 'off'` plus one number and a candidate clause.
   - 1.3 is about 30 lines in `selectTarget`.
   - Proposed R3a bundle: 1.1 + 1.2 + 1.3 + 1.4, with 1.5 as a switchable arm.
5. **DOCTRINE V4 lines these items overrule (practice only)**:
   - D0's 40 s guard: 20 s without a foreign death.
   - D2's far default: mid.
   - D3's HEAL: off in SQUAD.
   - D5's 30% stickiness: additive focus.
   - D6's 90% farm floor: 50%.
   - D6 supply drops: candidate SQUAD-off.
   - Each one is behind a preset, so S01-full stays reproducible byte for byte.
