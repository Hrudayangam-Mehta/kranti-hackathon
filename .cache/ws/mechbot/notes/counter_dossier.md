# Counter dossier: every top team, the families behind them, archetypes, lessons, safe free-for-all rules

Status: **final, review applied.** Drafted 21 Nov 2026 07:30-07:45 UTC; finalised 07:55-08:20 UTC against the
sceptic's review `notes/counter_dossier_review.md` (07:40-07:55). Section 6 lists what changed and what was
rejected. Board: `../web/mech_leaderboard_now.json`. The draft used the 07:15 board; the file was refreshed at
07:51 and ranks below are the 07:51 ones (moves since 07:15 are marked "07:51").
Sources: every `notes/intel/top_*.md` (14 studies), `top10_name_map.md`, `top_new_map.md` (07:37),
`showdown_profiles.md`, `redteam_final.md`, `redteam_practice.md` (latch row), `measured_deltas.md`,
`counters_hookup.md` (07:37), DOCTRINE V4 (top of `BRAIN_SPEC_V2.md`), `kit/protocol.md`, `notes/hello_example.json`
(upgrade numbers). `bot/lib/counters.js` is described here through the hookup note and the review (07:36 version).
**New-entrant behaviour studies: none in `notes/intel/` at 08:05 UTC** (last file there 07:24). So 2696,
benchmaster, giddygiddyboy, sonion, kyoto-max, Huss Huss Husss, Hacktoolz and Team Inventors stay **pending for
behaviour**; their identity and lineage come from `top_new_map.md` and the review. Clean-room: built only from our
own studies; `P/intel` was not opened (the identity re-checks are the sceptic's; none was redone here, so the
best times posted after 07:15 are unmapped).

Grades: [S] several teams, [T] a top bot's own choice, [1] one team's official A/B (bundle noted), [rec] recorded
real free-for-alls, [code] read from source, [model] our arithmetic, [C] contested, [N] none. Numbers are rules'
or studies' numbers; every "gain" in the studies is analytical, none measured on our bot.

Common physics used below (rules / kit): laser = 0.75 s charge + 1.65 s cooldown = 2.4 s cycle, 315 per beam at
0 cubes (+4% per cube), rear hits x1.5 (472); a started charge is discharged by the server at 2.75 s; gun 12
rounds in about 2.9 s then 2.4 s reload; vision = 120 degree wedge on the torso to 200 m plus 45 m all round;
the server lists a mech for 5 s after sight is lost; sounds: beam 380 m, gun 320 m, charge 140 m; walk 11.7 m/s,
boost 19.5 m/s, half speed while charging (and no boost while charging, A-bot study).
**Upgrades move these numbers and are invisible except plating (it shows in `max_hp`).** Offers come at 1, 3, 6,
10, 15, 21 cubes, and a mech never loses cubes while alive, so its cube count bounds what it can hold. Fast
capacitors (`laser_charge` x0.75, max 2): full charge 0.56 s with one stack, 0.42 s with two (possible from 3
cubes). Sensors (max 2): all-round awareness 60 / 75 m, vision 225 / 250 m. Gyros (max 2): turn rate x1.3 / x1.69.
Every mech regenerates 45 HP/s after 5 s without dealing or taking damage (not outside the zone), so "healing" is
a state, not a style. Every fixed distance and timing below is a lower bound against an upgraded mech.

## 1. Team table (07:51 board; the 07:15 top 16 plus Kanyaraasi, which entered it at 07:49, plus studied teams)

| # | Team (score) | Repo | Identity | Lineage | Play style (one line) | Two biggest limitations | Signature (observable) | Best counter |
|---:|---|---|---|---|---|---|---|---|
| 1 | 2696 (5.60, 06:58) | code: shaunkar1/proj1, profile f75kite `4374077` (content unread); the team's own repo not found | likely (its 4.96 and 5.42 repeat proj1's documented scores in the same order; three f75kite variants were pushed 2.6 min after its 5.60) | **proj1 / "paw" (TigerTown27's Go bot), not MAGIC** | Behaviour study pending. By code family: the TigerTown27 row (the free-for-all posture is the same code; proj1's profiles are practice "squad profiles") | as TigerTown27 | as TigerTown27: full turn in the first 1.7 s, then a +-109 deg sweep every 5.7 s; gun + laser, never L+Z; holds fire at us at 100-200 m | proj1 set (section 2): stay non-hostile (C2); finish only on its 35% retreat (C1); laser only in its blind or disarmed windows (C3); keep our laser undischarged near it (C9); drop overwatch (C7) |
| 2 | A-bot LLC (5.58) | Kgc3105/MAGIC-Royale @ 53f6854 | confirmed (own "submitted-5.58" tag) | own TypeScript (MAGIC family) | Practice: laser kiter 125-185 m that fights on until 6 hunters; FFA after 3 foreign deaths: cover-sitter with a 120 m engagement bubble. **Recorded (older builds): 10 appearances in the 11 proj1 showdown recordings, 6.0 points a match** (the A-bot study's "no record" is superseded) | (1) laser tunnel: full-charge-only release, a started charge is held to the 2.75 s forced discharge at half speed, no new charge more than 1.5 s after losing the line; (2) endgame pin: from 325 s stands on the next centre with hiding off, from 390 s no dodging | gun always + laser, never airborne, 5.85 m/s while the flag is up, idle torso turning CCW about 200 deg/s beside a wall; after the switch turns away without firing when it sees us beyond 120 m | beam-clock corner peek with an off-axis charge (study C2+C3, with section 5 rule 1's hide budget); after its switch pass at 130 m+ or behind hard cover (C1) |
| 3 | scorpion (5.58, 05:17) | MAGIC code suspected; own repo not found | **medium** (tie 5 min 10 s after MAGIC `e39579f` "Restore the 5.58 settings"; ties are weak evidence: scores are multiples of 1/48 and 5.42, 5.31, 5.27 are each held by three teams; this repo's timing also yields coincidences: scorpion's 4.21 came 4 min after `e0ba5cf`, which officially scored 5.35) | MAGIC (medium) | as A-bot LLC if it is MAGIC | as A-bot LLC | check the A-bot signature (never airborne, 5.85 m/s while charging, CCW idle turn) before using A-bot counters | archetype read until the signature confirms; plan for one or two MAGIC copies in the final (none has appeared since 05:11) |
| 4 | giddygiddyboy (5.54 at 07:37, 07:51; 5.35 at 06:55) | weak: proj1 family (its 4.96 then 5.31 is proj1's documented sequence, but no proj1 commit within 6 min) or devakchow/team-kanyaraasi-mech-royale (commits 201-229 s before its first three times); the 07:37 best is unmapped | weak | proj1 or TTUN | pending | pending | look for the proj1 sweep (section 2) or the TTUN signature | archetype read only; proj1 set if the sweep shows, TTUN set if TTUN shows |
| 5 | AT (5.52) | not found | - | unknown | No FFA mode: spinning laser + lightning chaser that fires in the first second and snowballs or dies early (11 recordings: 2 wins, 5 deaths inside 22 s; 7.1 points a match) | (1) straight constant-speed walks to pickups under fire with no reply; (2) no answer to lasers (66% of beams at it hit), chases to 45 m regardless of third parties | torso yaw +0.40 rad per decision CCW for 1 s+ (0.52 / 0.68 rad with gyros); laser + lightning, gun dropped (6-60 s); flag 0.7-0.9 s; closes 5-13 m/s inside 100 m | never be its nearest visible mech; reach a hide cell within 2.4 s of its first beam (AT study A1); rear-arc release while it spins (AT A2) |
| 6 | benchmaster (5.50 at 07:21, 07:51; 5.42 at 06:15) | code: proj1 profile farm10t75 (`a53c31a`, 231 s before the 5.42, or `b116ee0`); the 07:21 best is unmapped | likely as code, weak as identity | proj1 | Behaviour study pending. By code family: the TigerTown27 row | as TigerTown27 | as TigerTown27 | proj1 set (C2, C1, C3, C9, C7) |
| 7 | TigerTown27 (5.42, 06:00) | shaunkar1/proj1; 5.42 likely `b116ee0` (profile farm10t75: no fights until 10 cubes or 75 s; pushed 05:11:53); 5.31 = `a178c88` | confirmed (repo) / build likely | own Go ("paw"); head of the proj1 cluster | Practice: no fights until the farm gate (6 cubes / 75 s in a178c88, 10 cubes or 75 s in farm10t75), then attack on sight inside 160 m. FFA from the first foreign death: hostile-only, time-to-kill fight test, flees mechs twice as strong, steps out only in the 1.5 s after a laser fired. **Recorded FFA (older builds): places 1, 1, 2, 3, 5, 5, 7, 11, 12, 14 = 9.9 points a match, the best of all studied bots (3rd of 24 teams with 4+ matches)** | (1) never opens on a non-hostile mech (hit first in 7 of 10 openings) and dies to beams (7 of 8 deaths); (2) blind arcs: 5.7 s sweep; with a hidden target the torso is locked, 240 deg unwatched; retreat watches only its last attacker; unseen attackers are never shot back | full turn in the first 1.7 s, then +-109 deg sweep with a 5.7 s period; gun + laser, never L+Z; stops 14-15 m from crates; ~100 m from gun(+laser) mechs, ~55 m from L+Z | C2 keep our torso off it (it stays non-hostile); C1 second-attacker finish on its 35% retreat; C3, C9, C7 (section 2) |
| 8 | tigerbyte (5.33) | not found (proj1 refuted) | - | unknown | Recorded (weak): gun only, pushes toward an attacker, then stands still repairing 30-60 s; a later image motionless 68% of its life; 6.8 points a match in 6 recordings | (1) gun only, out-ranged (4 of 6 deaths to lasers at 58-151 m); (2) long stationary repairs | gun only after 20 s, few cubes, motionless or jiggling with a 4 rad/s spin | laser from a corner at 130-200 m, keep 130 m+ when it advances (T1); pass beyond 120 m while it sits (T2) |
| 9 | Kanyaraasi (5.31 at 07:49; 5.19 at 05:05) | devakchow/team-kanyaraasi-mech-royale (5.19 = `83e4c93`); the 07:49 build is unread | confirmed (5.19) / 5.31 unmapped | TTUN, byte-identical to r1ver af337d5 at 5.19 | 5.19 build: Wolverines 5.19 controller unchanged in fights; no FFA mode. The 5.31 build is unread (its README called the later builds unscored experiments) | (1) third-party blindness; (2) straight unstrafed cube walks and farming stops | identical to TTUN 5.19; keeps shooting after the 2nd foreign death | blind-side third party (counter 1), under D11's gate |
| 10 | BobBuildIt (5.27) | not found | - | unknown | No FFA mode: gun + laser trader that accepts every duel at 90-140 m in the open; dead in all 10 recordings (mean life 66 s; 7.2 points a match) | (1) symmetric open duels, 79% of beams at it hit; (2) early laser release (median 0.60 s, 10th percentile 0.30 s; 61% of its beams hit, 1 of 13 hits beyond 150 m) | gun opens 120-200 m within 1 s of sight; no spin; **flag-to-beam median 0.60 s (half its releases come at 0.60 s or later)**; backs away at 7 m/s inside 70 m | full-charge beams from cover at 150-190 m, exposed 0.6 s at most, in its reload (B1) |
| 11 | r1ver (5.27) | moonriver0922/mech-royale-planner (= wgsrobot); 5.27 = `818232c` | confirmed / build likely | TTUN fork | TTUN shoot-on-sight strafer that also farms mid-fight when its target is beyond 105 m | (1) turns its back on a live fight for a crate/drone stop at 25 m; (2) torso slaved to its target: third parties unseen, undodged | TTUN signature + a mid-fight crate stop at 25 m while another mech is 105-230 m away | punish the crate stop from 110-150 m (C1; it is mid-fight, so A7's "fired at a mech in the last 30 s" gate is met); blind-side third party under D11 |
| 12 | sonion (5.27, 07:12) | none found; its 5.27 equals r1ver's public `818232c` (public since 06:45:46) | weak / none | possibly r1ver's TTUN derivative | pending | pending | look for the TTUN signature and r1ver's 25 m mid-fight crate stop | archetype read only (TTUN set if the signature shows) |
| 13 | kyoto-max (5.27 at 07:38; 5.25 at 06:00) | kyoto-max/Mech_Royale; **5.25 = `8241a6c` v18** (05:59:10, 60 s before; the next commit texts say "On top of v18 (5.25)" and "v19 5.25"); the 07:38 best is unmapped | **confirmed** (5.25) | own: v1-v11 own Python (3.6-3.98), v12-v15 a published controller, v16-v17 a new own brain ("no third-party code", 5.06), v18 a stronger early economy; compiled `.pyc` only since v15. **v19 `21bc4fd` adds a free-for-all-only mode** (also 5.25); v20 5.19, v21 5.21, v22 (07:00) unscored. The roster's "v15 = 5.19" is unsupported (no commit within 6 min of the 05:36 entry) | pending (v18: for the first 200 s and under 10 cubes it ignores far idle mechs, farms drones lower, revisits remembered cubes; its published A/Bs: hiding lost, early farming +0.27) | pending | pending | archetype read only; expect a dedicated FFA mode (v19 and later) |
| 14 | Huss Huss Husss (5.23, 05:49) | weak, timing only: praggybhat/mech-royale-bot v6 `2721c5f` (46 s before; a laser/lightning-first build; the repo states no score and names no team) | weak | own Python (if mapped) | pending | pending | pending | archetype read only |
| 15 | Hacktoolz (5.23, 06:32) | none | - | - | pending | pending | pending | archetype read only |
| 16 | Wolverines (5.21) | varchaskukreja/TTUN; 5.21 = `ae1b122` | confirmed / build likely | TTUN (origin) | Shoot-on-sight strafer (gun 70 m, laser 110 m, lightning 28 m) except a quiet phase: after 2 foreign deaths and while more than 6 live it never fires at mechs | (1) blind to third parties (wedge slaved to target); (2) the harmless phase: flees only inside 150 m, does not return fire, then turns hostile at 6 alive with all it farmed | gun always, never L+Z; full spin for 3 s at spawn; 12-round bursts to 230 m; 95-125 m with laser; in the quiet phase a gun carrier that faces us when hit but does not shoot | be behind cover from it before the 7th death; harvest its quiet phase only under the gates of A6 (its look overlaps proj1's: gun + laser holding fire) |
| 17 | not even close (5.21, 07:06; 16th at 07:15, 17th at 07:51) | Th3r0n/mech-royale-bot; 5.21 = v20 `75aa5e3` (or one of six salted copies, 21 s before) | confirmed / build likely | TTUN re-implementation (own nav) | TTUN core with a 145 m laser band and a 4 s jump-and-jet opening; FFA after 2 foreign deaths: flees laser carriers when laser-less. v20 changes only practice retreat (0.3 x TTUN thresholds; FFA keeps them), so its free-for-all play is as studied | (1) blind to third parties on 130-160 m duels; (2) zone-blind 145 m stand-off, pushed out of the circle from about 299 s | rises about 10 m/s for up to 4 s at spawn (apex ~40 m); 130-160 m with a laser | spawn tag (C1), then laser-release denial at the corner (C2); third-party its long duel from 70-110 m (C3, under D11) |
| 19 | Mahalas (5.15) | chriseco427-spec/CyprusBot @ d67b21c | medium-high (3 of 3 best times within 4 min, plus the name link) | own Rust ("quietstorm") | Practice brawler on a 55 m ring that never retreats, active from 8 s until the first foreign death; then hide-first, fighting only a lone weaker hostile (1.3x power), prey or a finish | (1) clockwork laser and boost (both fingerprintable); (2) zone outranks hiding: from about 378 s it stands on the exact final centre | boost exactly while t mod 4.833 s is in 0.23-2.18 s; idle aim = heading + 1.5 sin(1.4 t); 55 m ring, reversals 0.45-0.95 s | fingerprint it and let the hider go (K1); final-centre kill zone (K4); shoot its steady flee legs once it is hostile or finishable (K3) |
| 20 | Team Inventors (5.15, 06:58) | **none** (the rohaanafzal/mech-bot lead is dropped: only 2 of its 4 best times match, `94c9565` is also 5.4 min before 2696's 06:58:15, and the other +45 s match the 314 study cites is now mapped to Jiackary) | none | - | pending; do not expect kestrel practice signatures | pending | pending | archetype read only |
| 21 | BackwardsDeployeds (5.10, 06:01) | brycehcmcgrath/mechfight-bot; 5.10 = release r5 `200f59c` (only the compiled wrapper changes between releases; 5.06 = 9c9801e) | confirmed / build likely | Lance controller compiled under its own wrapper | Shoots on sight; 110 m with laser, rushes to 28 m inside 60 m with lightning; hides at 38%; no FFA detector read | (1) one beam (275 in 2.5 s) or an unseen hit breaks its fight; (2) stationary heal at 38% for 12-15 s behind a cell chosen against 3 threats | L+Z (5.06 maybe gun + laser); flag almost at once on any line; 110 m; idle spin 3.5 rad/s; snaps to a damage bearing and stops firing | keep 70 m+ (60 m disc) when it lists lightning (C1); beam-clock corner peek (C2) |
| 22 | RN SUS (5.08, 06:14; newer build unread) | JosiahAklog/nexus-mech-royale (4.96 = V28.1) | high | own Python ("NEXUS") | Farm-first explorer that fights back hard when hit (75 m laser orbit, 47 m gun), retreats at about 60% and heals to 91% holding fire | (1) 125 m threat horizon: while healing it never answers a shooter beyond 125 m; (2) stands still to repair in the open | sideways reversals exactly at multiples of 2.7 s of match time; 75 m (laser) / 47 m (gun); repair standstill with hp rising; 13-16 m crate stops | snipe the repair standstill from 130-260 m (K1) once it is hostile or at 40% or less; free beams when it turns to run (K2) |
| 27 | ImagineLosing (5.04) | prakash-218/buildathon-mech (v5 = 14b39db, 85 s before its best; head v8) | likely | own Go ("osu-mech") | Shoots on sight from second 0; fights to the death (v5); v7/v8 flee in straight boosted lines and hide to reload. Its best never moved after v6-v8, so the final may run v8: read it as A5 (v5) or A8 + A1 (v8) | (1) one centre ray gates every weapon and no reaction to attackers that are not its target; (2) straight mid-fight walks to a laser/lightning up to 140 m | perpendicular jitter 0.4-1.2 s; gun 80 m, laser 100-165 m; sprints sideways while our flag aims within 8 m | rear-quarter third party and target hand-off (C1); kill it on its weapon walk (C3) |
| 28 | 404 Competition Not Found (5.02) | davidvarvas/mech-royale-bot (D1 = 7e86f21) | high | own Python ("survivor") | Calm 60 m gun + laser brawler; never starts on a healthy armed mech that is not aiming at it; no FFA mode | (1) retreat pinned by sustained fire (needs a 0.6 s damage gap); (2) rear-blind in duels; no laser charge with a lightning carrier inside 49.5 m | gun + one special, never mortar; 45-75 m; reversals ~1.6 s; boosts only right after a hit; lets healthy non-aimers pass | calm pass (K2); pin it under 40% with a hit every 0.5 s (K3); third party from behind (K1) |
| 33 | 314159265 (4.92, 02:10) | AbhirajTiwari12/mech-royale-bot (G3 = 8671068) | medium (the only board row within 2 s of any of its 53 commits, but some commit lands in a random 2 s window about 25% of the time) | own Python ("kestrel"); its practice brain is copied by rohaanafzal/mech-bot | Practice: 40 s hostile-only, then a no-retreat 45 m brawler. FFA after 1 foreign death (<60 s): skittish roof climber | (1) long undodged legs, waits up to 6 s at a wall base then jets up at <= 10 m/s; (2) breaks off from any mech within 150 m, so non-hostile mechs get free side shots | turns away within 1 s when a mech comes inside 150 m; wall-base wait then vertical jet; FFA loadout L+Z; 41% boosting | beam it at the wall base or on its straight legs once it is hostile or finishable (C1, C3); herd it at 120-145 m (C2) |

**The cut.** At 07:15 314159265 was 31st, inside the 32 qualifying places (tied at 4.92 with 32nd and 33rd, ahead on
the earlier time), not below the cut as the draft said. At 07:51 it is 33rd and outside (32nd = Hachimi 4.96); it
has not committed since 04:05, so it will probably miss the final unless it resubmits. Keep its counters for the
case it does.

**Not studied, inside the 07:51 cut (nine seats):** poteto 5.17 (18th), Hidden Test Cases 5.08, Eagle Eye 5.06
(shanmukha-here/eagle-eye-mech-royale, by-catch), Team Elektros 5.06, Tark305 5.06, ManiFest 5.02, who dey 5.02,
Hackermen 4.98, Hachimi 4.96 (32nd). Just outside: 314159265, "today is yesterday's tomorrow" and WolfieHacks
(all 4.92). With the eight pending new entrants, 17 of 32 seats have no behaviour study; the section 5 rules and
the archetype read are the only defence there.

## 2. Lineage clusters (one counter set covers several teams)

| Cluster | Members on the board | What is shared | Tell the members apart | Counter set |
|---|---|---|---|---|
| **proj1 / "paw"** (shaunkar1/proj1, Go) | TigerTown27 (confirmed, 5.42), 2696 (likely, 5.60, f75kite), benchmaster (likely as code, 5.50), giddygiddyboy (weak, 5.54). **Up to four finalist seats: up to four of the top seven at 07:51** | FFA posture from the first death it did not cause (before 20 s it already plays FFA rules; past 20 s with no foreign death it believes it is in practice, limitation 9). Hostile-only: it opens fire only on a mech that kept its torso on it (about 7 deg, 0.6 s, line inside 260 m; two decisions while charging), came within 30 m, damaged it (hostile for 25 s), or is under 40% within 150 m while it is above 60%. Time-to-kill fight test (1.5x margin with 2+ hostiles). Ranges about 100 m against gun or gun + laser, about 55 m against L+Z, 28-30 m only with its own lightning. Avoids "much stronger" mechs (hp x damage rate over 2x its own within 300 m): breaks the line, boosts within 170 m, drops loot within 160 m. Laser caution: hides from any laser that could fire within 0.85 s and steps out only in the ~1.5 s after it fired; assumes a 0.45 s charge for carriers with 3+ cubes. Retreat at 35% under fire until 80% (55% if unseen for 6 s), holds fire while hidden, watches only its last attacker, about 19 s to return. Unseen attackers are never shot back (limitation 14). Gun + laser, never L+Z, never mortar; plating first, laser charge 4th. Stops 14-15 m from crates and one-shots them with the laser when alone; walks to any drop within 25 s and stands inside 2 m for the 4 s capture. Recorded FFA (older builds): 9.9 points a match, 7 of 8 deaths by laser at 53-195 m, hit first in 7 of 10 openings | Members cannot be told apart in a free-for-all: same code, and as far as read the profiles change only the practice farm gate (f75kite is unread). Tell proj1 from look-alikes: full torso turn at 4 rad/s in the first 1.7-2 s, then a +-109 deg sweep of its walking direction with a 5.7 s period, pitch level; holds fire at 100-200 m while holding a laser | **C2** stay non-hostile: our torso never within 0.15 rad of it for more than 0.3 s in any 1.2 s, never while our laser charges; pass no closer than 35 m; do not damage it; never in its sight inside 160 m below 45% hp (under 40% inside 150 m it attacks). **C1** second-attacker finish only on its retreat at 40% or less: 60-150 m, 60+ deg off its torso, beyond 45 m, off the line to its foe; off-axis charge, swing on, release, gun, second beam 2.4 s later. **C3** laser only in its blind or disarmed windows and only on a target we already want (C1, or it is hostile to us): its laser fired or stopped charging in the last 1.5 s; its torso 60+ deg off our bearing and we are beyond 45 m; zone run; crate stop. Never fire at it while it waits behind a corner facing us and our laser is ready. **C9** keep our laser undischarged near it when we want quiet: with a proj1 copy behind cover within 285 m and a line to us, farm with the gun; a discharged laser invites its 1.5 s peek with a charged laser, and firing at a third mech near it hands it that window. **C7** overwatch drops from 100-190 m with an off-axis charge. Observe-then-exploit only: C6 (show strength to push it off loot), C4 (no dodgeable gun beyond 80 m). **Never** a harvest, a first strike or a no-return probe on a healthy proj1: any first hit makes the best free-for-all family hostile for 25 s |
| TTUN = the 5.19 bot (Wolverines v8-econ `b7e9a6d`) | Wolverines (ae1b122, 5.21), Kanyaraasi (5.19 = byte-identical r1ver files; 5.31 build unread), r1ver (818232c, 5.27), not even close (re-implementation, 5.21), sonion (weak, if it runs r1ver's 818232c); giddygiddyboy's alternative mapping. Up to five or six finalists. Copies fight each other on sight | Target = nearest + health weighting, from second 0, any range; bands 70 m gun / 110 m laser (NEC 145) / 28 m lightning with a 15 m dead band; strafe 0.9 with the side re-drawn by coin flip every 0.35-1.05 s (**real reversals about every 1.4 s**); closes at 8.7 m/s; torso and wedge slaved to its target; gun fires to 230 m on a first-order lead, 12 rounds then 2.4 s; laser charged on sight, full charge only, carried to the forced discharge if the line breaks; retreat on sightings (35% one-on-one vs a healthier target, 55% with 2 in view, 80% with 3); heal only with nobody seen for 4 s, exits at 55%; cube walks mid-fight within 70/40/12 m; stands 30 m from crates, 38 m from drones, in drop rings; zone ignored in a fight until outside; gun always, never L+Z; plating first | Wolverines ae1b122: quiet between the 2nd foreign death and 6 alive. r1ver: mid-fight crate stop at 25 m. NEC: 4 s spawn hop, 130-160 m laser band, after its latch flees laser carriers when it has no laser (v20 changes practice retreat only). Kanyaraasi 5.19: none of these | (a) blind-side third party under D11's gate (busy 1.5 s and under half hp): >75 deg (100+ for x1.5) off its aim, 60-110 m (laser to 150 m), never inside 45 m (60 / 75 m with 1-2 / 3+ cubes), cover within 6 m, leave when its aim comes within 0.5 rad or its target drops under 15% [WV C2, KY 1, NEC C3]; (b) corner duel on its magazine (peek in the 2.4 s after round 12) and on its laser (it fires into the wall 2.75 s after the flag; peek in the next 1.6 s) [WV C4, NEC C2]; (c) 9 s sight break (5 s server + 4 s walk to our last point), relocate 20 m before second 5 [WV C7, r1ver C2]; (d) shoot its straight cube walks, farming stops and drop-ring stands once it is hostile to us or busy in a fight [WV C3, NEC C6, r1ver C1]; (e) hold hard cover near the centre in small circles: its laser band pushes it out from about 299-314 s [WV C5, NEC C4]; (f) walk away from its lightning (8.7 m/s closing never reaches 44 m from 50 m) [WV C6]; (g) ae1b122 only: its quiet-phase harvest (WV C1) is gated as A6 (target 40% or less), because its quiet look (gun + laser, holding fire) is also proj1's |
| MAGIC = the 5.58 bot (Kgc3105/MAGIC-Royale `53f6854`) | A-bot LLC (confirmed), scorpion (medium). 2696 is **not** MAGIC (proj1). No MAGIC copy has appeared since 05:11; plan for one or two | Practice kiting 125-185 m with gun + laser; full-charge-only laser with a 1.5 s re-charge window; break-off at 40% / 2 enemies under 50% / 6+ enemies; silent repair; ground only; FFA latch at 3 foreign deaths into a hide-first cover-sitter with a 120 m bubble that still farms at 90%+. Recorded FFA (older builds): A-bot LLC 6.0 points a match in 10 appearances | Never airborne; 5.85 m/s while charging; steps out of our line when our flag is on and aimed within 0.3 rad; CCW idle turn ~200 deg/s | respect the 120 m bubble after the switch; beam clock (hide within the rule 1 budget of its flag; peek 2.9 s after a seen flag or 4.3 s after leaving its line, then 0.6 s only); charge 0.35-0.45 rad off-axis; break contact (it forgets after 3 s unlisted + 5 s); flank its 12 s stare; gate its zone runs; centre pin from 325 s; drop denial (it steps out of the ring when hit) [AB C1-C8] |
| Lance (LanceHuang245 `171bc06`, 4.75) | BackwardsDeployeds (5.10); formerly Kanyaraasi 4.77, 404 B0/B1 (withdrawn), r1ver's Python line, NEC's v9-v11 core | Shoots on sight; 110 m with laser, 85 m gun only, 28 m with lightning (switches at 60 m when holding L+Z); drops the gun once it holds both specials; hides at 38% (to 80%), at 3+ threats, at 275 damage in 2.5 s or any unseen hit; centre-only aim; drone hits count as an unseen attacker | Snap to a damage bearing that stops its fire; long strafe legs 1.0-2.6 s (or 0.35-0.9 s in the 5.06 wrapper) | 60 m disc around a lightning holder, band 65-80 m [BD C1]; beam-clock peek [BD C2]; blind-side third party from 90-150 m under D11 [BD C4]; flank finish on the 38% stationary healer [BD C5]; drone window [BD C8]. Hull-down cells: [C] (BD C3 says best trade; the ImagineLosing scan found one within 20 m in only 0-2.4% of duels) |
| kestrel (314159265 G3 / EC10-K) | 314159265 (4.92; 31st at 07:15, 33rd and outside the cut at 07:51); rohaanafzal/mech-bot uses the EC10-K practice brain with its own FFA brain but has no board identity (the Team Inventors lead is dropped) | 40 s hostile-only opening, 45 m gun + laser ring, no retreat, prey rush to 20 m on a target under 320 hp | 314159265 itself turns skittish after its latch | corner freeze punish (C4); prey-rush ambush when we are low (C5); FFA: wall-base beam, herd, steady legs once hostile or finishable (C1-C3) |
| Singletons (own code) | AT, tigerbyte, BobBuildIt, Mahalas, RN SUS, ImagineLosing, 404, kyoto-max (own brain, confirmed), Huss Huss Husss (weak) | - | - | per row in section 1 |
| Unmapped | Hacktoolz, Team Inventors, and the nine unstudied seats | - | - | archetype read (section 3) and the section 5 rules |

**Threat order for the final** (seats times recorded free-for-all strength; recordings are of older builds, from
the 11 showdowns in the TigerTown27 study and S4 in `showdown_profiles.md`):
1. **proj1, up to 4 seats**, 9.9 points a match, the best recorded family. Dangerous mainly once hostile: C2 keeps
   it neutral, and the gates in sections 3 and 5 keep our own first shots off it while it is healthy.
2. **TTUN, up to 5-6 seats**, Wolverines about 6th of 16 on average (S4). Shoot-on-sight, third-party blind.
3. BobBuildIt 7.2, AT 7.1, tigerbyte 6.8 points a match (one seat each).
4. **MAGIC, 1-2 seats**, A-bot LLC 6.0 points a match in 10 appearances: hide-first after its switch, so it rarely
   starts fights, but it is the strongest practice bot and may have improved since those builds.
5. Lance (BackwardsDeployeds), the other singletons, kestrel (out of the cut unless it resubmits).

Two cross-cluster facts: (1) the full-charge-only laser with a forced discharge at 2.75 s is shared by MAGIC,
TTUN, Lance, ImagineLosing, NEC and proj1 (Mahalas releases at the first decision past 0.69 s; BobBuildIt's median
is 0.60 s, 10th percentile 0.30 s), so one beam-clock rule covers about ten of the sixteen. But a full charge is
0.75 s only without Fast capacitors (0.56 s / 0.42 s with one or two stacks; proj1 takes it 4th, A-bot ranks it
low, other orders are unknown), so the clock must be measured per mech (rule 1). (2) A torso slaved to the current
target (no turn to a third party) is shared by TTUN, Lance (turns but stops firing), ImagineLosing, 404 (D1) and
RN SUS, so one third-party rule covers about eight to ten seats.

## 3. Archetypes keyed on observable signals only

Inputs available for an anonymous mech: id, position, velocity, aim, hp, max_hp, cubes, weapon kinds, the laser
charging flag, and behaviour over time. Read order: weapon list, held range to its current foe, closing speed,
strafe cadence, flag-to-beam time, torso spin, stillness, aim on loot. Until a read is made (the counter module
needs 1 s of observation, a 3 s hold and 8 s for full confidence), the section 5 rules apply alone, and only after
the latch.

**Observability limits (review section 5).** Flag-to-beam timing needs the first tick of the flag; a flag first
seen mid-charge gives a short, meaningless time. A heard beam has only a bearing and a coarse distance: with two
laser holders on one bearing it cannot be pinned on either. "Every mech within 200 m" means listed mechs (5 s
memory). A-bot's switch at 3 foreign deaths and Wolverines' at 2 are their own counts; we approximate them with
`alive` minus the kills we saw, which is incomplete. Upgrades are invisible except plating, so the cube count is
the only bound on capacitors, sensors and gyros.

| Arch. | Observable trigger (numbers) | Members (studies) | One robust counter rule | Loss bound when the read is wrong |
|---|---|---|---|---|
| A1 Calm laser kiter | laser listed; holds 95-200 m from its foe; walking pace (boost share < 0.2); flag up within 0.2 s of a line; beam 0.70-0.80 s after the flag without Fast capacitors, **0.56 s or 0.42 s with one or two stacks** | A-bot/scorpion (125-185), TTUN with laser (95-125), NEC (130-160), ImagineLosing (100-165), BackwardsDeployeds (110), proj1 (~100), BobBuildIt (100-200, but early release) | Never be in its open line: any exchange only from a cell with a hide cell in reach. On its flag with aim within 0.3 rad of us: hidden within the hide budget of rule 1 (its charge time minus 0.1 s; charge time measured, else 0.42 s by default). Re-expose only within 1.65 s after its beam was seen or attributably heard (or its flag dropped without a beam), or on A-bot C2's timers (2.9 s after a seen flag, 4.3 s after we left its line) for a 0.6 s peek; our beam pre-charged 0.35-0.45 rad off-axis behind cover and swung on in the release decision | If it is a real early releaser (BobBuildIt): one partial beam (110-250) per peek; stop after two peeks without a hit or 350 damage in one peek, then hold 150-190 m from cover, where its laser landed 1 of 13. Never conclude "early releaser" from short flag-to-beam times alone (M7) |
| A2 Laser + lightning chaser | laser + lightning, no gun, **and** closing on a mech at 5-13 m/s inside 100 m for 1 s (the loadout alone is not enough: L+Z is the end loadout of 6 of 7 recorded winners and our own FFA pair); often a continuous 3.4-4 rad/s torso spin | AT; Lance family when it holds both; 314159265 FFA loadout (but it flees) | Never be its nearest visible mech: on its first beam or a flag aimed within 0.25 rad, route to a hide cell reachable within 2.4 s (its beam interval) and keep a building between us for 6 s; while it is inside 230 m use only routes with a hide cell within 8 m; inside 55 m fight only with our own lightning and at least its hp, else boost sideways behind cover. Offence only as third party while it chases someone (beams into its side from 100-180 m, under D11) or a rear-arc release when its yaw is more than 100 deg off our bearing | If it is a spinner that hides and never hunts: a few seconds of farming lost; drop the read after 15 s with no closing, charge or shot from it |
| A3 Lightning closer (with gun) | gun + lightning; closes to 26-30 m (8.7-9 m/s walking, boost bursts of about 1.8 s from under 90 m) | TTUN with lightning, 404 gun + lightning (26 m), Mahalas (30 m), BackwardsDeployeds inside 60 m; ImagineLosing lingers at 43-63 m | Keep 50-70 m: walk away along cover at 11.7 m/s toward the next centre, gun and laser at every cooldown while backing; if its closing speed exceeds 12 m/s for 0.5 s, boost to hard cover and fight the corner; never kite out of the zone or across ground a laser holder watches | We give up ground and some loot; damage risk unchanged (it is inside its own range only if we let it) |
| A4 Mid-range gun + laser brawler | laser listed but holds 40-85 m; sideways orbit with reversals; often hostile-only | Mahalas practice posture (55 m), 404 (60 m), RN SUS (75 m, 47 m gun-only), 314159265 opening and practice (45 m) | Do not take its range in the open (both guns hit 75-100% at 45-75 m). If it has not shot us: calm pass, torso at least 0.3 rad off it, no approach inside 50 m, our hp at 65%+ within 115 m. If engaged: break sight, then corner peeks on its laser clock and its 12-round magazine; pin it once it is under 40% (a hit every 0.5 s keeps 404 from retreating) | Courtesy costs at most one decision of slew (0.3 rad at 4 rad/s) against a shoot-on-sight bot, which we answer at once (D0) |
| A5 Shoot-on-sight strafer, torso slaved to its target | opens on first mutual sight up to 200-230 m from second 0; torso stays on one mech; sideways strafing (real reversals 0.7-1.6 s); usually holds the gun | TTUN family, ImagineLosing, BobBuildIt, Lance family while it keeps the gun, RN SUS once hit. (AT and Lance holding both specials drop the gun: read them as A2 when they close) | First shot only under D11: it has been busy with another mech for 1.5 s (aim or rounds on it) **and is under half hp**; then third party from more than 75 deg off its aim (100+ for x1.5) at 60-150 m, never inside 45 m (60 / 75 m for a mech with 1-2 / 3+ cubes: sensors), hard cover within 6 m; leave when its aim comes within 0.5 rad of us, its target drops under 15%, or a second mech gets a line on us. If it targets us: break sight for 9 s and relocate 20 m before second 5 | A bot that turns to its strongest attacker (Mahalas within 0.4 s, A-bot within 0.8 s, 404 D3 0.7 s look): one exchange from a corner, bounded by the 0.5 rad exit (about 0.8 s of turning plus one decision) |
| A6 Hider / non-returner | speed under 1.5 m/s (or under 5 m/s creep) for most of 8 s and 30 s windows; torso not on mechs; not firing at us; flag rarely up. **A healing standstill (hp rising about 45 HP/s, flag down, silent) is a state, not a sub-type**: proj1's 35%-to-80% retreat, A-bot resting, the Lance 38% heal and TTUN heals all show it | Wolverines ae1b122 quiet phase, Mahalas and A-bot hide-first postures, tigerbyte (recorded), RN SUS repair standstill, BackwardsDeployeds 38% heal, 314159265 wall-base waits, any proj1 copy at rest | Default: pass wide (130 m+ or behind hard cover; never inside A-bot's 120 m bubble), torso off it. **Harvest only as a finish, at its hp 40% or less** (tiger C1, rule 8's finish clause, D11 "finish it late"), from 150-190 m (outside Wolverines' 150 m flee radius) or 130-260 m (outside RN SUS's 125 m horizon), aimed 0.3 rad off until release. A "no return fire" self-check counts only if we were inside its wedge, inside its weapon range and in its line of sight (A-bot never shoots unseen shooters, proj1 never shoots unseen attackers, Lance stops firing on an unseen hit). Stop at 6 alive (Wolverines turns hostile) | Passing wide costs only path length; a gated harvest meets a mech that is already losing |
| A7 Farmer in a stop | speed under 1 m/s, torso fixed within 0.15 rad on a crate or drone 13-38 m away, gun firing at it | TTUN (30 m crate / 38 m drone), r1ver (25 m mid-fight), proj1 (14-15 m), RN SUS (13-16 m), 404 (35 m), Lance (22 m crates) | **First strike only if its hp is 50% or less, or it fired at a mech in the last 30 s, and never on a 13-16 m crate stop** (proj1 and RN SUS: hostile-only or ignoring non-hostiles; a first hit turns them hostile). Then: approach unseen more than 60 deg off its aim and beyond 45 m; open from 110-200 m with a full beam from more than 90 deg off its aim (x1.5), then the gun at no lead while it stands; be within 6 m of cover by 0.8 s (its turn time) | A bait: one laser cycle and one magazine; abort if another mech within 150 m aims within 0.3 rad of us, our hp is under 60%, or the drone is within 50 m of us |
| A8 Skittish runner / boost-away | boost share above 0.25 with the range to the nearest mech opening; straight legs to buildings; waits at wall bases; vertical jets at <= 10 m/s | 314159265 FFA, Mahalas flee legs (<= 96 m), RN SUS 70 m flee legs, ImagineLosing v7/v8, Lance at 38% | Steady-leg shots only on a mech that is hostile to us, under D11's gate, or at 40% or less (rule 8 wins): constant velocity for 0.6 s: gun out to 0.8 s of flight, beam mid-leg; at a wall base or while rising, a beam with 1 m upward lead; never follow it into cover inside 40 m; to deny it, herd from 120-145 m | Wrong read on a dodging rusher: at most 6 rounds (stop if fewer than half land) |
| A9 Endgame centre-parker | motionless within 2 m of `zone.next_center` from 325-397 s; spinning or holding aim on the nearest mech | A-bot (325 s, no dodge after 390 s), Mahalas (378 s), RN SUS (radius under 18 m), ImagineLosing, 404, BackwardsDeployeds (within 15 m), 314159265 | Do not stand on the centre while it lives and has a line; hold hard cover 30-60 m (60-140 m when the circle allows) from the centre inside the current circle, arrive with a full charge, beam it when it stops, move in only when the edge is within 8 m | Other survivors converge and see us commit: hold cover at half radius if two other mechs are within 60 m of the centre and we are under 60% hp |
| (fingerprints, identification only) | proj1: full turn at 4 rad/s in the first 1.7 s, then a +-109 deg sweep with a 5.7 s period, holds fire at 100-200 m; Mahalas: boost locked to t mod 4.833 s; RN SUS: reversals at multiples of 2.7 s; NEC: 4 s spawn hop; AT: 4 rad/s CCW spin with L+Z (0.40 rad per decision; 0.52 / 0.68 rad with gyros); A-bot: never airborne, 5.85 m/s while charging | - | Use only to pick the member-specific counter of sections 1-2; every rule above works without the fingerprint | - |

Which wins when rules collide: **rule 8 (calm courtesy; "winners finish, they do not start") wins over A6, A7 and
A8**; each of those may open on a mech that has not shot us only through its own hp gate or D11's gate.

### Cross-check against `bot/lib/counters.js` (07:36 version, via `counters_hookup.md` and the review)

The module has six archetypes (LASER_KITER, LIGHTNING_CLOSER, GUN_STRAFER, BOOST_RUSHER, HIDER, FARMER), blends
its advice toward the neutral D2 bands by confidence (weight at most 0.9; 'attack' only at weight >= 0.6 and our
hp >= 60%; never 'avoid' a mech that shot us in the last 4 s), and is inert outside FFA. It is not yet imported by
the brain; `counters_hookup.md` gives the wiring. **The code is safe where the draft text was not:** `HD/harvest`
cannot trigger (HD is level 0, which forbids first shots, so the probe is never ordered and `nReact` stays 0), and
`FM/strike` and `HD/late` are level 2 (opportunistic), so D11's under-half-hp gate decides the first shot.

| # | Mismatch | Studies affected | Change (status after review) |
|---|---|---|---|
| M1 | No mid-range laser brawler: a laser holder at 40-85 m gets LASER_KITER 0 (range ramp 80 -> 110 m) and GUN_STRAFER is excluded (needs no laser), so it reads UNKNOWN and gets neutral advice | Mahalas, 404, RN SUS, 314159265 | add A4: laser + held range 40-85 m + orbit; advice = calm pass / corner on the laser clock, no open trade inside 85 m (stands) |
| M2 | LIGHTNING_CLOSER for laser + lightning without gun: **already half done**, `breakLosOnCharge` is set when the closer holds a laser (`CT.brk = s.laser`) | AT, Lance family | add only the missing routing: a hide cell reachable within 2.4 s of its beam (A2), and A2's closing-speed requirement (stands, reduced) |
| M3 | BOOST_RUSHER cites 314159265's 41% boosting, but that bot boosts away (skittish runner); BR needs closing, so it will rarely fire on it, and BR is the only archetype that escalates to 'attack' | 314159265, Mahalas and RN SUS flee legs | add A8 (boost with range opening) -> steady-leg shots under rule 8's gate, herd, never follow; cap BR at 'opportunistic' until a member is seen (stands) |
| M4 | ~~healer sub-read -> opportunistic from 130 m+ at 50-91% hp~~ | - | **Rejected** (backfire B4): a healing standstill is a state every mech enters; at 50-91% it is often a proj1 copy, which a hit makes hostile for 25 s. Keep HD/pass there; the existing HD/late (under 50%, D11 decides) covers the finish; tighten it to 40% if it is ever made bolder than level 2 |
| M5 | The HIDER label lags Wolverines ae1b122's switch at 6 alive (8 s and 30 s stillness windows plus a 3 s hold), although 'harvest' correctly stops at 7 | Wolverines C1 | at alive <= 6, drop every hider read on a gun carrier and treat it as a shoot-on-sight strafer with its cubes (stands) |
| M6 | ~~keep the no-return counter usable from FARMER~~ | - | **Deferred** (backfire B6): the probe is unreachable in code (above). If a probe is ever added, count "no return" only when we were inside its wedge, in its range, with a line, and gate the harvest at its hp 40% or less |
| M7 | ~~early release (flag-to-beam under 0.65 s) -> hold 150-190 m instead of ducking~~ | - | **Rejected** (backfire B1): one or two Fast capacitor stacks give 0.56 s / 0.42 s full charges, and a flag first seen mid-charge also looks short, so M7 would stop us ducking from the most dangerous lasers in the field (cubed, full-charge). Read "early release" only if the flag was seen from its first tick and the same mech has also released at 0.70 s or later (proof it has no capacitor upgrade); otherwise duck. Use `chargeDurE` for the hide budget instead (M12) |
| M8 | No beam-clock output: `lastBeamT` is tracked but the advice has only `breakLosOnCharge`; every study's first laser counter is "peek within 1.65 s after its beam" | A-bot, TTUN, NEC, Lance, ImagineLosing, Mahalas, 404, proj1 | add `peekUntil = lastBeamT + 1.65` (or flag drop), plus A-bot C2's timers (2.9 s after a seen flag, 4.3 s after leaving its line, then a 0.6 s peek) so a missed beam cannot strand us in cover (stands, extended) |
| M9 | Torso spin (`spinN`) is computed but used by no archetype | AT (rear-arc release), D0 aim-flicker (AT, Mustikas, BackwardsDeployeds, r1ver and 404 spin 36-64% of their lives) | a spinner's aim crossing us is not hostility; expose a rear-window flag (stands) |
| M10 | GUN_STRAFER needs no laser, so TTUN / ImagineLosing / BobBuildIt with gun + laser read LASER_KITER; their third-party band is then 100-190 m (LK) instead of 60-150 m (GS), where the studies' model gives our gun 85% at 70 m against 70% at 110 m | TTUN family, ImagineLosing | allow GS/third geometry for any slaved-torso target that is busy, still under D11's gate (stands) |
| M11 | ~~the opening must run on the section 5 rules~~ | all | **Replaced**: impossible. The latch needs the 3rd foreign death (median 18 s, range 9-54 s; by 19 s in all 11 showdowns) and D0 requires SQUAD behaviour until then, so the opening (bottom half dead by a median 21 s) runs on D0's 40 s guard and SQUAD logic, never on the module or section 5. The only lever is a rule that works in both postures (redteam_final row 1: contact break for t < 40 s), and it must also pass the practice score |
| M12 | new: hide budget per mech | all laser holders | budget = charge time - 0.1 s; charge time from `chargeDurE` measured on a first-tick flag, else 0.42 s by default (3+ cubes or unknown), 0.56 s at 1-2 cubes, 0.75 s at 0 cubes; feeds the `breakLosOnCharge` reach |
| M13 | new: tiger C9 has no output | proj1 cluster | a "keep laser undischarged" flag when a corner-playing laser carrier within 285 m has a line to us and we are not fighting it |
| M14 | new: proximity radius by cubes | every third-party geometry | "never inside 45 m" becomes 60 m for a mech with 1-2 cubes and 75 m with 3 or more (two sensor stacks possible); fingerprints keyed on AT's 0.40 rad step allow 0.52 / 0.68 rad |
| ok | Consistent: LASER_KITER without our laser stays beyond 200 m (A-bot, proj1); LIGHTNING_CLOSER 65 m+ (BackwardsDeployeds C1, Wolverines C6); FARMER strike from 140-200 m off its torso (r1ver C1, NEC C6), deferring to D11; rear-arc threshold 100 deg and GS attention 75 deg (Wolverines C2); harvest window 7-14 alive (Wolverines C1) | - | - |

**Practice score.** The module is inert in SQUAD: `env` must equal 'FFA' exactly and stance sets only 'FFA' or
'SQUAD'; the hookup reports 127,500 calls returning neutral advice. Its only practice risk is a false latch: D12
alone latched in 0 of 96 practice matches, the clue counters in 1 of 96, so `beamClue` and `gunlessClue` stay off
(SELECT already has them off). `update` runs every tick in SQUAD too (mean 41-61 us, p99 up to 146 us, garbage
collection spikes of 2-8 ms): re-measure the worst answer under the one-CPU quota (12-14 ms today) once it is
wired.

## 4. Practice lessons from top bots that Doctrine V4 does not use yet

Deduplicated across the 14 studies; ranked by expected size times evidence. "V4" names the item it changes.
**This section is not inert:** every lesson changes SQUAD play, so each needs its own one-change submission on the
official scorer. None is folded into the default by this dossier. The opening guard (lesson 1) and anything
before 4 s (lesson 19) also play in the final, because no latch is possible that early.

| Rank | Lesson | V4 | Evidence | Grade |
|---:|---|---|---|---|
| 1 | **Lengthen the no-first-fight part of the opening guard only:** start no fight until 10 cubes or 75 s, but keep D0's "answer any hostile at once, at any range". Curve on one build (proj1): attack from 20 s 4.96; 4 cubes / 50 s 5.19; 6 cubes / 75 s 5.31; **10 cubes or 75 s 5.42 (farm10t75)**; 10 cubes / 130 s 5.10; and 2696's 5.60 is likely the proj1 profile f75kite (content unread). Do not copy proj1's "answer only a hit inside 100 m": it contradicts D0 and is proj1's own exploitable limitation 9. The guard runs before any latch, so it also governs the final's opening | D0 (40 s) | proj1 board log and `top_new_map.md`; 314159265's 40 s guard reached 4.92; 404 never opens on healthy non-aimers (5.02) | [T] (the top score's own family) + [1] clean single parameter, one draw each |
| 2 | Caution creep loses in practice: the D4 "step to cover from a charging laser" step was inside two losing bundles and was dropped by a third team; make it a preset that is OFF in SQUAD | D4 laser cover step | ImagineLosing hide/peek bundle incl. that step -0.71; RN SUS pre-emptive escapes from aimed lasers + under-armed disengage + 12 s evasion -0.27; Wolverines tried "step to cover from a charging laser" after 5.19 and did not keep it | [1] x3 bundles, same direction |
| 3 | Fight on with 3-5 hunters: break off on count only at 6, 40% hp otherwise; two hunters 50% (was 65%); keep charging at any hp. Keep D3's low-hp retreat: NEC's v20 got +0.13 with 0.3 x the TTUN retreat thresholds, inside its own 0.12-0.18 salt noise, which is consistent with keeping it (weak) | D3 (3-5 threats < 60%) | A-bot ladder +0.72 then +0.23; NEC v20 | [1] x2, bundled, at the top of the board |
| 4 | Farming execution: stop 10-15 m from a crate so the gun can still pitch down (0.7 rad limit, 7 m muzzle), step back if closer; reload only at 4 rounds or fewer when quiet; give up a cube after 6 s + 1 s per 8 m and a crate after 14 s | D6 (silent) | TigerTown27 fixes 4.1-4.4 -> 4.96 for the same profile | [1] bundle, large |
| 5 | **Strafe interval: keep D4's 0.8 s floor; no run.** The draft's "five 5.0+ bots reverse faster" was wrong: TTUN's 0.35-1.05 s is how often it re-draws its strafe side by coin flip, and its real reversals average about 1.4 s; A-bot's mean is 0.8 s, exactly our floor; at most four (Mahalas 0.45-0.95, ImagineLosing 0.35-1.15, proj1 0.35-0.9, A-bot at the floor) are as fast or faster. Every measurement is zero or negative: M03 faster reversals -0.69; R04 -0.27 and R05 -0.59 bundles with 0.4-0.9 s flips; M04 (0.5-1.3 s) neutral. Our model's hit rates (first-order lead 63/41/33/20% at 50/80/100/130 m against 76/60/52/36%) are analytical only | D4 `strafe` | M03, R04, R05, M04; Wolverines study | [1] negative x3, none positive |
| 6 | Dodge horizon 1.4 s, margin radius + 2.0 m, dodge dominant over the goal term (weight 4 -> 7 -> 10), drone bullets x0.6 | D4 (0.9 s, +1.2 m, 0.9 blend) | A-bot ladder, inside the +0.72 and +0.23 bundles | [1] x2 bundled |
| 7 | Laser-only detour exception: walk up to 100-140 m in contact (health 35%+, uncontested) and 250-320 m out of contact for a laser when we have none | D6 (60 m) | A-bot 120 / 320 m [T]; ImagineLosing 140 m mid-fight (+1.06, three-change bundle); Mahalas 250 m spawn rush (official +0.20 bundle, sim +0.5); generic detours lost -0.11/-0.06/-0.06 | [T] + [1], [C] |
| 8 | Audit our stuck detector against slow modes: charging halves speed (heal creep 4.9 m/s becomes 2.46 m/s), a 2.5 m/s threshold fires a false jump-jet | D10 (silent) | BackwardsDeployeds: removing the false stuck jump +0.21 to +0.25 | [1] official |
| 9 | Re-draw plan: deltas under 0.1-0.3 are noise (identical files 5.10 vs 5.19; practice-identical builds span 4.48-4.90); keep the last 6-10 submissions for salts of the best build; ties go to the earlier time. Scores are multiples of 1/48, so a tie between teams is weak evidence of shared code | D10 salt | NEC, r1ver/Kanyaraasi, 314159265, kyoto-max (-0.27 from a seed only); `top_new_map.md` note 4 | [S] |
| 10 | First submissions as one coherent lineage (all presets at one top bot's values), then one change per submission | method | NEC: four transplanted TTUN parts -0.66, whole core +0.23 to +0.69 | [1] x2, same repo |
| 11 | Out-gunned rule: without a laser, against a laser holder beyond 55 m, break the line below 80% hp; otherwise close to 30-60 m | D3 (missing) | removed inside A-bot's -0.41 bundle | [1] bundled |
| 12 | Farming health threshold 45-50% (crates 45%, drones 50%) as a preset against our 90% | D6 `farmHp` | the whole TTUN family at 5.19-5.27 (four entries); r1ver farms in contact from 55% | [T] |
| 13 | Shoot crates while healing (crate hits do not stop repair; drone hits do, since drones shoot back) | D3 HEAL forbids it | TigerTown27 recordings and our own forensics (150 of 158 frames); two code readings (BackwardsDeployeds, ImagineLosing) assume the opposite | [rec] x2 vs [code], [C] |
| 14 | Define "contact" by threat geometry for short in-fight farming: nobody within 37 m, nobody within 105 m with a line aiming within 20 deg, not hit for 0.9 s, laser not charging, no zone goal | D6 | r1ver +0.17 (+0.08 over the parent's twin), bundle | [1] weak, near noise |
| 15 | Shoot crates from up to 150 m at the first clear line, fetch the cube afterwards (drones from 110 m) | D6 (walk to 30 m) | A-bot [T]; ImagineLosing from where it stands to 140 m | [T] |
| 16 | Use the server's 5 s of true position: keep aim and range on a mech behind a wall, fire through canopy for the full 5 s | D8 (1.5 s dead reckoning) | TTUN/Kanyaraasi behaviour; rules | [T] + rules |
| 17 | Heal exit at 55% instead of 70% | D3 `healExit` | TTUN family | [T] |
| 18 | Score the walk and the boost option separately against incoming bullets; never boost into a predicted hit | D4 | RN SUS +0.44 bundle (15 changes) | [1] bundle |
| 19 | ~~4 s sideways jump-and-jet opening as one candidate run~~ **Drop.** It cannot be limited to practice (no latch is possible before 4 s), so it also plays in the final, where NEC's own simulator rates it -0.7 places a match, the NEC study's C1 is a "spawn tag" counter against it, and airborne mechs are hit 92% against 57% (house-bot replay). The practice case is weak (NEC hop 5.02/5.08 against no-hop 4.48-4.90, p about 0.07-0.17). Run it only if that final cost is accepted knowingly | none | NEC study limitation 12 and C1; `forensics.md` | [1] weak in practice, negative in FFA |
| 20 | No weapon swap while a mech that hit us in the last 3 s has a line; any hit while travelling cancels a pickup walk unless cover is on the way | D7 / D4 | AT lost a duel during the 1 s equip; 5 of its 11 matches ended inside 22 s on straight pickup walks | [rec] |
| 21 | Drone hits must never count as an attacker in LOSING / HEAL logic | D3 | Lance controller breaks off from drones | [code] |
| 22 | Do not build hull-down cells | - | the ImagineLosing map scan found one within 20 m in 0-2.4% of 60-150 m duels (BackwardsDeployeds C3 proposes them) | [model], [C] |

Warnings the studies add against V4 numbers already in place: TigerTown27's nine more-aggressive variants (always
fight, never retreat, fixed 150-200 m kiting, rush, L+Z, damage-first upgrades) each landed 0.3-0.6 below its plain
bot, which weighs against the `far` laser preset as a default (whether 2696's f75kite "kite" profile changes this
is unknown: its content is unread); no-retreat bots plateau at 4.9-5.15 (314159265, Mahalas) while the 5.58 bot
lost 0.41 without its low-hp retreat, so D3's retreat stays.

## 5. Ten free-for-all rules that are safe against every studied bot

**FFA latch only; SQUAD bit-identical (D0).** These rules run only after D12 has latched. While unlatched (all of
practice, and the whole opening of the final until the 3rd foreign death, median 18 s) the bot must behave exactly
as a SQUAD-only build; the opening is played on D0's 40 s guard and SQUAD logic. None of these rules may leak into
SQUAD, where they would repeat measured losers: rule 6's sub-second-reverser clause would cap the gun at 75 m
against every house bot (they reverse about every 0.8 s, S06, and hunt from 100-150 m; the gun did 52% of damage
in recorded live matches, S07); rule 1 is the cover/peek bundle that lost 0.71 (A17); rules 4 and 9 are hiding
(A13 -0.69 and the rest of the A series, -0.3 to -1.75 in ten tests); rule 2 conflicts with D8 (direct laser aim
from 80% charge) and nothing shows that house bots duck lasers.

Each rule was checked against all nine archetypes of section 3 and against the proj1 family: none of them turns
the rule into a loss larger than the stated bound. "Supports" lists the studies that derive or require it.

1. **Laser discipline: cover and the beam clock.** Trade with any laser holder only from a cell with a hide cell
   in reach. On a flag aimed within 0.3 rad of us, be hidden within the **hide budget** = that mech's charge time
   minus 0.1 s (one decision of reaction), counted from the first tick we see the flag. The charge time is
   measured (only from a flag seen from its first tick to its beam) or, unmeasured, the shortest its cube count
   allows: **0.42 s by default** (any laser holder with 3 or more cubes, or unknown: two Fast capacitor stacks give
   0.75 -> 0.56 -> 0.42 s), 0.56 s at 1-2 cubes (one offer, one stack at most), 0.75 s at 0 cubes (no offer yet).
   The default budget (0.32 s) reaches about 3.7 m walking or 6.2 m boosting; the 0-cube one (0.65 s) about 7.6 m
   / 12.7 m. With no hide cell in reach, fall back to D4's velocity change. Re-expose
   (a) within 1.65 s after its beam is seen, or heard on a bearing only it occupies (with two laser holders on one
   bearing, only a listed beam counts), or after its flag drops without a beam; or (b) on A-bot C2's timers:
   2.9 s after a flag we saw, or 4.3 s after we left its line if we saw no flag, then a 0.6 s peek only (its laser
   is idle and ready), with our laser ready and our hp over 50%. Whenever its flag comes on during a peek, the
   budget applies again. The timers replace the draft's "never on a timer alone", which could strand us in cover
   after a beam we missed.
   Why safe: full-charge bots (about ten of sixteen) waste the beam into the wall; capacitor-upgraded full-charge
   bots are covered by the 0.42 s default; early releasers (BobBuildIt median 0.60 s, Mahalas at 0.69 s) at worst
   land one partial beam per peek; pre-chargers behind cover (ImagineLosing v8, Mahalas, proj1) are caught by the
   beam-seen condition. Supports: AB C2, NEC C2, WV C4, BD C2, IL C2, MH K2/K6, 404 K5, TT C3, AT A1/B1, RN SUS K5.
2. **Charge off-axis, swing on in the release decision.** Hold the torso 0.35-0.45 rad off the target while
   charging and swing on in the last decision (0.4 rad at 4 rad/s is 0.1 s). It beats every duck and sidestep test
   read (A-bot 0.3 rad, TTUN 0.25 rad, Lance 7 m + 3% of range, ImagineLosing 8 m, 404 atan(6 m / d) + 0.05) and does
   not trip the aim-based hostility tests (proj1 ~7 deg for 0.6 s, Mahalas 0.2 rad for 0.5 s, 404 0.2 rad,
   314159265 0.15 rad). **Caveat (conflict with rule 1):** our own charge halves our speed (5.85 m/s) and allows no
   boost, so a 6 m hide cell takes about 1.0 s. Charge in the open only with a hide cell within about 2.5 m;
   otherwise charge behind cover, or release first and then hide. Cost against a bot that ducks on the flag alone:
   0.1 s. Supports: AB C3, BD C7, IL, KY, MH K1, TT C2, 404 K2, 314 C6, showdown_profiles rule 6.
3. **Third party only from outside the wedge, and only under D11's gate.** First shot only at a mech that has been
   busy with another for 1.5 s **and is under half hp** (D11; the draft dropped this gate). Then from more than
   75 deg off its aim (100+ deg for the x1.5 rear), at 60-190 m, never inside 45 m (60 m for a mech with 1-2 cubes,
   75 m with 3 or more: sensors), cover within 6 m; leave when its aim comes within 0.5 rad of us, its opponent drops
   under 15%, or a second mech gets a line on us. A busy mech at half hp or more is joined only if it then shoots
   us (D0). Why safe: slaved-torso bots never see us; bots that turn to the damage bearing (Mahalas 0.4 s, A-bot
   0.8 s, 404 D3 0.7 s, proj1 2.5 s snap) meet us at a corner with the exit already armed; the hp gate keeps us off a
   healthy proj1 copy. Supports: WV C2, KY 1, NEC C3, BD C4, IL C1, 404 K1, RN SUS K6, AT A3, TT C1, AB C6, r1ver C3,
   D11.
4. **Break sight for 9 s and move 20 m before second 5.** The server lists us for 5 s; TTUN walks to our last
   point for 4 more, ImagineLosing walks at our tracked position for 5 s, A-bot stares at it for 12 s, 404 hides from
   positions seen in the last 25 s. A searcher arrives at an empty spot; nobody gains from our relocation. Supports:
   WV C7, KY lesson 8, r1ver C2, IL C6, AB C4/C6, BD C2 (slow cycle), AT A1 (6 s).
5. **Keep 50-70 m from every lightning carrier unless we hold lightning and at least its hp.** Walk away along
   cover (11.7 m/s against its 8.7-9 m/s closing); if it closes faster than 12 m/s for 0.5 s, boost to hard cover
   and fight the corner; never kite out of the zone. Against laser + lightning chasers combine with rule 1. Loss when
   wrong: ground only. Supports: WV C6, BD C1, AT A5, 404 K4 (inverse), KY 2, MH, 314 (24 m), IL (43-63 m).
6. **Gun gate by target motion.** Gun at movers only under 0.55 s of bullet flight (about 138 m); waive it for one
   magazine on a mech that kept a constant velocity for 0.6 s (cube walk, zone run, flee leg, drop ring, crate stop,
   wall-base wait), out to 0.8 s of flight; against a sub-second reverser (median gap under 0.95 s over 3 s) only under
   0.3 s of flight (about 75 m), laser otherwise. FFA only (in SQUAD this clause would cap the gun at 75 m against
   every house bot). Loss when wrong: one magazine. Supports: D2, WV C3, KY, BD C6/C7, IL C3/C4, MH K3, 314 C3,
   r1ver C1/C4, AT A4, RN SUS K2, NEC C5, TT C4.
7. **Never stand still in the open; never wait in a drop ring; never park on the final centre while a mech with a
   line lives.** Winners stood in open sight 0.7% of their stationary time (S1). Hold hard cover 30-140 m from the
   centre and enter when the edge is within 8 m; overwatch drops from 100-200 m. Against every centre-parker this
   wins; against crowds it only keeps us in cover. Supports: S1, WV C5, AB C7, MH K4, RN SUS K4, IL C8, BD endgame,
   404 K6, TT C7, AT (died motionless on a roof), D6.
8. **Calm courtesy toward a mech that has not shot us (this rule wins over A6, A7 and A8).** Torso at least
   0.3 rad off its bearing, no approach inside 50 m, no first shot unless rule 3 or a finish (target at 40% or less)
   applies, our hp at 65%+ while within 115 m of it. Hostile-only bots (proj1, 404, Mahalas, RN SUS, 314159265,
   A-bot after its switch) then leave us alone; shoot-on-sight bots attack anyway and are answered at once (D0), so
   the cost is one decision of slew. Supports: TT C2, 404 K2, MH K1, RN SUS K3, 314 C6, AB C1, S1 ("winners finish,
   they do not start").
9. **Do not be the wounded mech in anyone's view.** Below 50% hp keep a building between us and every listed mech
   within 200 m (5 s memory); heal in cover before the four-alive point. Every studied bot prefers the weak: AT
   opens on anything under 80% at up to 200 m, 404 under 43% within 195 m, proj1 under 40% within 150 m, Mahalas
   prey under 35%, Lance finish at 30% within 130 m, kestrel rush under 320 hp, RN SUS under 360 hp within
   55-85 m, TTUN weights health. Loss: lost farming time only. Supports: AT 5, 404 L2, TT, MH K5, BD L7, 314 C5,
   RN SUS, WV, D11, showdown rule 4.
10. **Answer fire while breaking the line, and leave at the second line of fire.** An unanswered first hit was
    survived 10% of the time against 41% when answered (TigerTown27 recordings); 55% of deaths involve two or more
    attackers (S4); hold-fire while being shot cost 0.34 (A09). Shooting while moving to cover only adds noise we
    already made; against a lightning closer the move is rule 5's walk-away. Supports: TT lesson 10, redteam_final
    row 5, r1ver N5 (single-attacker cover is how its retreats die), RN SUS K2 (silent retreats give free beams),
    404 L1, BD L6, MH (shoots while fleeing), measured_deltas A08/A09.

Not on this list because they backfire against at least one archetype: corner ambush of a rusher (fails against
the lightning closer and against A-bot's kiting), lightning dashes (BobBuildIt kites at 7 m/s with 92% gun hits
inside 75 m), hull-down cells (rare on this map), drop contests (Mustikas walks to every drop), long hiding walks
and roofs (314159265 averaged 12th that way), D11's "pass a motionless hider at 55 m" (A-bot's bubble is 120 m,
tigerbyte opened at 83 m: use 120-130 m), and **any ungated harvest, farmer strike or no-return probe** (each takes
a first shot at a healthy mech; against proj1 that buys 25 s of hostility from the best free-for-all family).

## 6. Review applied (07:55-08:20 UTC)

Source: `notes/counter_dossier_review.md`. Its citation check (about 60 behaviour numbers, four wrong or
overstated) is accepted; the changes below are its sections 1-7 plus the 07:51 board.

**Changed**
- Identity: kyoto-max confirmed as `8241a6c` (v18, 60 s before its 5.25), "v15 = 5.19" removed, v19's free-for-all
  mode noted; scorpion down to medium (ties are weak at 1/48 steps; this repo's timing also yields coincidences);
  Team Inventors down to none; 314159265 corrected to "31st and inside at 07:15" and updated to "33rd and outside
  at 07:51"; Mahalas (3 of 3 within 4 min plus the name link) and ImagineLosing (85 s) kept, with ImagineLosing's
  possible v8 final build added.
- Threat map: 2696 and benchmaster moved from "pending / MAGIC watch" to the proj1 code family; new proj1 cluster
  (up to four seats, up to four of the top seven at 07:51) with TigerTown27 counters C1, C2, C3, C7 and the missing C9;
  TigerTown27 taken off the singletons; recorded free-for-all strength added (proj1 9.9 points a match, A-bot LLC
  6.0 in 10 appearances, others) and a threat order written; giddygiddyboy, sonion, Huss Huss Husss, Hacktoolz
  rows filled from `top_new_map.md`; NEC v20 and BackwardsDeployeds r5 marked as no change in free-for-all play.
- Fast capacitors: rule 1's fixed 0.6 s replaced by a per-mech hide budget (charge time minus 0.1 s; charge time
  0.42 s by default); A1's trigger and loss bound rewritten; M7 rejected; M12 added.
- Rules 1 and 2: the half-speed, no-boost conflict stated (a 6 m hide cell takes about 1.0 s while charging; charge
  in the open only with a hide cell within about 2.5 m); A-bot C2's 2.9 s / 4.3 s timers and 0.6 s peek restored in
  rule 1 and M8; the heard-beam attribution limit added.
- Backfires against proj1: harvest gated at target hp 40% or less (A6, M4 rejected), farmer strike gated at 50% or
  less or "fired at a mech in the last 30 s" with 13-16 m crate stops excluded (A7), "no return fire" counted only
  if it could see us (A6, M6 deferred), steady-leg shots gated (A8), rule 8 declared the winner over A6-A8, rule 3
  and A5 given back D11's under-half-hp gate. The code was already safe (harvest unreachable; strike and late are
  level 2 and defer to D11); the text now says so.
- Citations: lesson 5 rewritten (TTUN's 0.35-1.05 s is its re-draw interval, real reversals about 1.4 s; all
  measurements zero or negative; recommendation now "keep the floor, no run"); BobBuildIt's release is a 0.60 s
  median, not "0.3-0.6"; M2 marked half done in code; A5's trigger and members fixed (AT and L+Z Lance drop the
  gun); A2 now requires the closing-speed condition (L+Z alone is the common winner loadout).
- Practice score: section 5 headed "FFA latch only; SQUAD bit-identical" with the measured cost of each leak; the
  module's inertness and its one risk (a false latch; clue latches off) stated; M11 replaced by the pre-latch
  statement; lesson 1's curve updated to the 10 cubes or 75 s peak (5.42) with D0's answer-at-any-range kept;
  lesson 19 (spawn hop) changed to "drop", since it cannot be confined to practice and costs places in the final;
  section 4 marked as not inert (one-change submissions only).
- Sensors and gyros: proximity distances scaled by cubes (B10); AT's 0.40 rad fingerprint widened for gyros.
- Board: ranks and rows moved to the 07:51 board (giddygiddyboy 5.54, benchmaster 5.50, Kanyaraasi 5.31 into the
  top 16, kyoto-max 5.27, not even close to 17th); unstudied seats listed (nine inside the cut).

**Modified rather than taken as written (and why)**
- Proximity margin: the review says 75 m for mechs with 6 or more cubes; this dossier uses 60 m at 1-2 cubes and
  75 m from 3 cubes, because offers come at 1, 3 and 6 cubes, so two sensor stacks are possible from 3 cubes (the
  same reasoning the review uses for the 0.42 s default at 3+ cubes).
- Hide budget: the 0.42 s default is kept for any laser holder with 3+ cubes or an unknown count; for 0 cubes
  (0.75 s charge) and 1-2 cubes (0.56 s) the shorter assumption is dropped, because a mech gets offers only at cube
  thresholds and never loses cubes while alive, so it cannot hold more stacks than its count allows. The budget
  is the charge time minus one decision, so the default leaves 0.32 s.

**Rejected:** nothing of substance. Not done: identity re-checks of the best times posted after 07:15
(giddygiddyboy 07:37, benchmaster 07:21, kyoto-max 07:38, Kanyaraasi 07:49), because `P/intel` was not opened in
this pass; those builds are marked unmapped. New-entrant behaviour studies: none had appeared at 08:05 UTC, so all
eight stay pending; fold them in when `notes/intel/` gains them.
