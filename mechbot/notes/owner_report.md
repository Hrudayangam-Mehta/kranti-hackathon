# Our bot: tactics report for the team owner

Draft 1, Saturday 21 Nov 2026, about 07:20 UTC. For the owner only: this file stays out of the public
repository (REPO_HYGIENE.md) until results are published; it names other teams and their repositories, so it
must never be copied there. Every number has a source in `notes/`; codes such as
A05 or R01 are rows of `notes/measured_deltas.md`.

**Where we stand.** No submission has been made (your standing order: none until the competitor study is
finished and you say go). The code is being brought into line with Doctrine V4, the evidence-based rule set at
the top of `BRAIN_SPEC_V2.md`; that integration pass started at 06:53 UTC and is still running. The previous code
(before Doctrine V4) scored 3.38 in our simulator, where the leading 5.58 bot scores 5.30 and where scores read
on average 0.41 too low, so that code would be worth roughly 3.8 on the real scorer. The cut for the final (32nd
place) was 4.88 at 06:49 UTC, up from 4.44 at 05:19. The doctrine changes therefore have to add more than a
point before the first submission is worth making. Submissions close Sunday 16:00 UTC; the last safe one is
15:15 UTC.

---

## 1. The two games

The event scores us twice, in two games that reward opposite behaviour.

| | Practice (now until the cutoff) | Final (after the cutoff) |
|---|---|---|
| Opponents | 15 house bots (4 easy, 4 medium, 4 hard, 3 expert) acting as one squad: they share vision, never fight each other, and hunt us weakest-first, one early, more as we kill them, all of them late | 15 other teams' bots in a 16-mech free-for-all (FFA: everyone against everyone); empty seats go to house bots |
| Score | house bots that die before we do, averaged over 48 fixed matches (so scores move in steps of 1/48 = 0.021) | 16 minus our finishing place: 16 qualifying matches for the top 32, then 64 matches for the top 16; only the winner is paid ($5,000) |
| Feedback | one number per submission; 4 submissions an hour; only the best counts; equal scores rank the earlier submission first | none: the scorer never lets us rehearse a free-for-all |
| What wins, measured | fighting well: every hide-first test by other teams lost points | surviving the opening calmly: the bottom half of a recorded field was dead after a median 21 s |
| Today's numbers | top 5.58; 32nd 4.88 at 06:49 UTC | an average entry scores 7.5; a 16-match qualifying mean has an error of about 1.1 |

**Why one bot must serve both.** The rules say that at the cutoff "your chosen submission locks with its
practice score". The bot that plays the final must itself hold a top-32 practice score, so we cannot qualify with
a fighter and swap in a hider. The answer is one program with two postures:

- **SQUAD posture** (the default) is built for practice: fight, farm, retreat only when losing.
- **FFA posture** is built for the final: stay out of sight, grow quietly, finish rather than start fights.
- A one-way switch (we call it the **latch**) moves the bot from SQUAD to FFA when it has seen three mechs die
  that it did not kill, in the first 200 s. In practice house bots die mostly to us, so it does not trip: a
  three-death rule left another team's practice score exactly unchanged (X01), and it never tripped in 96 of our
  simulated practice matches. In the 11 recorded real free-for-alls the third death came by 19 s.
- Until the latch trips, the bot behaves bit for bit like a practice-only build, so the final logic costs no
  practice points.

## 2. What the evidence says

### Where the evidence comes from, and how much to trust it

The scoreboard shows one number per team and no replays. Our evidence therefore comes from other teams' published
logs and commit messages (97 official before/after results from 27 teams, collected in `measured_deltas.md`),
from recordings of real 16-mech exhibition matches that teams published (7 to 13 matches per source), from the
public bots' code read in a clean room (section 4), and from our own reading of the house bots in the official
replay.

Grades used below: **S** strong (several teams, official scorer); **T** what the top bots (5.58, 5.19) chose,
not a controlled test; **1** one team's official A/B (a before/after test of one change); **C** contested;
**rec** recorded real free-for-alls; **sim** a simulator only.

Noise matters. Identical code scores identically on the official scorer, but any change re-rolls all 48 matches:
changing only a random seed moved two bots by -0.06 and -0.27 (D04, D05). A single result smaller than about 0.3
is therefore not evidence on its own.

### The results that shaped the design

| # | Finding | Number | Source | Grade | What we did |
|---|---|---|---|---|---|
| 1 | Hiding or holding fire loses practice points | -0.33 to -1.75 in 10 tests by 8 teams (mean -0.81) | A01, A13-A24 | S | No hiding while healthy |
| 2 | Long gun duels lose | backpedalling at 130 m -0.77; shooting at any range -0.34; 90 m beat 130 m | R01, R09, R08 | S | Gun held at 75 m; no long shots at dodging targets |
| 3 | Laser range is disputed | one bot 3.42 at 255 m, 4.13 at 110 m; the 5.58 bot kites at 125-185 m; the 5.19 bot holds 110 m | R06-R08, R13, R14 | C | Two named settings, decided on the real scorer |
| 4 | Retreat only when losing | removing the 5.58 bot's low-health retreat -0.41; retreating at 72% health -1.10 | A05, A25 | T, 1 | Retreat thresholds by number of attackers |
| 5 | Fight on instead of breaking off at 3-4 hunters | +0.72, then +0.23 on the 5.58 bot's own submission ladder | MAGIC-Royale tags | T | Break off only at 6 attackers or low health |
| 6 | Keep shooting while healing | holding fire while healing cost 0.34 | A08 vs A09 | 1 | Healing bot returns fire |
| 7 | Aim and trigger quality | +0.91 on the 5.58 ladder; +0.40 for execution fixes alone; +0.88 for a crash fix | F01, F04 | S | Lead by relative motion, aim-point ladder, trigger held |
| 8 | Prefer targets the current burst can kill | +0.39 | G01 | 1 | Target bonus |
| 9 | Fight only mechs that are hostile | +0.23; picking fights with idle or far mechs -0.18 to -0.37 | G02, A23, A12, R11 | 1 | Hostility test |
| 10 | Farm crates and drones, but not far or late | on +0.27, +0.37; off -0.65; farther or longer -0.1 to -0.2 | E01, E04, E12, E02, E05 | S | Farm at full health, near, until 210 s |
| 11 | Start no fight before 6 cubes or 75 s | +0.35 over fighting on sight (4 cubes/50 s +0.23, 10 cubes/130 s +0.14) | TigerTown27's own board log | 1 | Candidate setting; not yet in the doctrine |
| 12 | Roofs lose | 5 of 6 tests, -0.18 to -0.93 | C02-C06 | S | No roof play |
| 13 | Quiet walking costs | +0.21 when switched off, reproduced by a second team | M01, M02 | S | Always full speed |
| 14 | Very fast side-to-side reversals lose | -0.69 | M03 | 1 | Never reverse faster than every 0.8 s |
| 15 | Contesting supply drops loses | -0.21, -0.08 | E03, E11 | 1 | Uncontested drops only |
| 16 | Timing and determinism matter as much as tactics | late-answer fixes +0.38, +0.17; clock-dependent bots moved 0.02-0.33 on identical resubmission | N03, N04, D06-D08 | S | Fixed work per decision; engine thread limits |
| 17 | Local simulators mislead | 6 predictions with the wrong sign, 0.18-0.77 | V01-V06 | S | Simulator for crashes and timing, not doctrine |
| 18 | The final is decided in the opening | bottom half dead after a median 21 s; winners lived 223 s | showdown data, 7 matches | rec | Opening guard and latch |
| 19 | Practice leaders do not win the final | practice ranks 1-4 placed 6th to 12th; a quiet build beat its fighting twin 10.75 to 9.33 | S04, S08 | rec | Hide-first FFA posture |
| 20 | Lasers and growth win the final | winners: 70% of damage by laser, 26 cubes, 0.7% of standing time in open sight (bottom half 39%), boosting 11% of the time (25%) | S01 | rec | Always want a laser; farm away from mechs |
| 21 | In the final, answer fire | the first hit wins 70% of early duels; a mech that did not answer a first hit survived 10%, one that answered 41% | TigerTown27's 11 recordings | rec | Return fire while breaking the line |

### Your reports: adopted, adapted, rejected

Your four reports (Strategy, Elite Strategy Panel, Aegis-16, Deep Strategy Dossier) got the final right:
placement is the only score there, the opening kills, calm well-equipped bots win, and the engineering
requirements in the Aegis-16 report match the rules. The one place where measurement overruled them is practice, because the
practice score is not placement against equals but a count of house bots outlived, and the house bots die
mostly to us. The second expert panel reached the same verdict (`tactics_update_r2.md`).

| Your idea | Verdict | Reason |
|---|---|---|
| Placement first, survival over kills (all four) | Adopted for the final; rejected for practice | Right for the final (rows 18-19); in practice hide-first lost all 10 tests (row 1) |
| Roof-first looting and elevation (Strategy, Elite) | Rejected | Roof play lost in 5 of 6 official tests, by up to 0.93 |
| Threat heatmap (Elite, Dossier, Aegis) | Adapted | Exact sight-line checks instead (about a millionth of a second each); a routing heatmap saves about 17 health per retreat |
| Probabilistic enemy memory and sound fusion (all) | Adapted, light form | One "could be within this circle" disc per lost enemy; sounds turn the torso. 93% of re-sightings fell inside the simple walking-speed circle, so a full belief grid adds little |
| Avoid fair fights (all) | Adapted | Strict in the final (no chosen fight before 90 s); in practice the hunters come to us and declining them costs points |
| Third-party fights (Elite, Strategy, Aegis) | Adapted, final only | The squad never fights itself; in the final we only finish a weakened survivor |
| Aggression only in the last four (Elite, Strategy) | Adopted for the final, with numbers | Section 3; not in practice |
| Weighted utility score 0.35 / 0.20 / ... (Elite) | Rejected as a sum, kept as an order | A sum cannot veto (leaving the zone would cost only 0.10); we use hard rules in the order zone, survival, position, information, resources, combat |
| Seven agents with a meta-controller (Aegis, Dossier) | Adapted | Seven layers with fixed priorities rather than weighted voting |
| Weapon triangle (Aegis, Dossier) | Adopted in part | Laser always wanted; mortar never kept (a laser hit on a mortar holder does 60% extra; no recorded winner carried one) |
| Rear armour: turn the torso to the damage (Aegis) | Adopted | Torso kept towards strong attackers; unseen damage creates a "phantom" attacker on that bearing |
| Supply-drop ambush (all) | Rejected | Contesting drops lost 0.21 and 0.08; we take only unheld drops timed for the landing |
| Rotate early using the next circle (all) | Adopted | Zone rules in section 3 |
| Deterministic, well under the time limit, sandbox rules (Aegis) | Adopted and extended | We measured a one-CPU stall nobody had documented (section 4) |
| Study the house bots first (Dossier) | Done | They aim perfectly at steady targets, fire 12 shots then pause 2.5 s, never retreat or heal |
| Separate exploit and general variants (Dossier) | Adapted | The rules lock one entry, hence one bot with two postures |

## 3. How our bot plays (Doctrine V4 in plain words)

### Practice (SQUAD posture)

| Phase | What the bot does | Why |
|---|---|---|
| Before the match | Loads the map, then rehearses 400 made-up decisions so the JavaScript engine has compiled its code; ready in about 0.5 s of the 20 s allowed | First answers arrive on time (section 4) |
| Opening, first 40 s | Starts no fight with a mech that is not hostile; answers a hostile one at once. "Hostile" = damaged us in the last 4 s, or aims within 12 degrees of us with a clear shot inside 160 m. Picks up nearby weapons and cubes | The first hunter comes to us anyway (rows 9, 11) |
| Fighting | Gun only: holds 75 m (band 55-95 m). With a laser: holds 150 m (band 125-185 m), backs away firmly inside 125 m; a second setting holds 115 m. Always moving sideways, reversing every 0.8-1.6 s at random, plus a sidestep for every enemy bullet that would hit. Stays on the ground (airborne mechs are easier to hit). Skips gun shots whose flight would exceed 0.55 s unless the target moves steadily | House bots hit a steady target 84% of the time and one that changed direction 22%; their hit rate falls from about 100% under 75 m to 32% at 126-151 m (rows 2, 3, 14) |
| Target choice | Nearest first, with strong bonuses for a target the current burst can finish, for whoever hit us in the last 3 s, and for the current target. Never leaves a target under 25% health for a fresh one | Rows 8, 9 |
| Using their reload | Counts each house bot's shots; after 12 it has 2.5 s of silence: approach, cross open ground or grab loot then | House-bot forensics |
| Power during a fight | Detours to a cube within 70 m (40 m below half health, 12 m when losing) and to a laser within 60 m; collects the cubes of its kills at once | The change behind the 5.19 bot and part of the 5.58 bot |
| Losing | Breaks the line of fire while still shooting and still charging the laser. Losing means: 1 attacker and our health under 35% with the target at least 10 points healthier; 2 attackers and health under 50%; 3-5 attackers and under 60%; 6 or more at any health. Never while finishing a target under 20% health | Rows 4, 5 |
| Healing | Out of contact and under 55% health: stands or creeps in cover, fetches cubes within 40 m, torso scanning, returns fire if shot. Leaves at 70%. Health regenerates at 45 per second after 5 s without dealing or taking damage | Rows 1, 6 |
| Between fights | Farms crates (within 150 m) and drones (within 170 m) only out of contact and at 90% health or more; stops at 210 s or once it holds 10 cubes and a laser. No roof loot | Rows 10, 12 |
| Zone | Heads inside the next circle early (to half its radius on our side); from a radius of 70 m converges on the next centre; in the final shrink stands on the moving centre | Mechanism only, no measurement |
| Loadout, upgrades | Gun plus laser; lightning if no laser; mortar only as a last resort and never kept. Upgrades: plating, armour, nanites (repair), then laser damage and charge | Top bots' choice (T) |

### The final (FFA posture, after the latch)

| Phase | What the bot does | Why |
|---|---|---|
| Opening, before the latch (about the first 20 s) | The same guard as practice. Being fixed now: move out of sight of a non-hostile mech instead of standing in view with the trigger held | In our local free-for-alls, holding fire in view cost 2.7 places; walking away gained 1.5 (sim) |
| Early, 9 or more alive | Hide-first: no chosen fight before 90 s; fights from cover; never walks at an enemy; never visible below 55% health; answers fire while breaking the line; farms only when the nearest mech is beyond 150 m; switches to laser plus lightning and drops the gun | Rows 18-21; six of seven recorded winners ended with laser plus lightning |
| Middle, 5-8 alive | Fires first only to finish (target health below 90% of our burst, within 140 m, nobody else within 120 m, its aim away from us) or with overwhelming odds on an isolated mech that has not noticed us; one magazine and one beam, then out of sight for 5 s | The server shows a lost mech for 5 s; the top bots forget it within 3-5 s |
| Late, 4-2 alive | 4 alive: fights only with an estimated win chance of 77% or more. 3 alive: holds fire until a death is heard, then hits the survivor within 4 s, before its regeneration starts. 2 alive: compares who would outlast whom on the final point. From 375 s: stands on the final point | Second expert panel's model |
| Reading opponents | Laser carrier: hide when its charge flag points at us (the beam needs a sight line at release, 0.75 s later). Lightning carrier closing: keep 50 m or more along cover. Shoot-on-sight strafer: break sight for 5 s. Boost rusher: wait at a corner. Hider: pass wide, out-farm it, finish it late | Observable signs: weapons listed, charge flag, range, speed |

Being finished in code now (integration pass 1, then pass 2): the Doctrine V4 numbers above, the fixes from our
two red-team pre-mortems (`redteam_practice.md`, `redteam_final.md`), and the second panel's change list. The
final-posture table and the per-team counters of section 5 come in pass 2.

## 4. How it is built

### Modules

About 4,800 lines of plain JavaScript on the Bun 1.4.4 runtime, no third-party libraries.

| File | Lines | Job |
|---|---:|---|
| `bot.js` | 203 | Talks the protocol: reads the match start and observations, answers each with one action; fail-safes (a simple fallback policy if the brain throws; always answers the newest observation; nothing but protocol lines on standard output) |
| `lib/world.js`, `lib/nav.js` | 640, 965 | Map: terrain heights, buildings and trees, sight lines, 2 m walking grid, path finding, sealed-pocket detection and escape hops |
| `lib/aim.js` | 168 | Ballistics: where to aim so a bullet meets a moving target |
| `lib/senses.js` (layer 1) | 491 | Memory: enemy tracks, bullets in flight, shots counted per enemy, hostility clues |
| `lib/firecontrol.js` (layer 2) | 294 | Aim, trigger timing, laser charge and release |
| `lib/mover.js` (layer 3) | 434 | Legs: paths, holding range, side-steps, bullet dodge, zone moves |
| `lib/tactics.js` (layer 4) | 514 | Target choice, losing / healing decisions, cover cells |
| `lib/economy.js` (layer 5) | 279 | Crates, drones, cubes, weapons, drops, upgrades |
| `lib/stance.js` (layers 6-7) | 297 | Manoeuvres (corner ambush, last stand), the latch, the two postures |
| `lib/brain.js`, `lib/params.js` | 408, 131 | Runs the layers in order; every tunable number with named presets, so one submission can change exactly one thing |

Tests: 39 of 39 map and geometry checks, 29 of 29 brain checks (last full run before the current pass), a fuzz
test of 2,000 perturbed observations with no crash, and the official conformance checker passing.

### Determinism

All randomness comes from the match seed plus a "salt" number we choose; nothing depends on the wall clock; the
work in each decision is bounded by fixed counts (sight lines, path steps, candidates) instead of a time budget.
Two reasons: a deterministic bot gives the same score for the same code, so each submission measures exactly the
one thing we changed; and bots whose planning depended on the clock moved by up to 0.33 when resubmitted
unchanged (row 16). Changing the salt is a legitimate fresh draw of the 48 matches. Our red team found clock
checks still in the older code (5 of 48 simulated matches differed between two runs); removing them is in the
current pass.

### The one-CPU runtime finding

The sandbox gives the bot one CPU as a time quota, not as one core. The JavaScript engine still sees every core
of the host and starts helper threads (code compilers, garbage collector). Their bursts use up the quota and the
whole bot is paused, so an answer that takes 1 ms to compute can arrive 50 ms late. A late answer means the mech
coasts and lets go of its trigger, which also releases a charging laser early. We reproduced the quota without
Docker and measured, with the real map and 300 observations:

| Engine settings | Median | 99th percentile | Worst | Late answers |
|---|---:|---:|---:|---:|
| Default, two runs | 0.4-0.5 ms | 7.6-31.4 ms | 43-51 ms | 0-1 |
| Helper threads limited (our Dockerfile), two runs | 0.4-0.5 ms | 5.7-6.3 ms | 12.4-13.5 ms | 0 |

The limits are the engine's documented environment settings, written into our Dockerfile; the start-up
rehearsal moves the remaining compile pauses before the first observation. The 5.58 bot made the same kind of
fix (worst answer 55-114 ms down to 16 ms). Every release is re-measured this way.

### The release

`tools/package.sh` turns the readable source into a single minified, comment-free `bot.js` (about 107 kB at the
last build), copies the Dockerfile, the MIT licence and a minimal README, refuses to finish if any forbidden word
appears, and runs the official conformance check under the one-CPU quota with and without the map. Only those four
files enter the public repository, and only in the minute of a submission (your hygiene rules). The readable
source, tests, simulator and notes stay with us, ready to show the organisers if they ask.

### Simulator and sparring

We wrote our own match simulator from the protocol text. About 110 other teams' public bots run in it as
opponents, each in a locked sandbox. A first, still partial calibration pass on 26 of them (about 21 matches each) ranks bots almost exactly as the
official board does (rank correlation 0.97) but reads on average 0.41 low, with an error of 0.49 per bot. We use
it for crashes, getting stuck, timing and gross sanity; the doctrine itself comes from official-scorer evidence,
because other teams' simulators gave the wrong sign six times (row 17).

### Why it is original work

The rules: "No sharing code between teams: top entries are compared, and you may be asked to explain yours."
Our method:

- Every line of our bot and simulator was written by us during the event, with AI assistance (disclosed in the
  README, which the rules allow).
- Other teams' code only ever ran as sandboxed sparring opponents: read-only copies, started through one script
  that gives each its own empty network, an unprivileged user and no access to our files. We talked to them only
  through the game protocol, as the server does.
- Our studies of other bots were read-only and written in our own words: behaviour and plain numbers ("holds
  110 m with a laser"), never code, identifiers or constant tables. Some doctrine numbers therefore match public
  bots' behaviour, as tactics learned from public material, implemented in our own code.
- Our pre-push check fails if any file we would ship is byte-identical to any file in the other teams'
  repositories. The public repository is new, not a fork.

## 5. The competition landscape

**DRAFT: to be completed from `notes/counter_dossier.md`.** Nine counter studies are finished, five are pending,
and six teams entered the top 16 after 05:19 UTC with no study yet. Rows marked "pending" or "placeholder" are to
be filled.

### Top 16 at 06:49 UTC, plus studied teams just below

| # | Team | Score | Repository | Lineage | How it plays (FFA unless noted) | Our main counters | Study |
|---:|---|---:|---|---|---|---|---|
| 1 | A-bot LLC | 5.58 | Kgc3105/MAGIC-Royale (high) | Own, TypeScript | Switches at 3 foreign deaths to a cover-sitter that engages only inside 120 m; gun plus laser; from 325 s stands on the centre in the open | Pass at 130 m or more, or behind hard cover; fight its laser on its charge clock; charge our laser off-axis; break contact (it forgets after 3 s) | done |
| 2 | scorpion | 5.58 | Probably the same code (exact tie 5 min after that repo restored 5.58) | as above | as above | as above; assume two copies in the final | done |
| 3 | AT | 5.52 | not found | unknown | No FFA mode; laser plus lightning chaser with a spinning torso; fires in the first second; walks straight to pickups. 11 recorded matches: mean place 8.9, 2 wins, 5 deaths within 8-22 s | Never be its nearest visible mech; break sight within 2.4 s of a beam; shoot it on its straight walks | done |
| 4 | 2696 | 5.42 | placeholder | | | | none |
| 5 | TigerTown27 | 5.42 | shaunkar1/proj1 (confirmed) | Own, Go | Flips to FFA rules at the first foreign death; avoids mechs twice as strong; in practice no fights until 6 cubes or 75 s | Finish it when it retreats at 40% health or less; keep our torso off it (being aimed at or hit is its main reason to shoot); laser only in its blind windows, from a corner | done (5.31 build read; 5.42 build not) |
| 6 | benchmaster | 5.42 | placeholder | | | | none |
| 7 | tigerbyte | 5.33 | not found (not proj1) | unknown | Recorded: gun only, pushes towards attackers, then stands still repairing for 30-60 s; 6.8 points over 6 matches | Out-range it with the laser; finish it while it repairs | done, weak |
| 8 | giddygiddyboy | 5.31 | placeholder | | | | none |
| 9 | BobBuildIt | 5.27 | not found | unknown | Gun plus laser trader; accepts every duel at 90-140 m in the open; dead in all 10 recordings, mean life 66 s, mean place 8.8 | Full-charge beams from cover at 150-190 m, exposed 0.6 s at most | done |
| 10 | r1ver | 5.27 | moonriver0922/mech-royale-planner | Wolverines derivative | pending (new score at 06:46) | Wolverines counters until studied | pending |
| 11 | kyoto-max | 5.25 | kyoto-max/Mech_Royale | Own; many published A/Bs | placeholder | | none |
| 12 | Huss Huss Husss | 5.23 | placeholder | | | | none |
| 13 | Hacktoolz | 5.23 | placeholder | | | | none |
| 14 | Wolverines | 5.21 | varchaskukreja/TTUN (confirmed) | Own; base of 3 entries | After 2 foreign deaths and while more than 6 are alive, stops targeting mechs; then fights everything again. Gun 70 m, laser 110 m, closes to 28 m with lightning; forgets a mech after 4 s; detours to cubes within 70 m | While 7-14 are alive, beam it from 150-190 m when it does not return fire; flank from outside its view; break sight 5 s and ambush its cube path | done |
| 15 | Kanyaraasi | 5.19 | devakchow/team-kanyaraasi-mech-royale | Byte-identical copy of the Wolverines 5.19 build (via r1ver) | No FFA mode: shoots everything it sees | Blind-side third party; Wolverines counters | done |
| 16 | Mahalas | 5.15 | chriseco427-spec/CyprusBot (medium-high) | Own, Rust | Practice brawler at 55 m; in FFA a hider that runs to cover up to 96 m away when shot, unless it clearly out-powers a lone attacker; stands still in the open in the last circles | Shoot its flee leg (steady, back exposed, rear hits x1.5); dodge its laser at 0.6 s, punish the cooldown; late-circle shot from behind | done |
| 17 | BackwardsDeployeds | 5.10 | brycehcmcgrath/mechfight-bot | Compiled wrapper around a public controller (LanceHuang245) | Laser plus lightning; shoots on sight; 110 m with laser, rushes to 28 m inside 60 m with lightning; hides at 38%; no FFA detector seen | Stay beyond 60-70 m when it carries lightning; corner peek timed on its beam; blind-side third party | done |
| 18 | RN SUS | 5.08 | JosiahAklog/nexus-mech-royale | Own, Python | pending | | pending |
| 19 | not even close | 5.08 | Th3r0n/mech-royale-bot | Partly Wolverines "econ core" | pending | | pending |
| 20 | ImagineLosing | 5.04 | prakash-218/buildathon-mech (likely) | Own, Go | Fires at anything from the first second; walks straight at a tracked target; fights to the death; stands in drop rings | Third party from its rear quarter; corner play against its laser; kill it before it finds a second weapon | done |
| 22 | 404 Competition Not Found | 5.02 | davidvarvas/mech-royale-bot | Own (withdrew earlier builds based on public code) | Slow first minute, hull upgrades first; lightning did 53% of damage in its recorded win | Keep beyond 50 m along cover; laser it through gaps | pending |
| 28 | 314159265 | 4.92 | AbhirajTiwari12/mech-royale-bot (medium) | Own, Python | Boosts 41% of the time, lives about 36 s | Wait at a corner; do not run | pending |

Families: one set of counters covers up to four finalists of the Wolverines family (Wolverines, Kanyaraasi, r1ver,
partly not even close), and copies of it fight each other on sight. The 5.58 code probably plays twice. Of the
studied teams only A-bot LLC/scorpion, TigerTown27, Mahalas and Wolverines have a free-for-all mode we could
confirm; the rest shoot from the first second. The opening of the final will be a brawl, which is why our opening rule is to be out
of sight rather than to win the first duel. The two practice leaders seen in recordings (AT, BobBuildIt) placed
no better than a random mech would (8.5th).

### Placeholder: counter dossier rows still to fill

| Team | Repository | Lineage | FFA posture | Signature we can see | Counter 1 | Counter 2 | Adversarial check | Status |
|---|---|---|---|---|---|---|---|---|
| 2696 | | | | | | | | to do |
| benchmaster | | | | | | | | to do |
| giddygiddyboy | | | | | | | | to do |
| kyoto-max | kyoto-max/Mech_Royale | own | | | | | | to do |
| Huss Huss Husss | | | | | | | | to do |
| Hacktoolz | | | | | | | | to do |
| r1ver | moonriver0922/mech-royale-planner | Wolverines | | | | | | study pending |
| RN SUS | JosiahAklog/nexus-mech-royale | own | | | | | | study pending |
| not even close | Th3r0n/mech-royale-bot | partly Wolverines | | | | | | study pending |
| 404 Competition Not Found | davidvarvas/mech-royale-bot | own | | | | | | study pending |
| 314159265 | AbhirajTiwari12/mech-royale-bot | own | | | | | | study pending |

Mechs are anonymous in our observations, so every counter is keyed on what we can see (weapons listed, charge
flag, range, speed, torso movement), not on a team name. That also protects us when a team switches entries
before the cutoff.

## 6. Risks and known limitations

| # | Risk | Size and evidence | What we do about it |
|---|---|---|---|
| 1 | We miss the cut | Our pre-Doctrine-V4 code is worth about 3.8; the cut was 4.88 at 06:49 and rose about 0.3 an hour over the previous 90 minutes | Finish the Doctrine V4 pass; first submission as soon as you say go; extra draws with different salts afterwards; lock by 15:15 UTC Sunday |
| 2 | The doctrine is not yet fully in code | Integration started 06:53 UTC; final posture and counters come in pass 2 | Independent verification and simulator smoke runs before any submission |
| 3 | The simulator misleads us | Good at ranking (0.97) but 0.49 points of error per bot; other teams' simulators gave the wrong sign six times | Use it only for crashes, sticking and timing; decide tactics on official evidence; one change per submission |
| 4 | Laser range setting is wrong | Top bots disagree: 125-185 m against 110 m; one sweep favours 110 m | One submission each way; keep the better one |
| 5 | The latch trips in practice | A looser latch on a sister bot coincided with 3.56 against 5.19 (confounded); one false trip costs about 5 points in that match | Strictest rule (3 deaths); extra clues off by default; a clue is switched on only if a submission with it scores exactly the same |
| 6 | The latch trips late or never in a quiet final | If finalists all survive their openings, the third foreign death may come after 200 s and we would hunt all match | Optional clue: mechs without a gun are not house bots (house bots always carry one); off until tested |
| 7 | The final posture is unproven | Before Doctrine V4, our bot placed 7.39 on average over 156 local free-for-alls (8 wins; 37% dead before 60 s; a random mech places 8.5) | Red-team fixes ranked by places lost: opening, visibility, economy |
| 8 | Late answers on a busy scorer host | 12-14 ms worst under our quota, but the host load is unknown | Fixed work per decision; re-measure every build |
| 9 | Sealed spawn pocket | 10.5% of spawn ground is in pockets with no walking exit; the escape hop exists in the map code but was not wired up | Being wired in the current pass |
| 10 | Questions about originality | Minified release; some doctrine numbers equal public bots' numbers | Show the readable source, the notes and the clean-room method; the numbers are tactics, the code is ours |
| 11 | Opponents change before the cutoff | Our studies describe builds from 02:00-06:00 UTC | Counters keyed on behaviour we can see, with a safe default when the read is wrong |
| 12 | Ties | 26 of the top 50 shared a score with another team | Submit early; ties go to the earlier submission |

## 7. Explaining the bot to the organisers in five minutes

> **What it is.** A rule-based bot in plain JavaScript on Bun, about 4,800 lines, no libraries, written by us
> during the event with AI coding assistance, which our README states. No machine learning runs inside it: every
> decision is a fixed sequence of rules computed in about a millisecond.
>
> **The idea.** The event has two different games. Practice counts house bots outlived, and they hunt us, so
> there the bot fights: it holds a measured range for each weapon, side-steps bullets, finishes wounded
> targets, grabs cubes and a laser mid-fight, and retreats only when it is actually losing. The final is a
> free-for-all scored by placement, where the weakest half dies in the first twenty seconds. The same program
> notices that kind of match when mechs it did not kill keep dying, and switches for good to a careful posture:
> out of sight, growing quietly, finishing fights rather than starting them, and holding the centre late.
>
> **How we decided.** We did not trust our own theory. We collected about a hundred published before-and-after
> results from other teams and the recorded exhibition matches. Those showed that hiding loses practice, that
> long gun duels and roofs lose, and that lasers and calm play win the final. Each rule in the bot traces to one
> of those measurements.
>
> **How it is built.** Seven layers: memory, aiming, movement, tactics, economy, manoeuvres and posture, on top
> of our own map, path-finding and ballistics code. Every number lives in one parameter file, so each submission
> changes one thing. The bot is deterministic: the same code gives the same result, which makes each
> submission an honest experiment. We also found that under a one-CPU limit the engine's background threads can
> stall a reply past 50 ms; our Dockerfile limits them, and the bot rehearses a few hundred decisions at start-up.
>
> **Originality.** All of the code is ours. We read public repositories to learn how other bots behave, as
> anyone could, and we ran some of them only as sandboxed sparring opponents in our own simulator. We never
> copied code, and a check before every push confirms that no shipped file matches any of theirs. We are happy to walk you through
> the readable source and our notes.

Practical points for you: bring the readable source (`bot/`) and this report; if asked about the minified file,
it is produced from that source by Bun's own bundler in one command (`tools/package.sh`). If asked why a number
such as "110 m with a laser" matches another team's bot, the answer is that it is a fact about the game learned
from public material, re-derived and implemented in our own code.
