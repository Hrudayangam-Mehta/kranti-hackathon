# Top-16 teams -> public repositories (Finder 2: names, cross-references, web)

Written 21 Nov 2026, about 05:45 UTC. Board used: practice leaderboard parsed 05:19 UTC, plus the 04:25 UTC
copies of the same page (older best-submission times). Read-only work: nothing was posted anywhere, nothing from
another team's repository was executed, and no code was copied (bot names and a few words of commit subjects are
quoted only as evidence).

## Summary table

| # | Team (score) | Repository | Confidence | Deciding evidence |
|---|---|---|---|---|
| 1 | A-bot LLC (5.58) | Kgc3105/MAGIC-Royale | high | Its own commit text states the previous commit "scored ... 5.58" on the real board, written 05:11 UTC when A-bot LLC was the only team at 5.58 |
| 2 | scorpion (5.58) | Kgc3105/MAGIC-Royale (same code; own repo unknown) | medium | Exact tie at 5.58 (identical code scores identically), reached 5 min after that repo restored its 5.58 version |
| 3 | AT (5.52) | not found (lead: anthonyteti/buildathon-mech-royale, which does NOT hold the 5.52 bot) | low | Initials + same-second timing coincidence only |
| 4 | tigerbyte (5.33) | shaunkar1/proj1 | high | Princeton author, bot announces itself as "paw", both best-submission times fall right after its commits |
| 5 | TigerTown27 (5.31) | shaunkar1/proj1 | medium | Same score as tigerbyte's earlier best (5.31), older best 21 s after a proj1 commit, tiger name |
| 6 | BobBuildIt (5.27) | not found | - | no candidate survives |
| 7 | Wolverines (5.19) | varchaskukreja/TTUN | high | known; receipts in repo |
| 8 | Kanyaraasi (5.19) | devakchow/team-kanyaraasi-mech-royale | high | README title; README says it derives from TTUN; bot name "TTUN-mech"; identical 5.19 |
| 9 | r1ver (5.10) | moonriver0922/mech-royale-planner (scored commits) + moonriver0922/wgsrobot (notes, tools) | high | wgsrobot README links each receipt to a planner commit |
| 10 | Mahalas (5.08) | chriseco427-spec/CyprusBot | medium | "mahalas" is Greek/Cypriot for neighbourhood; both best times follow its commits by 2-4 min |
| 11 | BackwardsDeployeds (5.06) | brycehcmcgrath/mechfight-bot | high | repo description names the team; payload commit 105 s before the 5.06 |
| 12 | ImagineLosing (5.04) | prakash-218/buildathon-mech | low | "v5" commit 85 s before the only best time, later versions build on v5; no text proof |
| 13 | not even close (5.02) | Th3r0n/mech-royale-bot | high | README names the team; bot name "not-even-close"; commit text "(real 5.02)" |
| 14 | 404 Competition Not Found (5.02) | davidvarvas/mech-royale-bot (earlier work in davidvarvas/mech-royale-bot-gpt) | high | Commit text says its B0/B1 builds "scored 4.75 in practice"; B0 commit is 80 s before 404's 4.75; D1 commit 175 s before the 5.02 |
| 15 | RN SUS (4.96) | JosiahAklog/nexus-mech-royale | high | README states an official 4.77 then 4.83; uploads 94 s before RN SUS's 4.77 and 48 s before its 4.96 |
| 16 | 314159265 (4.92) | AbhirajTiwari12/mech-royale-bot | medium | Milestone "G3" commit in the same second as the best time; G3 stayed the played version; aggressive style matches showdown notes |

New repositories found in this pass (not in the earlier candidate list): shaunkar1/proj1,
moonriver0922/mech-royale-planner. Both verified with git ls-remote and shallow-cloned.
Also cloned for reading (depth 1): every remaining row of tools/top10/candidates.tsv (131 repos, no failures),
so intel/ now holds about 165 clones.

## Important caution about timing evidence

Commit-time proximity alone is weak. A cross-check of seven repos against every leaderboard row (four tracks,
two snapshots) gave each repo 10-40 rows within 150 s of one of its commits, including several within 2 s that
are certainly false (for example a Kyt0V0 commit 1 s from team Osca, whose repo is Osca-K's). So in the table
above timing is only counted when a second, independent kind of evidence agrees (text in the repo, a stated
score, a name link, or an exact score tie).

## Per team

### A-bot LLC (rank 1, 5.58 at 03:37:53 UTC)
- Repo: Kgc3105/MAGIC-Royale (TypeScript on Bun, about 96 kB of source, bot name "magic-royale", commits authored
  as "magic-royale", time zone +05:30).
- Evidence: head commit e39579f (05:11:53 UTC) is titled "Restore the 5.58 settings" and its body says the
  previous commit scored 5.17 on the real board against 5.58 before it. At 05:11 UTC the only team that had ever
  scored 5.58 was A-bot LLC. The 5.58 commit is 53f6854 (03:30:03 UTC), 7 min 50 s before A-bot LLC's best time.
  dmclaughlin-bit's log independently records the board leader moving 5.48 -> 5.58 at 03:39 UTC.
- Its own notes on what worked: a parameter search over a home-made simulator; fighting on harder (break off
  only when heavily outnumbered, keep charging the laser at any health); long-range laser kiting; a switch to a
  hide-first posture once deaths it did not cause show the match is a free-for-all. It also records that the
  simulator overrates never retreating (5.17 real).
- Tried: name variants ("a-bot", "abot", "llc") in all clones, READMEs, commit logs: no hit. Web: no hit.

### scorpion (rank 2, 4.21 at 03:17:11, then 5.58 at 05:17:03 UTC)
- Best explanation: scorpion's 5.58 entry is the Kgc3105/MAGIC-Royale code. Practice is deterministic
  (several teams report identical code gives an identical score), scorpion reached exactly 5.58, and it did so
  5 min 10 s after that repo restored its 5.58 version. Either the same people run two team accounts, or
  scorpion ran the public repo (as other teams did with the Wolverines bot).
- scorpion's earlier 4.21 does not look like this code (the repo's own simulator numbers for the commit before
  the 5.58 one are far above 4.21), so scorpion probably also has its own repository, not found.
- Tried: "scorpion" in all clones, logs, candidate lists, bot names: no hit. Web: no hit.

### AT (rank 3, 5.52 at 03:43:50 UTC; 5.48 by 02:55; an early 5.17)
- Not found. r1ver's notes (02:55 UTC) also say AT's and BobBuildIt's public repos were "not yet verified".
- Lead 1 (low): anthonyteti. Four repos (mech, shopping, blast radius, CAD) were created 03:43:50-03:44:04 UTC;
  the mech one in the same second as AT's last improvement. AT is on all four tracks and none of its four
  best times is later than 03:43:50; team "Anthony Teti" appears on the boards only after that, and its mech
  best (4.46 at 05:17:50) is 22 s after that repo's "Bot v7" commit. So the repo is team "Anthony Teti"; the
  code in it is a fresh build (v0 at 03:52 UTC to v7) and is not the 5.52 bot. Whether the same person was
  behind AT is unproven.
- Lead 2 (low): AbhirajTiwari12 (initials), but that repo fits 314159265 better (see below).
- Showdown fingerprint for AT from dmclaughlin-bit's recorded casts (two wins): ends on laser + lightning (in one win it had a laser 4 s after the start), almost never moves quietly, picks
  leg-speed and laser-damage upgrades early, and both wins ended at 140-150 s. No cloned repo could be tied to that pattern cheaply.
- Tried: "AT" as a table entry in all notes; initials against owners; web: no hit.

### tigerbyte (rank 4, 5.31 at 04:03:41, 5.33 at 04:58:47 UTC) and TigerTown27 (rank 5, 4.73 at 00:30:43, 5.31 at 05:04:39 UTC)
- Repo: shaunkar1/proj1 (Go, all commits authored by an AI assistant, branches main / lot / exp-pracaggro).
  Found through shaunkar1/harrier-sparring-bot, whose README calls proj1 "your competition team's" repository
  and whose commits carry a Princeton address (Princeton Tigers). The bot's announced name is "paw".
- Timing that agrees: the only proj1 commit between 03:39 and 04:27 UTC (a kiting profile, 04:02:30) is 71 s
  before tigerbyte's 5.31; a burst of four profile commits at 04:58:44-52 brackets tigerbyte's 5.33
  (04:58:47.7); TigerTown27's older 4.73 is 21 s after a proj1 commit (00:30:22); TigerTown27's new 5.31
  equals tigerbyte's former best exactly. A third team, TigerBuild (4.04 at 01:34:00), is 2 min after the
  exp-pracaggro commit.
- Reading: one group feeds several team accounts from one repo. It pushes many compiled-in "squad profile"
  variants per burst (up to 15 in 13 minutes), more than one team's 4 submissions per hour allow.
- Tried: "tigerbyte", "tiger town", "tigertown27" everywhere: only showdown data (TigerTown27 won one cast:
  kept gun + laser, armour-first upgrades). Web: no hit.

### BobBuildIt (rank 6, 5.27 at 03:03:29 UTC; 5.25 earlier; on all four tracks)
- Not found. "Bob the builder" in Achintya-Lakshmanan's showdown notes is a different mech (different average
  placing from BobBuildIt in the same paragraph). VivekRnx/bob-the-builder-2026 has no commit between 01:00 and
  04:21 UTC, so it cannot be the 03:03 submission. Osca-K/builders-buildit-mech-royale is team Osca (4.23).
- Tried: "bob", "buildit" in owners, repo names, READMEs, bot names, commit logs; owners with repos on several
  tracks (h-ardy, fernando-ace, mike200004, orbitautomation, joshuamuellenbach25): nothing consistent. Web: no hit.

### Mahalas (rank 10, 4.88 at 03:45:27, 5.08 at 04:44:49 UTC; also first on Shopping Sessions)
- Repo: chriseco427-spec/CyprusBot (Rust, 20 commits, bot name "quietstorm").
- Evidence: name link (Cyprus; "mahalas" is the Greek/Cypriot word for neighbourhood); a commit 130 s before
  the 4.88 and a merge 216 s before the 5.08. That merge adds a practice-only rush for a laser at spawn and
  swapping lightning for a laser, which is the kind of change that would add the 0.2.
- Alternative not excluded: 5.08 is also the score r1ver recorded for one TTUN-derived variant, so Mahalas
  could be running that public code. mahathio/mechfight ("maha" prefix) was checked and rejected: last push
  02:59 UTC, before either Mahalas time.

### ImagineLosing (rank 12, 5.04 at 02:30:59 UTC; Blast Radius 206.6 at 03:30:41)
- Best candidate (low): prakash-218/buildathon-mech (Go). "v5" (weapon rush) was committed 85 s before the
  best time; its later v6 and v7 are described as ties with v5 and built on v5, matching a best that never
  moved; earlier real scores stated in its commits (3.98, 3.85, 3.27) show it was on the board. The same owner
  has a Blast Radius repo whose second version precedes ImagineLosing's blast best by 12 min.
- Alternative: Kyt0V0/Mech-Royale (Rust, commits as "ironbuckeye") pushed an experiment set 3.5 min before the
  best time and later made its "no hunting" experiment the standard bot. Also team SaturdayNightLive (4.04 at
  02:33:12) could be the owner of either repo instead.
- Tried: "imagine", "losing" everywhere: no hit. Web: no hit.

### 404 Competition Not Found (rank 14, 4.75 at 02:55:20, 5.02 at 04:28:27 UTC)
- Repo: davidvarvas/mech-royale-bot (Python; earlier line in davidvarvas/mech-royale-bot-gpt, real 4.08).
- Evidence: commit B0 (02:54:01 UTC) rebuilt the bot on LanceHuang245's published 4.75 configuration; a later
  commit says B0 and B1 "both scored 4.75 in practice"; 404's 4.75 came 80 s after B0. At 03:56 UTC they
  withdrew those builds "under the no-code-sharing rule" and went back to their own code; commit D1 (04:25:33)
  is 175 s before the 5.02. Showdown fingerprint (hull plating three times, then armour, laser + lightning)
  matches their stated no-mortar, plating/armour-first choices.
- The equal 5.02 of "not even close" appears to be a coincidence of values.

### RN SUS (rank 15, 4.77 at 04:08:05, 4.96 at 04:53:59 UTC)
- Repo: JosiahAklog/nexus-mech-royale (Python with a small compiled map helper; files uploaded through the web
  UI; bot name starts "NEXUS").
- Evidence: the README copy from about 04:45 UTC says the build is based on "V24 (official score 4.77)"; the
  04:53 README says "V26 (4.83)" is the latest confirmed result. RN SUS is the only team that held 4.77 with a
  04:08 time, and uploads precede both of its best times by 94 s and 48 s.

### 314159265 (rank 16, 4.92 at 02:10:49 UTC)
- Repo: AbhirajTiwari12/mech-royale-bot (Python, 53 commits, bot name "kestrel").
- Evidence: the "G3" milestone commit carries the same second as the team's best time; every later "play"
  commit is still G3 with a fresh hash (so the best time would not move); the repo's line of development is
  explicitly "hyper-aggressive", and Achintya-Lakshmanan's showdown notes describe 314159265 as an aggressive
  booster that dies early. No text in the repo states a score or team name, hence medium.

### Already known, re-checked
- Wolverines = varchaskukreja/TTUN. Kanyaraasi = devakchow/team-kanyaraasi-mech-royale (TTUN derivative, keeps
  r1ver's ground-clearance change). r1ver: note that the scored commits are in moonriver0922/mech-royale-planner
  (branches practice/*), while wgsrobot holds notes and tools. BackwardsDeployeds = brycehcmcgrath/mechfight-bot
  (a teammate's repos: joshuamuellenbach25, other tracks). not even close = Th3r0n/mech-royale-bot.

## By-catch: lower-ranked teams (useful as sparring opponents)
BingBU = niranjankumarnk/mech-royale; fortnite pirate token = jklein07/mech-royale-bot; 5-hour limit reached =
micah-andelman/mech-royale; GT Goats = atharvatripathi2026/gtgoats_mech_royale; Team-Xero =
arnabxero/xero-mech-royale; Overcooked = viktor-lorentz/mech-royale-overcooked; Eagle Eye =
shanmukha-here/eagle-eye-mech-royale; Osca = Osca-K/builders-buildit-mech-royale; whyMiso =
whyMiso/buildathon-mech-royale; oneteam = Russell-Day/builders-mech-royale (bot name); Goonies =
koillea/mech-royale-goonies; Fraun = mliao0128/fraun-ringkeeper; SophiaOmri = wzardomri/buildathon-mech-royale;
@GMUNVIS = SuperHuyGaming/mech-royale; STARLIGHT = Sharmileer/mech-royale; Monked = jmonked/monked-mech-royale;
unos = zuhayrkabir/unos-mech; MECHX = SeanCowen/oval-runner; Anthony Teti = anthonyteti/buildathon-mech-royale;
"2.3%" = bzells11/Mech-Bot-Repo-.

## Patterns worth knowing for the counter-attack stage
- Score ties reveal shared code: 5.58/5.58 (A-bot LLC, scorpion), 5.19/5.19 (Wolverines, Kanyaraasi),
  5.31/5.31 (tigerbyte earlier, TigerTown27). At least two groups appear to run more than one team account.
- Several top entries are derivatives of the Wolverines economy bot (Kanyaraasi, r1ver, parts of "not even
  close"), so one counter to that bot's habits covers several finalists.
- A-bot LLC and the tiger teams tune "fight more" profiles against the house squad and switch behaviour when
  they detect a free-for-all; their practice score says little about their free-for-all play.

## What was tried
1. Text search of every clone, README copy, candidate list and commit log (about 160 mech repos, 60 repos of
   the other three tracks) for each team name and variants. Direct hits only for teams already known.
2. Commit-message mining for stated real scores: found the 5.58 statement (Kgc3105), "(real 5.02)" (Th3r0n),
   "scored 4.75" (davidvarvas). README mining: found 4.77/4.83 (JosiahAklog).
3. Announced bot names from 129 clones compared with team names: hits for Th3r0n, devakchow, Russell-Day.
4. Cross-references inside other teams' notes: r1ver's notes gave mech-royale-planner; micah-andelman's credits
   gave BingBU; shaunkar1's sparring-bot README gave proj1; dmclaughlin-bit's cast data gave showdown
   fingerprints for AT, TigerTown27, 404, BackwardsDeployeds, Mustikas.
5. Other-track boards: AT and BobBuildIt are on all four tracks, Mahalas leads Shopping Sessions, tigerbyte and
   ImagineLosing are on Blast Radius. No other-track repo could be tied to them by text.
6. Web search, 12 queries (team names with "Mech Royale", "Buildathon", "mechfight", "github", "linkedin",
   "devpost", the event site name, and the handle Kgc3105). Every query returned unrelated pages: the event is
   not indexed. Stopped there.
7. Not done, by rule: any GitHub search, user or fork listing. Two repo names were checked with git ls-remote
   only because another team's README named them.

Files: scripts in tools/top10/f2_*.py and f2_clone_all.sh; raw text dumps (commit subjects, bodies, authors,
bot names) in intel/_triage/f2/; clone log in intel/_triage/f2_clone.log.
