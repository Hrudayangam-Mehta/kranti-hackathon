# Panel R7, round 1: adversary psychologist / opponent modeller (lens `psych`)

Written Sat 21 Nov, about 22:05 UTC. Read only: kit/protocol.md, notes/{rules_audit, housebot_model.json, forensics,
stance_playbook, panel_3_adversary_psychology, top5_synthesis, counter_dossier (sections 1, 2, 5),
counters_2696_addendum (headings), measured_deltas (A and S rows), panel_r6_rewards, build_spec_r5, build_spec_r6,
submissions}, notes/intel/top5_{giddygiddyboy, kyoto_max}.md, sim/house.js (squad stand-in), bot/lib/{params,
tactics, brain, senses, ffa, stance, steal, counters}.js. No simulator runs. Scratch folder tools/panel_r7/psych/ (empty).
Clean room: only our own prose about other teams.

Tags: [M] official result; [T] a top bot's choice; [S] our simulator; [A] arithmetic or model; [N] no evidence. Two
extra tags for measured but non-score facts: **[R]** = measured in the official house-bot replay or the kit stream
(forensics.md; replay = older balance, FFA, no squad); **[L]** = other teams' recorded or live matches
(measured_deltas S01-S12). "Practice" = P, "final" = F, "both" = B.

## 0. Bottom line

1. The squad's real controller is unknown. What is known: 4 easy, 4 medium, 4 hard and 3 expert bots with shared
   vision that never fight each other, and weakest-first hunting with more hunters per kill and all of them late
   (track page). The individual bots, by contrast, are well measured: pure first-order aim, a fixed fire cadence,
   no retreat, no reaction to charges, slow turns toward attackers outside their view [R]. So exploit **timing
   windows inside a fight**, not information tricks. Shared vision means hiding sheds nobody: ten hide-first tests
   lost 0.3-1.75 [M other teams].
2. Practice: two items. **P1 PRE** (pre-charged laser on a line we expect to open) is the purest exploit of a
   measured house reflex; promote it from the night block. **P2 `calm: 'rear'`**: stop starting fights with calm
   non-hunters unless they show us their back and nothing else has a line on us.
3. Final: the field is practice killers that turn **hostile-only within 0.5 s of the first death** [T]. Points come
   from outliving others, not from kills. **Veto `ffaHunt: 'h50'`.** Raise the calm-mech bubble to 62 m, build
   `ffaOpenGuard`, and run a tightened beam clue. Verify that every final-only item is practice-inert with one
   official identity draw.

## 1. The house squad as habits, windows and exploits

| # | Habit | Evidence | Window / trigger we can read | Exploit and code site | Status | P/F/B |
|---|---|---|---|---|---|---|
| H1 | Hunters are the **weakest alive tier**; +hunters per kill; all late | track page text; [L] S06 "weakest tiers hunt first"; schedule [N] (team sims guess 1 at 20 s, then 1-2 per kill, all at 240-300 s) | A mech that closes, aims at us or hit us is a hunter (likely easy/medium). A mech that is not doing any of these is a non-hunter, and more likely a higher tier | Kill hunters. Do not open a second front on a calm, stronger bot: P2 at `tactics.selectTarget` (band clause) | P2 new | P |
| H2 | **Shared vision** plus 5 s server memory | rules; [M] A01, A13, A18, A20, A22, A24 hide postures -0.5..-1.75 | Cover stops bullets, not knowledge. Hunters path to our true position. Our 5 s memory also gives us **their** true position behind walls | Never hide to shed pursuit. Use our memory to pre-aim and pre-charge where they will emerge (P1) | `preAimS` 4 exists; PRE unbuilt | B |
| H3 | **Slow first shot**: they fire only with a clear line (99.6%); first shot p10 0.25 s, p25 0.65 s, p50 1.15 s after a line opens; exposures under 0.25 s drew no fire | [R] 851 shots, 77 acquisitions | Every new line, whoever moves, gives us 0.25-1.15 s free. Our gun can use it at once; our laser only if it is already charged | P1 PRE; ISO / LC use the same window (break a new second line before its first round) | ISO/LC in R5a | B |
| H4 | **Pure first-order lead**, no aim noise, misses pass ahead; a velocity change of more than 9 m/s during flight gives 22% hits; nothing dodges under 0.3 s of flight (75 m); airborne targets are easier (92% vs 57%) | [R] 805 shots; stream 0.02 deg; [L] S05 94/58/31/12% by range | Beyond about 80 m, brake or reverse right after their round leaves. Never jump to dodge. Inside 75 m, cover beats jinks | `mover.bulletDodge`, D4 strafe; SYNC (R5 #15) is the closed-loop form | exists / night | B |
| H5 | **Fixed cadence**: fires on the first observation showing cooldown 0 (0.30 s); 12 rounds (3.3 s), then 2.5 s silent; never reloads early (72/72) | [R] + stream | Per hunter, `magN >= 12` and under 2.5 s since its last bullet = no gun. With two hunters, both are silent about 18% of the time [A, independent] | Close / finish / re-peek in its silence (`brain.fightLegs` `reloading`, gun-only today; `senses.attribute` counts rounds) | exists (gun-only) | B |
| H6 | **House laser (current build)** tracks through the charge, releases only at full charge, aims at the direct bearing on release, waits at least 54 ticks between beams; lost line gives an early wasted release; live accuracy against players 15-27% | stream n=6 (4/4 with a line); [L] S07 | `charging: true` aimed at us gives us 0.75 s. After its beam we have 1.65 + 0.75 = 2.4 s with no laser | Step out of its line on the flag (D4 6/9 m), re-expose in its dead 2.4 s (IO11 `beamEta` refines this) | exists | B |
| H7 | **No retreat, no healing**: under 20% hp they still fire 77% of frames and close at +0.5 m/s | [R] | A wounded hunter comes to us. It does not leave and regenerates only if we leave it | Never walk away from a near kill (FIN). Chasing is rarely needed in practice | FIN in R5a | P |
| H8 | **Narrow wedge**: torso sweeps ±46 deg on a 4.7 s period while travelling; the rear 60 deg is in view 1-3% of the time; hit from outside the wedge, it turns after a median 1.6 s, shoots back after 2.6 s, takes a median 189 hp (mean 383) first | [R] n=32 | `tr.rearOn` (its yaw more than 90 deg off us) and `!aimAtMe`: a 1.6-2.6 s window | Rear laser opener: 472 + about 2 s of gun before any answer (P2 allows only this kind of opener on calm mechs) | P2 | B |
| H9 | **Distraction**: 18 of 83 target switches went to a drone or crate while the mech was still visible; 12 of 35 crate runs began with an enemy within 130 m | [R] | Torso on a crate (300 hp = 7 rounds, at least 2 s) | Same as H8. Calm crate shooters are the best openers | P2 | P |
| H10 | **Economy**: second weapon within 11 s (10 of 16, nearest ground pickup); never roof loot (0 of 10); dead-mech cubes picked up only 34% of the time, median 12.3 s | [R] | About 10 s to clear a kill pile; ground lasers go early | Kill-cube grab (`killCubeR` 200, exists); LG wide (R5b) | exists / R5b | P |
| H11 | **Zone**: inside the next circle 33-58 s before the shrink; median 0.41 of the radius; outer 20% ring holds bots only 7% of the time | [R]; squad [N] | The outer annulus of the next circle is the emptiest place | Our SQUAD idle roams 0.5 x the next radius (`brain.holdLegs`, `zoneGoalFrac`), through their hold band. Simulator check only, no slot | [N] | P |
| H12 | **Supply drop**: the nearest 1-2 bots walk into the ring, one 9 s before landing (killed there) | [R] 2 drops | A capturer is pinned in an 8 m disc for 4 s | Final value. In practice we are alive at the first landing in 5 of 40 matches [S] | exists (D6/F1) | F |

Escalation lag [A on the track-page rule]: after our kill, the next hunters start from where they stand (typically
150-400 m, 13-35 s at 11.7 m/s). That lull is when heal breaks finish. The trigger for R6 `heal: need` should
include "within 15 s of our kill and no line on us".

## 2. Practice proposals (ranked)

### P1 (rank 1, B): PRE, a pre-charged laser on a line we expect to open. Promote from R5 night #12 to the next code stage
- **Why it is the cleanest exploit [R, A]:**
  - The house bot needs 0.25-1.15 s to shoot after a line opens (H3) and ignores our charge flag.
  - A beam released on the first clear tick lands before its first round in about 90% of openings.
  - Without PRE the beam comes 0.75 s later. The beam cycle starts later too, so about 0.3 beams are lost per
    engagement (about 100 damage), plus about 40 hp taken at 50 dps.
- **Trigger** (all must hold):
  - a laser held, cooldown 0;
  - SQUAD posture;
  - not LOSING / HEAL;
  - at most one line on us now;
  - no lightning holder within 50 m.
- **Prediction**: a hostile or `engaged()` track that is listed without a line (memory = true position) gets a line
  within 1.25 s ETA. Either:
  - its straight-line or path ETA to a cell with a line to us, at 0.85 x walk speed (house mean ground speed
    while engaged [R]); or
  - our own regain leg (`B.legKind === 'regain'`), which will open the line.
- **Action:**
  - Hold `fire[laser]` from ETA <= 1.25 s.
  - Release through the existing gates (`killNow`, `laserGateK`) on the first clear tick.
  - Never plan more than 1.8 s of hold (the server fires on its own at 2.75 s).
  - At 1.8 s with no line: dump at a crate in line (IO6) or let it go.
- **EV and cost:**
  - Gain: +0.03..+0.10 [A] (R5 said +0.03).
  - Risk: half speed during at most 0.5 s of exposure, and wasted beams. Both are bounded by the gates.
  - Engineering: 60-90 min, in `firecontrol.run` (laser hold) and `brain.fightLegs` (regain).
- **Test** (simulator behaviour only):
  - at least 30% of first beams per engagement released within 0.3 s of a line opening;
  - forced or dumped releases at most 10% of beams;
  - deaths within 3 s of a pre-charge not above V4;
  - byte identity at `off`.

### P2 (rank 2, P): `calm: { any: { calmRear: false }, rear: { calmRear: true, calmHpf: 0.8 } }`
- **Site:** `tactics.selectTarget`, the band clause `(!h5 && !opening && !ffa && tr.dist <= band)`, where band =
  `bandHi` + 40 (170 m with a laser, 135 m gun-only).
- **Change:** under `rear` the clause also needs one of:
  - `tr.hostile`;
  - `engaged(B, tr, t)`;
  - `B.n1 === 0 && tr.rearOn && me.hpf >= calmHpf`.
- Untouched: the `unengaged` 20 s clause and `engaged()`.
- **Why:**
  - H1: a calm mech is a non-hunter, likely a higher tier, and a fight with it becomes the 2-line fight that kills us
    70% of the time [S ledger].
  - H8: from its back it is the best opener in the game.
  - [T]: giddy leaves "healthy, distant, non-threatening mechs" alone. Its "engage everything within 240 m" was
    tried and not kept.
  - [M, weak]: our own non-hostile hunting draws all read at or below V4 (S 5.13, H 4.98, HL 4.73).
- **EV and cost:**
  - Gain: -0.05..+0.15. The sign is uncertain: if non-hunters fight back only weakly, they are cheap kills and this
    loses.
  - Engineering: 15 min.
- **Tests:**
  - unit: a calm mech at 150 m facing us with n1 = 0 is not a candidate; the same mech facing away is; a hostile one
    always is;
  - SQUAD streams identical at `any`;
  - FFA-inert (the clause has `!ffa`).
- **Slot:** one draw on the leader, as an arm.

### Ranking of the engineer's queue through this lens (no rebuilds)
1. **FIN**: H7 makes it the right default. A house victim never leaves, so the near kill we abandon is the only
   kill we lose.
2. **ISO / LC**: H3 gives us 0.25-1.15 s to break a new second line before its first round. Cover at 6-12 m pays;
   far cover does not (walking to it takes 72 vs 42 hp/s [S]).
3. **AVO**: keep. An optional, cheap refinement: in its threat prior, a hunter inside its 2.5 s reload is x0.2,
   and a laser hunter whose beam we saw in the last 1.65 s loses its +78 laser term (H5, H6; +0.01..+0.03 [A]).
4. **LG**: H10 shows house bots take the nearest ground secondary within 11 s, so the laser race is early.
5. **SYNC**: the right defence beyond 80 m (H4, H5). 3 h, and [M] M03 -0.69 for open-loop flips: only if there is
   engineer time.
6. **HN over HF**: add the post-kill lull trigger above.
7. **ZE**: about 0 in practice. Hunters keep their lines from inside the edge, so stepping out helps only together
   with breaking the line [A].
8. `hunt` / `seek` stay off in practice.

## 3. The final: profiles of the likely top entries (from our own prose notes)

| Family (likely seats) | Latch | Engages only | Leaves / retreats | Endgame | Habit to exploit |
|---|---|---|---|---|---|
| **giddy** (giddy, Kanyaraasi, Th3r0n 5.94, Arnav-M10, maybe Antalos) | 0.5 s after the 1st foreign death [T] | within 60 m; hit it in 4 s; our charging laser aimed within 0.22 rad at 120 m or less; under 350 hp within 120 m; anyone at 2 alive | cover at 38%; leaves at 3 in view (2 when under 65%); copies kill each other | exact next centre once next radius <= 30 m; no retreat at <= 3 alive | 60 m bubble; slow 4.6 m/s walks between low-exposure spots (inside 70% of the circle); boosted sidestep when our flag is within about 9 deg of it; at 2 alive it crosses open ground at us |
| **kyoto-max** (6.31) | about 5 ticks of unexplained deaths | its attackers; within 55 m; under 50% hp; facing away; out-cubed by 3; anyone at <= 4 alive | silent (<5 m/s); holds 110-190 m; damage in only 9-14% of the time with 5-16 alive | aggressive at <= 4; strong at 70-120 m with laser; 30-energy boost floor | vulture; turns to unexplained sounds; sidesteps charges it hears; partial lethal release |
| **proj1 / paw** (TigerTown27, 2696, benchmaster) | 1st foreign death | torso on it about 7 deg for 0.6 s inside 260 m; within 30 m; damaged it (hostile **25 s**); under 40% within 150 m while it is above 60% | flees "much stronger" (hp x dps over 2x within 300 m); TTK test 1.5x | as above | long memory of hostility; ±109 deg sweep every 5.7 s |
| **MAGIC** (A-bot, scorpion) | 3 foreign deaths | inside its 120 m bubble; attackers | hide-first cover sitter | endgame pin | full-charge laser held to the 2.75 s forced discharge; steps out when our flag aims within 0.3 rad |
| **TTUN** (Wolverines, r1ver, NEC, sonion) | none / quiet phase | everything in sight, from second 0 | crowd rule | - | torso slaved to its target: blind to a third party; copies fight on sight |
| Singletons (AT, BobBuildIt, Mahalas, 404, RN SUS, ImagineLosing); expert house fill-ins | varies | AT / Bob: everything; 404: never a healthy, armed non-aimer | - | Mahalas stands on the final centre from about 378 s | AT / Bob die early; expert house bot averaged **4.2nd** in showdowns [L S04] |

**What the field does [T, L]:**
- First fights at 14-20 s.
- After the 1st death most of the field turns hostile-only within 0.5 s (giddy, proj1, kyoto), MAGIC at 3 deaths,
  TTUN never.
- Stand-offs follow: nearest enemy at a median 108 m with 7-16 alive, 180-190 m with 3-6 alive (kyoto).
- Later deaths come from TTUN/AT/Bob shoot-on-sight, bubble violations forced by the zone, vultures on the wounded,
  and the 4 → 2 alive trigger changes.

**Measured stakes [L]:**
- Deaths per minute: 0.36 with no mech within 60 m, 2.02 with one, 4.58 with two (S03).
- Winners keep their nearest enemy at 187 m against 114 m for the bottom half, stand in the open 0.7% against 39.5%,
  live 223 s against 27 s, and hold 25.9 cubes at most (S01).
- Practice ranks 1-4 averaged 8th, 9th, 6th and 12th in Top-16 showdowns (S04).
- Quiet beats fighting in FFA, 10.75 against 9.33 (S08).

**Scoring fact [A]:** our final points = 16 - (alive when we die). It does not matter who kills the others. Kills are
worth only their cubes and the threat they remove.

## 4. Final-only rules (all inert in practice; FFA latch unless stated)

**F1 (rank 1): a 62 m bubble.**
- `ffaProx` [45, 60, 75] → [62, 62, 75]. `ffa.prox` is read by `brain.nearCalm` (FFA posts and roam points),
  `economy.ffaBlocked` (loot goals) and rule 3's minimum range in `ffa.firstShotOk` (that floor is already 60 m).
- Also no move goal within 62 m of a calm mech unless we are finishing it or in the final circle. The remaining
  goal kinds (zone goal, hide cells) need the same filter; today only posts, roam points and loot are checked.
- Why: giddy's 60 m and kyoto's 55 m engage triggers [T]; the death-rate step of S03 [L].
- EV: +0.1..+0.5 points per final match [A]. Our time within 60 m of calm mechs is unmeasured; measure it in the
  FFA league first.
- Cost: 5 min of params plus one line in the goal filters.

**F2: VETO `ffaHunt: 'h50'`** (R5 final list).
- Hunting a healthy mech at 11-6 alive opens fights with retaliators: proj1 stays hostile for 25 s, kyoto and giddy
  engage their attackers. It also makes us the wounded mech in a vulture's view.
- Evidence: S01, S04, S08 [L] and kyoto's measured stand-off [T].
- Expected cost if it ships: -0.5..-1.5 points per match [A]. Keep hunting to F4's lethal cases.

**F3: build `ffaOpenGuard: 'on'`** (R4b, never built) and add a tightened beam clue.
- The guard: after the 1st foreign death and before our 3-death latch, answer only mechs that hit us within 100 m.
  No band, unengaged, seek or death-cube rush. This closes the window in which we are the only practice killer left
  in a hostile-only field.
- The clue (`stance.environment`):
  - count a beam only if no point of its path lies within 8 m of us, so a lightning chain through us is excluded;
  - the victim must be at least 20 m from us and lose at least 40 hp within 1 s without our hit;
  - latch on `victims.size >= 2`, not `beamHits >= 2`.
  - House bots never beam each other, so the clue should never fire in practice.
- Cost: 30 + 15 min.
- **Proof of inertness: one official identity draw of the bundle must reproduce the base score to 0.01** [M method:
  kyoto v18 = v19 = 5.25]. If it differs, drop the clue.

**F4: the death-sound clock** (third party, last hit, kill piles).
- Trigger: a `death` sound or a drop in `alive` that is not our kill.
- 0-4 s: fire at the survivor only for a lethal partial beam (`killNow`), or when it is at 40% or less with nobody
  else within 120 m of it and our cover within 6 m (D11 branch of `ffa.firstShotOk`, unchanged).
- 4-15 s: stay at least 150 m from the death spot. The survivor, the vultures and the cube pile meet there; kyoto
  took 56 of 84 cubes within 8 s of its kills [T].
- Later: take a leftover pile only with no track within 120 m.
- Site: `steal.js` death-cube rush (b, c). It must respect the 4-15 s exclusion unless we arrive at least 3 s first
  **and** the survivor is under 40%.
- Cost: 20 min. EV small and positive [A].

**F5: dark at 4-5 alive.**
- kyoto turns aggressive at 4 or fewer alive, and giddy stops retreating at 3 [T].
- At 4-5 alive, keep a building between us and every listed mech, except:
  - when two others are fighting (rule 3 third party);
  - when we are last by E (M11);
  - when a kill is secure.
- Extend Z9 (`ffaThree`, 3 alive) to 4-5 alive in `ffa.firstShotOk`.
- Cost: 15 min. EV [A].

**F6: do not be the common target.**
- Never show our back within 200 m to a calm laser holder (kyoto's "facing away" rule). Keep the torso inside 90 deg
  of it, but at least 0.3 rad off its bearing (rule 8).
- Within 140 m of a silent mech (still or under 5 m/s for 3 s): no boost or jet (heard to 90 m), and walk under
  5 m/s (`silentStick`). kyoto turns to sounds it cannot explain [T].
- Cost: 20 min.

**F7: endgame, 1v1 and 1v2** (Z5 / Z8 / Z9 / Z10 exist; profile hints only).
- giddy at 2 alive crosses open ground at us. Lay the beam on its approach from hard cover at 120-150 m, and peek
  in its 2.4 s laser window.
- kyoto at 4 or fewer alive: deny it 70-120 m. Either stay out of its sight beyond 200 m, or get under 40 m under
  cover with lightning (a short also blocks its next charge for 2 s).
- Centre-parkers (giddy at next radius <= 30 m, Mahalas from about 378 s) collide on the point. Arrive last, and
  enter when the edge is within 8 m (rule 7). At the 0 m close the hp race decides (E = hp - 260 d): never trade
  in the last 30 s unless our E is lower.
- 1v2: if the two fight each other, wait; if both aim at us, break one line (ISO) and fight the lower E.

**Crate and zone herding (as asked):**
- Crates: in the mid-game, leave an intact crate inside the next circle 100-160 m from our covered post. It draws
  looters (giddy farms crates within 150 m above 50% hp when nothing is engaged; r1ver and RN SUS stop at 13-25 m).
  Strike the looter only with a lethal beam or when it is at 50% or less. Otherwise treat it as free intelligence.
- Zone: the Z10 gate already covers herding; nothing to add.
- Not proposed:
  - pull-through (M6): our pursuers in FFA are mostly TTUN copies that shoot anyone;
  - provoking one bot onto another: hostility is per attacker id, so it comes after us.

## Summary for the moderator

Memo: notes/panel_r7_r1_psych.md. House squad modelled as habits with windows; [R] = official replay / kit stream.
- Key windows: first shot 0.25-1.15 s after a line opens; 3.3 s fire then 2.5 s reload silence; house laser dead
  2.4 s after a beam; 1.6-2.6 s before a bot hit from outside its wedge answers; no retreat at any hp.
- Shared vision means hiding sheds nobody (ten hide tests lost 0.3-1.75 [M]). Exploit timing, not information.

Practice, ranked:
1. **P1 PRE** (`precharge: 'line'`): hold the laser from ETA <= 1.25 s on a listed hunter about to get a line, or
   on our regain leg; at most 1.8 s of hold; release on the first clear tick. +0.03..+0.10 [A]; 60-90 min.
   Promote from the night block.
2. **P2 `calm: 'rear'`**: the band clause in `tactics.selectTarget` fires on a calm mech only if it is hostile,
   engaged, or showing its back with n1 = 0 and our hp >= 80%. -0.05..+0.15 [T giddy; weak M S/H/HL]; 15 min; one draw.
3. Queue order through this lens: FIN > ISO/LC > AVO (opponent-state threat refinement) > LG > SYNC > HN (trigger
   it in the post-kill lull) > ZE. `hunt` / `seek` off.

Final (FFA-only; points = others' deaths, not our kills):
1. **F1 62 m bubble** (`ffaProx` [62, 62, 75] plus goal filters): +0.1..+0.5 per match [A, L S03].
2. **Veto `ffaHunt: 'h50'`** (S01, S04, S08 [L]; proj1 25 s hostility [T]): would cost -0.5..-1.5 per match [A].
3. **F3**: build `ffaOpenGuard` and a tightened beam clue (no path within 8 m of us; 2 distinct victims). Prove
   practice inertness with **one official identity draw** of the whole final-only bundle.
4. F4 death-sound clock (0-4 s lethal only; 4-15 s stay 150 m from the spot); F5 dark at 4-5 alive; F6 no back or
   noise near silent mechs; F7 endgame profile hints.

Questions:
- Engineer: can the sim FFA league log our time within 60 m of calm mechs, and how often the band clause picks a calm
  mech in SQUAD? These are the go/no-go numbers for F1 and P2.
- Rewards expert: price P2 with your 1-line vs 2-line ledger: what share of 2-line fights start from a band-clause
  pick?
- Schedule expert: can the identity draw for the final-only bundle take one slot before the 12:30 FFA freeze?
