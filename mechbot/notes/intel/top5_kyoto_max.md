# kyoto-max (practice 6.31, rank 1) - strategy study

Written Sat 21 Nov 2026, 16:56-17:20 UTC. Scored build: kyoto-max/Mech_Royale @ `6726533f4246e1b1e6f370929a4597da7c204b15`
("v43", pushed 14:34:34 UTC, 252 s before the 6.31 at 14:38:46). Identity: likely (strong), reasoning in `notes/top5_map.md`.

## 0. Method and limits

- The scored commit holds only a Dockerfile (scratch image, unprivileged user) and two native static binaries. Nothing
  readable. The binaries were **not** opened, decompiled or disassembled. Sources used: (a) the 52 commit messages of
  the full history (`intel/_meta/kyoto-max__Mech_Royale.git`; bodies carry the team's own official score for most
  versions up to v29, subjects only from v30), (b) the leaderboard snapshots and page chat (`web/lb_*.html`), (c) earlier
  notes (`notes/top5_map.md`, `notes/measured_deltas.md`, KennethLei1492 commit bodies quoting recorded showdowns),
  (d) black-box behaviour of the scored binary in our simulator.
- Black box: blob `c357ada7` of `pilot-amd64` = the scored commit's blob (sha256 `339feb5d...c3bba9`). Installed as
  roster entry `kyoto_v43_6726533`: `/srv/mech-sparring/kyoto_v43_6726533/pilot` (root, 755) and
  `/srv/mech-sparring/_cmd/kyoto_v43_6726533` = `./pilot`, no environment lines (its Dockerfile sets none). Started only
  as `/srv/mech-sparring/run.sh kyoto_v43_6726533` (no network, uid 65534). Conformance: PASS, ready 552 ms, answers
  p50 0.3 / p99 1.7 / max 2.5 ms, name announced "kyoto-max".
- Runs (cores 2-3, `--jobs 2`): 6 squad matches seeds 1-6 (the brief), plus on the same seeds the 5.58 bot
  `magic_53f6854` and our current brain (`ours`, full-build defaults; official 5.02) as paired yardsticks; and an
  extra 6 free-for-all matches (seeds 101-106, house-bot field) for kyoto and ours, to see the FFA mode.
  Results and traces: `tools/top5/kyoto_runs/` (`*.json`, `trace/*.json.gz`, `probe_squad.txt`, `probe_ffa.txt`).
  Analysis scripts (ours): `tools/top5/kyoto_probe.js`, `kyoto_late.js`, `kyoto_extra.js`, plus
  `scratchpad/gapwork/tools/analyze.js`.
- Caveats: n = 6 per arm (sd of one match about 2 points); the simulator is a model (six known wrong-sign cases; it
  predicted our core build 1.2 above our full build, the real scorer said 0.12 the other way). Use the runs for
  behaviour (what it does, when, at which range), not for score deltas. Ordering on the 6 seeds did match the board:
  kyoto 6.00, magic 4.50, ours 3.33 (official 6.31 / 5.58 / 5.02).
- Untrusted text: no kyoto file or message addresses other teams or agents. Nothing read was acted on.

## 1. History: from 3.6 to 5.3 to 6.31 (times UTC; "kept" = the next version was built on it)

| version | UTC | change (condensed, own words) | official (their body / board) | kept |
|---|---|---|---|---|
| v1 | 00:00 | Python fighter, gun first | 3.60 | base |
| ghost / phantom / ambush | 00:11-01:58 | hide, precomputed low-exposure spots, wait for hunters | 2.67 / 2.96 / 2.81 | no (passivity -0.6 to -0.9) |
| v2 | 02:10 | seek mechs, swap either slot for better weapons | 3.69 | yes |
| v3 | 02:14 | focus weakest, close to 30 m to finish | 3.60 | no |
| v4 | 02:17 | early farming run (first 200 s or 10 cubes) | 3.96, resubmitted unchanged 3.98 | yes |
| v5 / v6 / v7 / v9 / v10 | 03:09-04:37 | farm longer / long supply-drop trips / heal in walled cell / keep gun like house bots / lightning-first upgrades | 3.83 / 3.75 / 3.88 / 3.77 / 3.69 | no |
| v11 | 04:40 | v4 with only the strafe RNG seed changed | 3.71 (noise test: 0.27 from a neutral change) | - |
| v12-v15 | 04:48-05:05 | published third-party controller as a baseline, then compiled | not stated | replaced |
| v16-v17 | 05:39-05:53 | own new brain: arm up, farm, fight at weapon range with strafing, break sight when losing, dodges, quiet walking | v17 5.06 | yes |
| v18 | 05:59 | stronger early economy (ignore far idle mechs while farming, farm drones to 40%, cube memory 150 m) | 5.25 (board 06:00:10) | yes |
| v19 | 06:07 | free-for-all mode that never triggers in practice | 5.25 (identical: practice is deterministic) | yes |
| v20-v22 | 06:41-07:00 | calm early drops / stand still to heal / both | 5.19 / 5.21 / ? | no |
| v24 | 07:18 | candidate-scoring fighter: after 20 s fight anything closing, aiming or weak within 240 m; laser preferred (seek 240 m), laser range 120 m, loot radius 150 m, cubes within 70 m mid-fight; scored fight-position search; losing-rule retreat; FFA latch after 5 ticks of unexplained deaths | 5.27 (board 07:38:43) | yes |
| v26 | 07:48 | opening arm-up, drone self-defence, practice laser range 140 m | 5.33 | yes |
| v28 / v29 | 07:58 / 08:05 | 1 m line-of-sight raster / early exploration + faster failed cover search | 5.29 / ? | yes |
| **v30** | 08:35 | same decisions as a native binary, **full searches every turn** (Python had time-sliced them) | not stated | yes |
| v31 | 08:41 | early farming to 15 cubes | ? | **no** |
| **v32** | 08:56 | **laser-first from the start**, no separate opening, squad laser range 120, lighter target stickiness | ? | yes |
| v33 | 09:21 | close in to finish a weak enemy | ? | **no** |
| **v34** | 09:28 | **hearing**: face unexplained enemy sounds, sidestep unseen laser charges | ? | yes |
| (gap) | 09:28-12:16 | no commits for 2 h 48 min | page chat: "kyoto was at 8th for the last 3-4 hours" | - |
| **v35** | 12:16 | **lethal laser release**: let go of a partial charge that already kills | ? | yes |
| **v36** | 12:40 | **backstab**: prefer targets showing their back, count the x1.5 rear damage in the kill check | ? | yes |
| v37 | 12:44 | supply drops as heal stations | ? | **no** |
| **v38-v40** | 13:25-13:51 | **boost** for jinking in gunfights (energy above 40, not while charging), on every dodge (above 25), whenever threatened and moving (above 30) | ? | yes |
| **v41** | 14:06 | **mobility upgrades** (servos, jets, reactor) right after plating and armor | ? | yes |
| v42 | 14:25 | faster strafe flips (about 0.5 s) | ? | **no** |
| **v43** | 14:34 | **boost while charging the laser under fire** | **6.31** (board 14:38:46) | yes |
| v44-v48 | 14:45-15:46 | boost hysteresis (30/60), then four unlabelled builds | none beat 6.31 | - |

How big each step was is not published after v28. Two inferences, both weak:
- The chat line (15:59 UTC) puts kyoto at 8th for hours before the jump. Board times say the 8th best in 11:00-14:30
  was about 5.6-5.85 (azing 5.96, W squad 5.90, TigerTown27 5.90, 2.3% and whatever 5.85, giddy ~5.83, A-bot 5.81,
  Mahalas 5.75). So v30-v34 (native full searches, laser-first, hearing) probably took it from 5.33 to roughly 5.6-5.85,
  and v35-v43 (lethal release, backstab, boost rules, mobility upgrades, boost while charging) from there to 6.31.
- 6.31 is probably a favourable draw: five later builds (v44-v48, small edits on v43) never beat it, and their own
  test showed a behaviour-neutral change moves the score about 0.25. Treat its true level as about 6.0-6.2.
- Cross-check from the same design family: giddygiddyboy (readable, same practice profile) reached 6.06 with the
  lethal-release threshold as its last change, after it had *removed* the dodge and threat boosts. So the laser
  kill-efficiency changes are the better-supported part of the jump; the boost chain is plausible but unproven.

## 2. Why it scores above 6: the mechanism

Practice score = house bots dead before we die (16 - place), and house bots die almost only to us. In the six squad
runs every death before kyoto's was a kyoto kill (kills 6.0 = score 6.0). All three bots died at about the same
time (mean alive kyoto 96 s, magic 97 s, ours 94 s), when the squad had 7-8 hunters on them. So **time alive is
fixed by the hunter pile-up; the only lever is kills per minute**:

| paired, seeds 1-6 (sim) | kyoto v43 | magic 5.58 | ours (5.02) |
|---|---:|---:|---:|
| score / kills per match | 6.0 / 6.0 | 4.5 / 4.5 | 3.33 / 3.0 |
| kills per minute alive | **3.76** | 2.79 | 1.91 |
| first shot at a mech, median (p25-p75) | 30 s (23-32) | 10 s (0-11) | **59 s** (28-75) |
| first kill, median | 38 s | 30 s | 44 s |
| damage dealt per minute / taken from mechs per minute | 5951 / 1385 | 5147 / 1281 | 3590 / 1394 |
| time-to-kill median (first hit to death) | **4.75 s** | 11.2 s | 5.25 s |
| damage into mechs it did not kill, per match | **852** | 1493 | 1349 |
| laser shots per match / laser damage per match | **11.7 / 3938** | 2.7 / 834 | 4.2 / 1247 |
| laser hit range median (p25-p75) | **91 m** (56-116) | 159 m | 53 m |
| lethal partial laser releases (6 matches) | **16** | 4 | 6 |
| share of time fighting / travelling | 52% / 25% | 61% / 13% | 33% / **44%** |
| share of time boosting | **20%** | 13% | 9% |
| cubes at 60 s (mean) / at death | 6.0 / 14 | 4.6 / 7.5 | 3.2 / 6 |

Reading: kyoto does not survive longer than the others; it converts the same ~95 s into 6 kills because (1) it is
shooting by ~25-30 s, (2) most kills are lasers at 60-115 m with early (partial) releases, so a kill takes under
5 s and little damage is wasted, (3) it keeps moving fast (boost a fifth of the time, also while charging), and (4)
kill cubes snowball (56 of its 84 cube pickups came within 8 s of its own kills).

## 3. Black-box measurements, squad mode (6 matches, seeds 1-6)

Per match: score 6, 8, 2, 6, 7, 7; alive 64, 118, 83, 92, 90, 128 s.

- **Opening.** First crate hit at median 4.8 s (0.2-26.6); crates and drones are farmed only around the route (about
  20% of the first 60 s). It moved a median 160 m from spawn by 30 s (seed 6: 29 m). It does not shoot mechs before
  about 20 s (earliest 14.9 s; median 30 s), which matches v24's "after 20 s in practice" rule.
- **Weapons.** Takes the first weapon it reaches (lightning at 3-5 s in 3 matches), then goes for a laser: gun+laser
  by 24-50 s in 4 of 6 matches, swapping lightning out for the laser (seed 2 at 50 s). End loadouts: gun+laser 4,
  gun+lightning 1, gun only 1 (no pickup found). Kills by weapon: laser 23, lightning 7, gun 6 (of 36).
- **Cubes / upgrades / loadout by 30/60/90/120/180 s** (cubes c, upgrades u; "dead" = already dead):
  s1 4c2u gl, 8c3u gl, dead; s2 4c2u gli, 7c3u gl, 14c4u gl, dead; s3 0c gun, 1c1u gun, dead; s4 3c2u gli, 7c3u gli,
  12c4u gli, dead; s5 4c2u gl, 8c3u gl, 16c5u gl, dead; s6 0c gun, 5c2u gl, 10c4u gl, 22c6u gl, dead.
  None alive at 180 s. Mean 6.0 cubes at 60 s, 13 at 90 s (alive ones).
- **Upgrade order**: first pick armor or plating in 3 of 6 (else jets, nanites, gun rate); then mobility in 4 of 6
  matches (servos twice in three, jets in two, reactor in one; the other two died early with 2-3 upgrades) and laser charge / laser damage where it holds a laser. This is v41.
- **Ranges held** (nearest enemy while fighting): with gun+laser median 92 m (p25 69, p75 109); with gun only 54 m;
  with gun+lightning 35 m. Hit distances: laser 91 m, gun 63 m, lightning 28 m. Gun shots split by range per match:
  52 under 75 m, 25 at 75-100, 11 at 100-130, 17 beyond 130 (hit rate 92 / 78 / 71 / 36%).
- **Movement / energy**: walking 63%, boosting 20%, standing 13%, airborne 2%. Boost starts and stops at a median of
  30 energy: it spends everything above ~30 (the v40 floor; no v44 hysteresis in this build). It boosts in 56% of
  laser-charging frames (46% when hit in the last 2 s), so it moves at 9.8 m/s while charging instead of 5.9 (the
  v43 signature); 32% of frames when hit and moving; only 8% when calm. Movement reversals in fights about 0.8 per s.
- **Laser**: 70 releases, 81% hit a mech, median charge 1.0; 27 partial releases, 16 of them killed (charge 0.52-0.96,
  each exactly the target's remaining HP): it lets go as soon as the partial charge is lethal.
- **Backstab**: only 4% of its damage hit backs (house bots rarely show theirs in the sim); 20% of the damage it took
  hit its own rear.
- **Retreat**: no low-health flight. Moving away from the last attacker at over 3 m/s happens at median 70% HP
  (p25 40%), almost the same HP as when it closes in (median 70%): it kites while shooting. Only 21 of 81
  moving-away samples are under 40% HP. For contrast the 5.58 bot flees at median 30% HP (79 of 107 under 40%).
- **Deaths**: gun hard (110 m), gun expert (94 m), gun hard (39 m), laser hard (125 m), mortar easy (51 m), lightning
  easy (34 m). In 5 of 6 the fatal fight began at 70-100% HP with 3-6 attackers and 7-8 hunters assigned; it scored
  1.7 kills inside the fatal fight. Never stuck, never out of the zone, not looting when it died (one exception).
- **Late zone / last few**: never reached in squad mode (all deaths by 128 s with 8-14 mechs alive; closest zone
  margin 82 m). The late game is only visible in the free-for-all runs below.

## 4. Free-for-all behaviour (extra 6 FFA matches vs house bots, seeds 101-106; plus its commit text)

- Result: places 1, 1, 7, 3, 16, 3 (mean score 10.8; ours on the same seeds 11.3). Noise-level difference.
- **Mode switch is visible.** The first deaths it did not cause came at 14-20 s. In 4 of the 5 matches that lasted past
  25 s its silent share (still, or walking under the 5 m/s step speed) rose from 1-37% before that death to 52-91%
  after (seed 104: 90% before, 65% after; squad mode overall 15%), i.e. it goes silent. This matches v24's latch (5 ticks of unexplained deaths) and the quiet-walk habit since v17.
- **Stand-off.** Nearest enemy at a median 108 m with 7-16 alive and 180-190 m with 3-6 alive; deals damage in only
  9-14% of the time with 5-16 alive and 3% with 3-4 alive (gun 5 shots per minute). With 2 left it engages: damage in 23% of
  the time, 3500 per minute. Zone margin stays large (median 184-247 m; min 31 m).
- **Targets** (v19 rules, carried into v24 as "only cheap fights"): its attackers, anyone within 55 m, mechs under
  50% HP, mechs facing away, mechs it out-cubes by 3, and anyone once 4 or fewer are left. It takes cover from a
  visible mech it chose not to fight, peeks around cover, and holds a low-exposure spot inside the next circle.
- Kills per FFA match 1.3 (8 kills: gun 3, lightning 1, laser 4); rear share of its damage 13% (FFA bots do show
  backs). Boost floor and boost-while-charging persist (66% of charging frames).
- Real showdowns (KennethLei1492 commit bodies, 15:54 and 16:32 UTC, recorded hourly matches): kyoto, giddygiddyboy and
  Antalos end 40-100% of showdowns with only the starting gun and move only 13-54 m from spawn in the first 30 s,
  farming nearby crates and drones (a cube within 10 s) and taking plating at once. A spectator who recorded 60+
  matches says the practice leader usually places about 3rd in the hourly matches, rarely 1st.

## 5. Lessons for our practice play (ranked; what to adopt and the evidence)

1. **Shoot from about 20 s; cut the farm-first opening to what lies on the way.** Our first mech shot is at a median
   59 s against kyoto's 30 s; we travel 44% of the time (kyoto 25%). Death time is set by the hunter pile-up (~95 s
   for all three bots), so every idle opening second is lost kill time. Kyoto's own official tests agree in
   direction: farm longer -0.13 (v5), farming to 15 cubes discarded (v31), long drop trips -0.21 (v6). Caveat: our
   full build (with farm-first) beat our core build by 0.12 officially, which is noise; test this as one change.
2. **Laser as the main killer at 70-110 m, with lethal partial release.** Kyoto: laser 64% of kills, hits at a median
   91 m, 11.7 shots per match, 16 lethal partial releases; ours: laser hits at 53 m, 4.2 shots per match. Go for the
   laser early (kyoto has it by 24-50 s; v32 laser-first was kept) and hold 70-110 m with gun+laser. Official support:
   giddygiddyboy's last change (release the partial charge earlier, at 70% instead of 90% of the target's HP) is the
   build that scored 6.06; kyoto kept v35 and v36. Count the x1.5 rear multiplier in the lethal check.
3. **Spend energy above ~30 on boost when threatened, dodging, or charging under fire; take servos/jets/reactor after
   plating/armor.** Kyoto boosts 20% of the time, from ~30 energy, and in 56% of its charging frames (9.8 vs 5.9 m/s
   while charging). We boost 9% of the time and only from ~100 energy (start median 100). Evidence: kyoto kept every
   boost rule (v38-v41, v43) and got 6.31 on the last one; against it, giddy removed dodge/threat boosts and still
   made 6.06. Medium confidence; test as one change on top of item 2.
4. **Kill-fed economy: collect the victim's cube pile at once.** 56 of 84 kyoto cubes were picked up within 8 s of its
   own kills (ours 23 of 36), giving 13 cubes by 90 s without long farming trips. Keep the mid-fight cube grab
   (kyoto v24: cubes within 70 m mid-fight).
5. **Do not flee early, finish what you start.** Kyoto's fatal fights start at 70-100% HP and it kites at mid HP
   instead of running at low HP; its time-to-kill is 4.75 s and only 852 damage per match goes into mechs it did not
   kill (ours 1349). Closing in to finish was tested and dropped (v3, v33): finish from range with the laser instead.

Also from its log (official, one change each): hiding and passivity lost 0.6-0.9 (ghost, phantom, ambush); healing
in a walled cell -0.08; keeping the gun like house bots -0.21; lightning-first upgrades -0.29; faster strafe flips
discarded. A free-for-all latch that never fires in practice scored identically (v18 = v19 = 5.25), which is the
identity check we can use for FFA-only changes.

On "would Rust help": kyoto's v30 rebuild as native code was "same decisions, full searches every turn", i.e. it
removed Python's per-turn search truncation; it was kept but its score is not published. Our bot answers in 12-14 ms
worst case under the 1-CPU limit, so a rewrite only pays if some planner of ours cuts its search for time. Check
that first; do not port.

## 6. Counters in the final (observable signatures and responses)

Signatures (any one is suggestive, three together identify it):
- after the first deaths, a mech that goes silent (still or under 5 m/s; no step sounds) and keeps 110-190 m away;
- `charging: true` on a mech that is moving fast (boosting while charging, about 9.8 m/s), with frequent `boost`
  sounds rather than `step` sounds from one bearing;
- partial-charge beams that land exactly when the target's HP is low; long-range laser at 90-120 m;
- loadout gun+laser (in real showdowns often gun only), mobility upgrades, many cubes if it got kills early.

Responses:
1. **Never be a cheap target.** It engages attackers, anything within 55 m, mechs under 50% HP, mechs facing away
   and mechs it out-cubes by 3. Inside its view: face it (our back costs x1.5 and enters its kill check), keep over
   55 m, and leave its sight line before we fall under 50%.
2. **Respect the early release.** When it shows `charging: true` aimed at us and our HP is under about 350, expect the
   shot at once, not at full charge: sidestep across its aim or break line of sight on the first charging frame.
3. **Do not fight in its view.** It is a vulture: whoever is weakened near it is its next target. Fight other mechs
   only with a building between us and it; conversely a damaged third party in its view pulls it into a fight we
   do not have to join (it will not chase a healthy, distant, front-facing mech).
4. **Endgame (4 or fewer left)**: it engages anyone and is strongest at 70-120 m with the laser. Deny that range:
   approach under cover to under 40 m or stay beyond its sight; its boost reserve floor is ~30 energy, so right
   after a boost burst it cannot sprint again; zone shrinks force it out of its low-exposure home, catch it in
   the open then.
5. **Hearing**: it turns toward sounds it cannot explain and sidesteps laser charges it hears but cannot see. Do not
   rely on charging a laser out of its view as an ambush; open with the gun or charge from cover edge already in view.

## 7. Files

- Roster entry: `/srv/mech-sparring/kyoto_v43_6726533/pilot`, `/srv/mech-sparring/_cmd/kyoto_v43_6726533`.
- Runs: `tools/top5/kyoto_runs/kyoto43_s1-6.json`, `magic558_s1-6.json`, `ours_s1-6.json`, `kyoto43_ffa101-106.json`,
  `ours_ffa101-106.json`, traces in `trace/`, sandbox stderr in `logs/`, summaries `probe_squad.txt`, `probe_ffa.txt`,
  `analyze3.json`.
- Scripts: `tools/top5/kyoto_probe.js` (opening, economy timeline, ranges, retreat HP, boost, laser, deaths),
  `kyoto_late.js` (behaviour by number alive), `kyoto_extra.js` (rear shares, charging speed, partial releases).
