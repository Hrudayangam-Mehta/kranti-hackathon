# Sceptic's review of `notes/counter_dossier.md`

Written 21 Nov 2026, 07:40-07:55 UTC. I attacked every team row (section 1), the clusters (2), the archetype rules
(3), the lessons (4) and the ten free-for-all rules (5).

Read: the dossier; all 14 `notes/intel/top_*.md` (each claim checked by grep and by reading the relevant section);
`top10_name_map.md`; `showdown_profiles.md`; `redteam_final.md` / `redteam_practice.md` (latch rows);
`measured_deltas.md`; DOCTRINE V4; `kit/protocol.md` and `notes/hello_example.json` (rules and upgrade numbers);
`bot/lib/counters.js` (07:36 version); `bot/lib/stance.js` (latch); and two files that arrived after the dossier was
written: `notes/top_new_map.md` (07:37) and `notes/counters_hookup.md` (07:37).

Identity re-checks used only `git --git-dir=intel/_meta/<repo>.git log --all --format='%cI %h %s'` against
`../web/mech_submission_times.json`. `P/intel` was not otherwise opened.

New-entrant studies: `notes/intel/` still holds none at 07:51 UTC, so 2696, benchmaster, giddygiddyboy, sonion,
kyoto-max, Huss Huss Husss, Hacktoolz and Team Inventors stay **pending** for behaviour. Their identity and lineage
come from `top_new_map.md` (section 2 below).

## 0. Verdict

The citations hold up well. About 60 behaviour numbers checked against the studies; four are wrong or overstated
(section 3). The weak parts of the dossier are elsewhere:

1. **It is out of date on the threat map.** The new map puts 2696 (5.60, first), benchmaster (5.42) and probably
   TigerTown27's own 5.42 on the TigerTown27 Go bot (proj1, "paw"), not on MAGIC. The proj1 free-for-all posture
   (hostile-only, laser caution, flees much stronger mechs) may sit in three or four finalist seats. It also has
   the best recorded free-for-all result of any studied bot: 9.9 points a match, third of 24 teams. A-bot LLC scored
   6.0 in 10 recorded appearances. The dossier treats TigerTown27 as a singleton and files 2696 under MAGIC.
2. **Three counters backfire against that family.** The healer harvest, the farmer strike and the
   no-return probe each take a first shot at a healthy mech that has not shot us. Against proj1 that turns a
   passive, strong bot into a hostile one for 25 s. In the code they are safe: their advice defers to D11's gate,
   and the harvest cannot be reached. The dossier text (section 3, M4, M6) is not safe.
3. **The upgrade rules break two laser numbers.** Fast capacitors (`laser_charge` x0.75, up to 2 stacks) give
   charge times of 0.56 s and 0.42 s. That breaks rule 1's "hidden within 0.6 s" and M7's "early release under
   0.65 s" read. M7 would stop us ducking from the most dangerous lasers in the field: cubed ones that release at
   full charge.
4. **Practice inertness is right for the module but not stated for section 5, and M11 is impossible.** The opening
   is played before any latch can happen, so the section 5 rules can never cover it.

## 1. Identity re-checks (commit time against best-score time, UTC)

| Team | Dossier | Commit (UTC) | Board (UTC) | Lag | Verdict |
|---|---|---|---|---|---|
| 314159265 | medium | `8671068` G3, 21:10:49-05:00 = 02:10:49 | 02:10:49.76 | under 1 s | **medium stands.** The study shows this is the only board row within 2 s of any of the repo's 53 commits. It also shows that some mech-bot commit lands in a random 2 s window about 25% of the time. **Correct the cluster row:** "4.92, below the cut line" is wrong. The team is 31st of the 32 qualifying places. It is tied at 4.92 with 32nd and 33rd and wins the tie by submitting earlier. It is inside today but will probably be pushed out (no commit since 04:05). |
| Mahalas | medium-high | `5f9ed03` 03:43:18; `a359a35` 04:41:14; `d67b21c` 05:17:40 | 03:45:27; 04:44:49; 05:18:30 | 129 s; 215 s; 50 s | **medium-high stands.** Three for three within 4 min, plus the name link (the second kind of evidence the name map requires). The TTUN-copy alternative is excluded by the study (no TTUN variant above 5.10). |
| ImagineLosing | likely | `14b39db` v5, 21:29:34-05:00 = 02:29:34 | 02:30:59 | 85 s | **likely stands** (the name map had it as low; the study rules out SaturdayNightLive at +218 s). Its best never moved after v6-v8, so the final may run v8 (flee plus duel cover), not v5. The archetype read must cover both. |
| kyoto-max | "5.25 build not linked; v15 = 5.19, low" | `8241a6c` v18, 11:29:10+05:30 = 05:59:10 | 06:00:10 | 60 s | **Wrong in the dossier; confirmed.** The next commit text says "v19 5.25". The 5.19 at 05:36 has no commit within 6 min, so the roster's "v15 = 5.19" label is unsupported. v16-v18 are a new own brain (v17 states "no third-party code"), shipped only as `.pyc`. v19 `21bc4fd` adds a free-for-all-only mode and also scored 5.25; v20 scored 5.19, v21 5.21. v22 (07:00) is unscored. |
| Team Inventors | weak lead `rohaanafzal/mech-bot` | `294c18d` 05:16:36; `94c9565` 06:52:49 | 05:17:19; 05:24:58; 06:30:07; 06:58:41 | +43 s; 8.4 min; 73 min; 5.9 min | **Downgrade to none** (as the new map has it). Only two of four best times match, and `94c9565` is also 5.4 min before 2696's 06:58:15. The other +45 s match the 314 study cites ("I wish I was admitted by Cambridge") is now mapped to Jiackary. Do not expect kestrel practice signatures from this team. |
| scorpion | likely | MAGIC `e39579f` "Restore the 5.58 settings" 05:11:53; A-bot's `53f6854` 03:30:03 | scorpion 05:17:03; A-bot 03:37:53 | 5 min 10 s; 7 min 50 s | **Downgrade to medium.** The tie is weak evidence. Scores are multiples of 1/48, and 5.42, 5.31 and 5.27 are each held by three teams. The dossier's own lesson 9 also says identical files scored 5.10 against 5.19. Timing in this repo makes coincidences too: scorpion's 4.21 at 03:17:11 is 4 min after `e0ba5cf` (03:13:10), but that commit officially scored 5.35. No MAGIC copy has appeared since 05:11 (new map, note 5). Plan for one or two MAGIC copies. |
| TigerTown27 / tigerbyte | confirmed / refuted | proj1 log consistent with the study | - | - | Both stand. The 5.42 (06:00:05) is likely `b116ee0` (profile farm10t75, 05:11:53). No proj1 commit lands within 6 min before it; the new map rests on the later lot merges carrying farm10t75. |

## 2. Team-table corrections

New entrants, from `top_new_map.md`. Behaviour is pending for all of them.

| Team | Mapping | Grade | Consequence |
|---|---|---|---|
| 2696 (5.60) | `shaunkar1/proj1` code, profile f75kite `4374077` | likely (its 4.96 and 5.42 repeat proj1's documented scores in the same order; three f75kite variants were pushed 2.6 min after its 5.60) | Remove it from the MAGIC row. Signature and counters are TigerTown27's (full turn in the first 1.7 s, then a +-109 deg sweep every 5.7 s; gun + laser, never L+Z; free-for-all switch on the first foreign death; hostile-only; laser caution). |
| benchmaster (5.42) | proj1 profile farm10t75 (`a53c31a`, 231 s before) | likely as code, weak as identity | Same. |
| giddygiddyboy (5.35) | proj1, or Kanyaraasi's repo | weak | Archetype read only. |
| sonion (5.27) | none; 5.27 equals r1ver's public `818232c` | weak | Archetype read only. |
| Huss Huss Husss (5.23) | `praggybhat/mech-royale-bot` v6 `2721c5f` (46 s before) | weak, timing only | Archetype read only. |
| Hacktoolz (5.23) | none | - | Archetype read only. |
| Team Inventors (5.15) | none (see section 1) | - | Archetype read only. |

Known teams with newer builds, also from the new map:

- **not even close:** its 5.21 is v20 `75aa5e3`, whose text says practice retreats at 0.3 times the TTUN thresholds
  and the free-for-all keeps them. Its free-for-all play is therefore unchanged.
- **BackwardsDeployeds:** its 5.10 is release r5 `200f59c`; only the compiled wrapper changes between releases.
- **r1ver** `818232c` and **Wolverines** `ae1b122` are as the dossier has them.

Section 2 needs a fourth cluster. **proj1 / "paw":** TigerTown27, 2696 (likely), benchmaster (likely),
giddygiddyboy (weak). Its counters are tiger C1 (finish it on its 35% retreat), C2 (keep our torso off it), C3 (laser
only in its blind or disarmed windows), C7 (drop overwatch) and C9 (keep our laser undischarged near it when we want
quiet). C9 matters because proj1 plays its own beam clock: it steps out only in the 1.5 s after a laser has fired.
If we fire at a third mech near a proj1 copy, we hand it that window. C9 is missing from the dossier.

Smaller fixes:

- Take TigerTown27 off the "Singletons" line.
- The list of unstudied finalists omits #32, "today is yesterday's tomorrow" (4.92). Eight of 32 seats are unstudied.

## 3. Citations checked against the studies

Confirmed as stated:

- A-bot: 125-185 m band, six-hunter break-off, the three-death switch, the 120 m bubble, the 2.75 s / 1.5 s laser
  tunnel, the 325 s / 390 s pins, never airborne, 5.85 m/s, CCW about 200 deg/s, C1-C8.
- AT: 0.40 rad per decision, 66% of beams hit, 2 wins and 5 deaths inside 22 s, the gun dropped between 6 and 60 s.
- BobBuildIt: 79% of beams hit, 61% of its beams hit, 1 of 13 hits beyond 150 m, 7 m/s backing off.
- TigerTown27: all of its row.
- tigerbyte: 68% motionless, 4 of 6 deaths to lasers.
- Wolverines: the quiet phase between the 2nd foreign death and 6 alive, the 150 m flee radius, 230 m gun, 3 s
  spawn spin.
- not even close: 4 s / 40 m hop, 130-160 m band, 2-death switch, 299 s squeeze.
- Mahalas: t mod 4.833 s, the 55 m ring, 378 s, 1.3x power.
- RN SUS: 2.7 s multiples, 125 m horizon, 60% / 91%.
- 404: the 0.6 s damage gap, 49.5 m, under 43% within 195 m.
- ImagineLosing: the 8 m sidestep, 100-165 m.
- 314159265: one death before 60 s, 6 s wall-base wait, 150 m break-off.
- BackwardsDeployeds: 38%, 275 damage in 2.5 s, 3.5 rad/s.
- r1ver: the 25 m stop.

Wrong or overstated:

1. **Lesson 5, strafe.** TTUN's "0.35-1.05 s" is how often it re-draws its strafe side by coin flip, not how often it
   reverses. Its real reversals average about 1.4 s (Wolverines study, "How it fights"; counters_hookup uses 1.4 s).
   A-bot's mean is 0.8 s, exactly our floor. So "five 5.0+ bots reverse faster" is at most four. The floor also rests
   on more than "one unpublished -0.69": M03 -0.69, two losing bundles with 0.4-0.9 s flips (R04 -0.27, R05 -0.59)
   and M04 neutral. No measurement is positive.
2. **BobBuildIt "flag only 0.3-0.6 s".** The study gives a median of 0.60 s and a 10th percentile of 0.30 s, so half
   its releases come at 0.60 s or later.
3. **A-bot has a record.** The A-bot study says no recording exists, and the dossier builds that row from code only.
   But the TigerTown27 study's 11 raw showdown recordings include A-bot LLC 10 times: 6.0 points a match against
   TigerTown27's 9.9. The builds are older, but the threat ranking should use this.
4. **M2 is overstated.** `counters.js` already sets `breakLosOnCharge` for a lightning closer that holds a laser
   (`CT.brk = s.laser`). Only the "hide within 2.4 s" routing is missing.
5. **A5's member list contradicts its trigger.** The trigger requires "gun always listed", but AT and Lance (once it
   holds both specials) drop the gun.

## 4. Backfires: the same signature, a different bot

| # | Rule | Backfires against | Fix |
|---|---|---|---|
| B1 | M7 and A1: "flag-to-beam under 0.65 s means an early releaser, so hold 150-190 m instead of ducking" | Any full-charge laser with Fast capacitors: one stack gives 0.56 s, two give 0.42 s (`hello.config.upgrades`). TigerTown27 takes this upgrade 4th; strong, cubed mechs take it first. A full-charge bot whose charge began out of our sight also shows a short time. | Reject M7 as written. Read "early release" only if the flag was seen from its first tick and the same mech has also released at 0.70 s or later (proof it has no upgrade). Otherwise duck. |
| B2 | Rule 1: hidden within 0.6 s of a flag | The same capacitor stacks (0.56 s, 0.42 s). | Hide budget = that mech's measured charge time minus 0.1 s, defaulting to 0.42 s for a laser holder with 3 or more cubes (two offers possible). Without a hide cell in reach, fall back to D4's velocity change. |
| B3 | Rules 1 + 2 together | Our own charge. The protocol halves our speed while charging, and the A-bot study says no boost either, so a 6 m hide cell takes about 1.0 s. | Off-axis charging in the open only with a hide cell within about 2.5 m. Otherwise release, then hide. |
| B4 | A6 / M4: healer sub-read leads to a harvest from 150-190 m at 50-91% hp | Every mech regenerates 45 HP/s after 5 s without damage (protocol), so the "healer" signature is a state, not an archetype. It is shared by proj1's 35%-to-80% retreat, A-bot resting (it engages when hurt), the Lance 38% heal and TTUN heals. Shooting a proj1 copy at 50% or more makes the best free-for-all family hostile for 25 s. | Gate any harvest at target hp of 40% or less (tiger C1; rule 8's finish clause). |
| B5 | A7: first-strike beam on a farmer at any hp | The farm stop at 13-16 m belongs to proj1 (14-15 m) and RN SUS (13-16 m), both hostile-only or ignoring non-hostiles. Tiger C3 uses the crate window only on a target we already want. | Exclude 13-16 m stops, or require target hp of 50% or less, or that it has fired at a mech in the last 30 s. In code `FM/strike` is level 2, so D11 decides and the module is safe; fix the text. |
| B6 | A6: the 2 s no-return self-check | A bot that cannot see us does not return fire: A-bot never shoots unseen shooters, proj1 has limitation 14, Lance stops firing on an unseen hit. So "no return" can mean "never saw us". | Count it only if we were inside its wedge, in range, with line of sight. Note also that the probe is never ordered: HD level 0 forbids first shots, so `nReact` stays 0 and `HD/harvest` is unreachable in code. |
| B7 | Rule 3: third party on any busy mech | D11 is binding and allows a first shot only at a busy mech under half hp. Rule 3 drops the hp gate; the module keeps it (opportunistic defers to D11). | Keep D11's gate, or label rule 3 as a D11 change graded [model]. |
| B8 | A6 harvest, A7 strike, A8 steady-leg shots | Rule 8 and S1 ("winners finish, they do not start"): all three open on mechs that have not shot us. | Say which wins. My recommendation: rule 8, plus the hp gates above. |
| B9 | A2: laser + lightning chaser read | Laser + lightning is the end loadout of 6 of 7 recorded winners and our own free-for-all pair. Late in a match the read fires on several mechs at once, so every route gets constrained and we turn passive. | Require the closing-speed condition, and keep the 15 s drop rule. |
| B10 | Rule 3 / A5: "never inside 45 m" | The sensors upgrade raises all-round awareness to 60 or 75 m and vision to 225 or 250 m. | Treat it as 75 m for mechs with 6 or more cubes. Also, gyros break AT's "exactly 0.40 rad per decision" fingerprint (0.52 / 0.68 rad). |

## 5. Can each rule run on observable data alone?

Mostly yes: aim, charging flag, hp (`show_enemy_hp` is true), cubes, weapon kinds, `beams[].by`, positions,
`alive` and the zone are all listed. Gaps:

- Flag-to-beam timing needs the first tick of the flag (B1).
- A heard beam has only a bearing and a coarse distance. With two laser holders on one bearing it cannot be pinned
  on either: re-expose only on a listed beam or a sound we can attribute.
- Rule 9's "every mech within 200 m" means only listed mechs (5 s memory).
- "Its switch at 3 foreign deaths" (A-bot) and "2 foreign deaths" (Wolverines) are their own counts. Approximate
  them with `alive` minus the kills each made, which we cannot fully see.
- Upgrades are invisible except plating, which shows in `max_hp`. Every fixed distance and timing is a lower bound.

## 6. Measured evidence and the practice score

- **The module is inert in SQUAD.** `env` must equal 'FFA' exactly, and stance sets only 'FFA' or 'SQUAD'. The hookup
  reports 127,500 calls returning neutral advice. The one remaining path is a false latch: D12 alone gave 0 in 96
  practice matches, the clue counters 1 in 96. Keep `beamClue` and `gunlessClue` off; SELECT already has them off.
  `update` runs every tick in SQUAD too (mean 41-61 us, p99 up to 146 us, garbage-collection spikes of 2-8 ms).
  Re-measure the worst answer under the one-CPU quota (12-14 ms today) once it is wired.
- **Section 5 must say "FFA latch only; SQUAD bit-identical (D0)".** Leaked into SQUAD, the rules would cost:
  - Rule 6's sub-second-reverser clause would cap the gun at 75 m against every house bot. They reverse about every
    0.8 s (S06) and hunt from 100-150 m, and the gun did 52% of damage in recorded live matches (S07).
  - Rule 1 is the cover/peek bundle that lost 0.71 (A17).
  - Rules 4 and 9 are hiding (A13 -0.69 and the rest of the A series).
  - Rule 2 conflicts with D8 (direct laser aim from 80% charge), and there is no evidence that house bots duck lasers.
- **M11 cannot work as written.** The latch needs the 3rd foreign death (median 18 s, range 9-54 s; in 11 showdowns
  the third came by 19 s). D0 requires SQUAD behaviour until then. So the opening, when the bottom half dies (median
  21 s), runs on D0's 40 s guard and SQUAD logic, never on section 5. The only lever is a rule that works in both
  postures (redteam_final row 1), and it must also pass the practice score.
- **Section 4 is not inert:** every lesson needs its own one-change submission. Specific points:
  - **Lesson 1.** Update the curve: 4 cubes / 50 s 5.19; 6 / 75 s 5.31; **10 cubes or 75 s 5.42 (farm10t75)**;
    10 / 130 s 5.10; and 2696's 5.60 is the proj1 profile f75kite (likely; content unread). That makes it [T].
    Do not copy "answer only a hit inside 100 m": it contradicts D0 (answer any hostile at once) and is proj1's
    own exploitable limitation 9. Lengthen only the no-first-fight part. The guard runs before any latch, so it
    also governs the final's opening.
  - **Lesson 5.** Measured direction is negative (section 3, item 1).
  - **Lesson 19, the spawn hop.** It cannot be limited to one posture (no latch is possible before 4 s), so it
    also plays in the final. There NEC's own simulator rates it -0.7 places, NEC study C1 is a "spawn tag" counter
    against it, and airborne mechs are hit 92% against 57%. Drop it, or accept that cost knowingly.
  - **Lesson 3, retreat.** NEC's v20 got +0.13 with 0.3 times the TTUN retreat thresholds, within its own 0.12-0.18
    salt noise. That is consistent with "keep D3's retreat", and weak.

## 7. Edits to make in the dossier

1. Rows 1, 6, 7, 11, 13, 14 and 19 and the clusters: as in section 2. Add the proj1 cluster; take 2696 off MAGIC.
2. Change the kyoto-max row to confirmed `8241a6c` (v19 has a free-for-all mode); scorpion to medium; Team
   Inventors to none; 314159265 to "31st, inside the cut, at risk".
3. Fix lesson 5, the BobBuildIt release figure, the A-bot record, M2 and the A5 member list (section 3).
4. Rule 1: hide budget from the measured charge time, default 0.42 s; restore the A-bot C2 timers (2.9 s after a
   seen flag, 4.3 s after leaving its line, then a 0.6 s peek). "Never on a timer alone" can strand us in cover
   after a beam we missed. Add the half-speed caveat to rule 2. Reject M7 as written.
5. Gate A6 harvest, A7 strike and rule 3 as in B4-B8. Add tiger C9 for the proj1 cluster.
6. Head section 5 with "FFA only; SQUAD bit-identical", and replace M11 with the pre-latch statement in section 6.
7. Lesson 1 numbers and the D0 conflict; lesson 19 and its free-for-all cost.
