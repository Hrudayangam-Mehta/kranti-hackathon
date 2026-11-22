# New top-16 teams and new best times -> repositories (Finder 3)

Written 21 Nov 2026, about 07:40 UTC. Board: `web/mech_leaderboard_now.json` (07:17) plus every saved snapshot
(`tools/top10/snaps/`, which adds intermediate best times the merged file lacks; table in
`tools/top10/subtimes_0720.json`, mech track also as `tools/top10/mech_times_full_0720.json`).
Read-only work. Nothing was posted, nothing from another team was executed, no code was copied. A few
words of commit subjects and profile names are quoted as evidence only.

## Summary

| Team (score, time UTC) | Repository | Commit that produced the score | Verdict | Lineage |
|---|---|---|---|---|
| kyoto-max (5.25, 06:00:10) | kyoto-max/Mech_Royale | `8241a6c` v18 (05:59:10, 60 s before) | **confirmed** | own; see below |
| 2696 (5.60, 06:58:15; 5.42 at 05:40:15) | shaunkar1/proj1 (code source; team's own repo unknown) | most likely `4374077` (profile f75kite, 06:49:47) | **likely** | the TigerTown27 Go bot ("paw"), not MAGIC |
| benchmaster (5.42, 06:15:21) | shaunkar1/proj1 (code source) | `a53c31a` (farm10t75 on the 06:11 build, 231 s before) or `b116ee0` | **likely** (code family), identity weak | proj1 |
| giddygiddyboy (5.35, 06:55:42) | shaunkar1/proj1 family suspected; alternative devakchow/team-kanyaraasi-mech-royale | unknown | **weak** | unknown |
| sonion (5.27, 07:12:26) | none found (5.27 equals r1ver's public 818232c) | unknown | **weak / none** | possibly r1ver's TTUN derivative |
| Huss Huss Husss (5.23, 05:49:29) | praggybhat/mech-royale-bot (timing only) | (`2721c5f` v6, 46 s before) | **weak** | own Python bot |
| Hacktoolz (5.23, 06:32:25) | none | - | **none** | - |
| Team Inventors (5.15, 06:58:41) | none (Th3r0n and gokulj-umich considered, rejected) | - | **none** | - |
| TigerTown27 (5.42, 06:00:05) | shaunkar1/proj1 (known) | `b116ee0` profile farm10t75 (pushed 05:11:53) | **likely** | original (Go) |
| r1ver (5.27, 06:46:28) | moonriver0922/mech-royale-planner (known) | `818232c` practice/combat-economy (42 s before) | **likely** | TTUN v8-econ derivative (r1ver line af337d5 -> 2908ccb -> 818232c) |
| not even close (5.21, 07:06:49) | Th3r0n/mech-royale-bot (known) | `75aa5e3` v20 or one of its six salted copies (21 s before) | **likely** | own controller with a TTUN-derived economy core |
| Wolverines (5.21, 05:31:17) | varchaskukreja/TTUN (known) | `ae1b122` mech-royale-exp (196 s before) | **likely** | original |
| BackwardsDeployeds (5.10, 06:01:50) | brycehcmcgrath/mechfight-bot (known) | `200f59c` releases/r5 = main | **likely** | LanceHuang245 controller + own compiled wrapper |

Score statements that would make these "confirmed" were searched for in every commit body of 166 metadata repos
and in the docs of 82 fresh clones: only kyoto-max states its score. I used 8 of the 15 allowed WebSearch
queries (team names with "mech royale", github, buildathon, leaderboard). None returned anything related, the
same as in the earlier hunt, so I stopped there.

## Method and its limits

1. Refreshed commit metadata of every repo in `intel/_meta` (160 OK, 5 failed: ErikUmble/buildathon-mech-royale,
   OHc99/mechfight-bot1, devakchow/team-kanyaraasi-cad, prakash-218/buildathon-cad, strobor/mech-royale) plus
   moonriver0922/mech-royale-planner (added) and the 60 other-track repos in `intel/_meta_other`
   (`tools/top10/refresh_meta.sh`, log `intel/_meta/_refresh.log`). Extracted to `tools/top10/commits_mech_0720.tsv`
   (3,112 commits, 884 after 05:00) and `commits_other_0720.tsv`.
2. Depth-1 clones of the 82 repos with commits after 05:19 in `intel/_fresh0720/` (read as text only).
3. `tools/top10/correlate_new.py` (hit = commit 0-6 min before a best time, coverage-weighted binomial p);
   outputs `tools/top10/corr_full_0720.txt`. With about 160 repos tested per team, p-values near 0.01-0.05 arise
   by chance, so timing alone never decided a verdict here.
4. **Score ties are weaker evidence than the earlier report assumed.** A practice score is total points over 48
   matches, so the board can only show multiples of 1/48 (5.2083, 5.2292, 5.25, ...): there are only about 20
   possible values between 5.2 and 5.6. On today's board 5.42, 5.31 and 5.27 are each held by three teams and
   4.96 by six. A single tie is therefore weak; two ties in the same order are moderate.
5. No exact copy of the public 5.58 bot (Kgc3105/MAGIC-Royale @ 53f6854) appeared in this window: no new team
   scored 5.58, and MAGIC-Royale has had no commit since 05:11:53. No candidate repo's commit text mentions
   MAGIC, Kgc3105 or 5.58. The adoption wave in this window is of the **TigerTown27 bot (proj1)** and of the
   **TTUN line** (Wolverines -> r1ver -> Kanyaraasi, Jiackary's Python port, Th3r0n's economy core), not of MAGIC.

## Per team

### kyoto-max -> kyoto-max/Mech_Royale @ 8241a6c8a61e823467fa1c5160bcadb23a99edbf (confirmed)
- Owner name equals the team name. Commit v18 (05:59:10) is 60 s before the 5.25 at 06:00:10, and the next two
  commit bodies say "On top of v18 (5.25)" and "v19 5.25" (v19 `21bc4fd`, the FFA-only switch, scored the same;
  the board keeps the earlier time). v20 scored 5.19, v21 5.21 (both stated); v22 (07:00:03) combines them.
- Lineage, from its own commit texts: v1-v11 an own Python bot (3.6-3.98); v12-v15 switched to a published
  controller ("pilot.py ... as published", with a third-party licence notice; the same file name exists in
  amoorgy/mech-royale-bot, not verified as the source); since v15 only compiled bytecode is shipped; v16-v17 a
  "new brain on our own map and navigation code", v17 states "No third-party code" (scored 5.06); v18 adds a
  stronger early economy (first 200 s, under 10 cubes: ignore far idle mechs, farm drones lower, revisit
  remembered cubes). So the 5.25 bot is claimed original; it is not MAGIC-derived. Only `.pyc` files are
  readable, so structure could not be compared.
- Its 5.19 at 05:36:12 has no commit within 6 min (v15 was 05:05).

### 2696 -> shaunkar1/proj1 code (likely); team's own repository not found
History from all snapshots: 4.65 (02:05:34), 4.90 (04:45:24), **4.96 (05:32:56), 5.42 (05:40:15), 5.60 (06:58:15)**;
also Blast Radius 216.8 (03:32:24) and Shopping Sessions 0.77 (06:26:34).
- 4.96 is proj1's documented build-6 attack-on-sight score (TigerTown27 board, 05:08 UTC); 5.42 is TigerTown27's
  best (06:00:05), which 2696 reached 20 min earlier.
- proj1's profile lineage reacts to 2696's results: after 5.42 the group promoted profile "farm10t75" (lot merges
  from 06:02:59 carry it; variants farm10t75base/-dmg at 06:03), and **2.6 min after 2696's 5.60** it pushed three
  variants of "f75kite" (f75ret50, f75a220, f75kite130 at 07:00:52-07:01:01). f75kite (`4374077fe0bcfae2ef929e103e591aa3fd71f6cf`,
  06:49:47) is the only new profile commit in the hour before 06:58. This reads as one group testing profiles on
  a spare account and promoting winners (the earlier study already saw more profile pushes than 4 submissions
  per hour allow). Alternative: 2696 is a separate team that adopted the public proj1 repo at about 05:30 (its
  4.65 / 4.90 were then its own bot).
- Timing only (rejected): Jiackary/buildathon_26 hits three times, but its own text says its best was 4.06 at
  03:35 while 2696 already had 4.65; jackbalseca, bsrikumar855-dot, blanc-team state their own much lower scores.
- Lineage: proj1 is an original Go bot (all commits by an AI assistant, compiled-in "squad profiles"); 2696's
  5.60 is a farm-first profile of it, not a MAGIC derivative. The board repo shaunkar1/proj1-agentboard was public
  until at least 06:07 UTC and now refuses anonymous access (private or deleted); our 06:05 copy is in
  `intel/shaunkar1__proj1-agentboard`.

### benchmaster -> proj1 farm10t75 (likely as code, weak as identity)
- 5.42 at 06:15:21 (first ever entry) equals 2696's and TigerTown27's 5.42. 231 s earlier proj1 committed
  `a53c31a155b710dba165f82d80a6ebb20cc6e499` (lot, 06:11:30), which re-pins profile farm10t75 on the build updated at
  06:11:26: exactly the commit one would submit to check that the new build keeps 5.42. Either a third account of
  the same group or an adopter. If it is an adopter, `b116ee0` gives the same profile.

### giddygiddyboy (weak)
History: 4.96 (05:24:48), 5.31 (05:45:45), 5.35 (06:55:42).
- Hypothesis A, proj1: 4.96 then 5.31 is proj1's documented sequence (attack-on-sight 4.96, farm6 5.31 "picked",
  `cefd23f` then `a178c88`), but there is no proj1 commit within 6 min of the first two times, 4.96 is shared by six
  teams, and 5.35 has no proj1 match (f75kite is presumed 5.60).
- Hypothesis B, Kanyaraasi's repo: devakchow/team-kanyaraasi-mech-royale ("Prepare Mech Royale submission",
  15 commits since 03:30) has a commit 201 s, 219 s and 229 s before the three times (`97040d7`, `fd746ff`,
  `4d55601`), the same lag as Kanyaraasi's own 5.19 (171 s). But Kanyaraasi itself is stuck at 5.19, so those
  builds would have to be submitted under a second account, and the README calls them unscored experiments.
- Neither is strong enough for a mapping.

### sonion (weak / none)
History: 4.06 (03:12:28), 4.35 (04:53:34), 5.00 (05:31:21), 5.27 (07:12:26).
- 5.27 equals r1ver's 818232c (public since 06:45:46) and BobBuildIt; adopting r1ver's build is possible but
  unproven. Rejected: Kyt0V0 (commits 7-13 s from 03:12:28 but no commit after 04:21), jerrywang255-spec (own
  text says its best was 3.44 at 04:10), charliescull (S8 at 07:11:13 ships the LanceHuang245 bot unchanged in
  practice, which scores about 4.75, and S1 is only 2 s before 05:31:21).

### Huss Huss Husss (weak)
History: 4.21 (01:04:46), 4.27 (05:10:10), 4.88 (05:25:58), 5.23 (05:49:29).
- praggybhat/mech-royale-bot has commits 47 s, 139 s and 46 s before the last three (v5.2 `4db513d`, `f2f6194`,
  v6 `2721c5f`, the laser/lightning-first build), but the repo starts at 03:27:48, after the 4.21, states no
  official score and names no team. varadanvk (team "droptable" by its README), jmonked ("Team Monked") and
  Spandana00 also hit two or three times; the first two are excluded by name.
- Hacktoolz holds the same 5.23 (06:32:25) but nothing links them (one value shared by two teams is common).

### Hacktoolz (none)
Single entry 5.23 at 06:32:25. No repo with text, name or more than chance timing. Not found.

### Team Inventors (none)
History: 4.48 (05:17:19), 4.67 (05:24:58), 4.90 (06:30:07), 5.15 (06:58:41).
- Th3r0n's v19 text (06:40) quotes "4.48-4.90" for its no-hop builds, the same end points; but those are
  explained as not-even-close's own hidden lower submissions (or simulator numbers), its "5.08" appears on no
  matching board entry, and Th3r0n commits densely. gokulj-umich/gocool-mech hits twice but its README names
  "Team Gocool". Not found.

### Already-known teams: commits behind the new best times
- **TigerTown27 5.42 (06:00:05) -> `b116ee05ec4946482fd0bedfcfe9c4ee30a8773f`** (lot, profile farm10t75, pushed 05:11:53).
  No proj1 commit within 6 min (05:28:35 is the last before); the board at 05:57 reports farm10 = 5.10, and from
  06:02 every lot merge carries farm10t75 and its variants. Same score as 2696 at 05:40 (see above).
- **r1ver 5.27 (06:46:28) -> `818232cebf311289cabc956924cc393eaeb5ff09`** "Coordinate resource gathering and retreat
  in Mech Royale combat", branch practice/combat-economy, 42 s before; parent `2908ccb` (06:33:31, practice/
  retreat-sidestep) on their 5.10 build `af337d5`. Their notes (official-runs.md) were not updated after 03:09.
- **not even close 5.21 (07:06:49) -> `75aa5e38e618d33693c30f9958750392da151a6e`** v20 "practice retreats only when
  nearly dead (TTUN thresholds x0.3; free-for-all keeps them)", pushed with six salted copies at 07:06:28-29,
  21 s before. Which of the seven was submitted is not determinable; v20 itself is first in the chain.
- **Wolverines 5.21 (05:31:17) -> `ae1b1228527e3ce406d9c695426cf6b7a3c0f22b`** "Return to combat at six remaining after
  independent eliminations" (branch mech-royale-exp, 196 s before), built on "Restore the 5.19 Mech Royale bot".
  Later branches mech-royale-sight (06:06) and mech-royale-dodge (06:55) have not improved the board.
- **BackwardsDeployeds 5.10 (06:01:50) -> `200f59cfa26a52bb80675c938e28290057e4f63b`** (releases/r5, 05:20:13). No commit
  within 6 min, but the team moves its default branch only after an official improvement: at 05:46 it pointed at
  the 5.06 build 9c9801e, now it points at r5. Only the compiled wrapper changes between releases; releases r6-r9
  (06:22-06:45) have not improved the board.

## By-catch (lower-ranked teams)
- CEChamps = swan28pande/oval-tools (likely): "Restore the bot that scored 4.21"; that bot `791326a` is 82 s before
  CEChamps's 4.21 (03:33:42).
- "I wish I was admitted by Cambridge" = Jiackary/buildathon_26 (likely): "Make economy (best score 4.06) the main
  bot" at 03:35:09, 75 s after the team's 4.06 (03:33:54); since 05:01 it runs a Python port of the TTUN v8-econ
  bot with its own options (aim, retaliate, a fight-odds model), last best 4.56 at 07:05:29.
- Team names in READMEs: varadanvk = droptable, jmonked = Monked, gokulj-umich = Gocool.

## Untrusted text noticed (ignored)
- shaunkar1/proj1-agentboard README addresses "the agents" with standing instructions (pull, read PINGS.md,
  answer open requests). It is written for that team's own assistants; nothing was acted on.
- Commit trailers in several repos name AI sessions; irrelevant, ignored.

## Files
- Scripts: `tools/top10/refresh_meta.sh`, `fresh_clone.sh`, `correlate_new.py`, `lscommits.sh`.
- Data: `tools/top10/commits_mech_0720.tsv`, `commits_other_0720.tsv`, `subtimes_0720.json`,
  `mech_times_full_0720.json`, `corr_new_0720.txt`, `corr_full_0720.txt`, `active_since0519.tsv`;
  commit bodies and authors in `intel/_triage/f3/`; fresh clones in `intel/_fresh0720/`.
