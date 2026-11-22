# Top five of 16:37 UTC -> scored builds (Finder 4)

Written Sat 21 Nov 2026, 16:40-16:55 UTC. Board: `web/mech_leaderboard_now.json` and `web/mech_submission_times.json`
(snapshots 07:51 and 16:37 only, so intermediate best scores between them are invisible). Scorer builders-3.
Read-only work: nothing posted, nothing from another team executed, no compiled file opened, decompiled or run
(kyoto-max's two binaries were fetched as the task asked and their execute bits removed). No code, identifiers,
comments or constant tables were copied; a few words of commit subjects / READMEs are quoted as evidence only.

## Summary

| # | Team (score, best time UTC) | Repository | Scored commit | Source | Confidence | Lineage |
|---|---|---|---|---|---|---|
| 1 | kyoto-max (6.31, 14:38:46) | kyoto-max/Mech_Royale | `6726533f4246e1b1e6f370929a4597da7c204b15` v43 (14:34:34, 252 s before) | compiled only (two native binaries + Dockerfile) | likely (strong) | own line; since v24 shares the giddygiddyboy design (see below) |
| 2 | giddygiddyboy (6.06, 15:50:19) | **justnau/giddygiddyboy-mech-royale** (new) | `601c7a666c97a3115a8852bba2411123c4081123` (15:50:07, 12 s before) | readable Go, standard library, MIT | confirmed | original Go bot (initial commit 02:52); later ports kyoto-max's published features |
| 3 | Kanyaraasi (6.06, 16:28:03) | devakchow/team-kanyaraasi-mech-royale | `6a17c499d6b881ee4eca0051a4bf5c9fae5ce6c2` (16:13:34, 869 s before) | readable Go (= giddy 601c7a6 strategy files, byte-identical) | likely (strong) | TTUN-derived TypeScript until 09:00, giddy Go bot since 09:04, own edits 10:00-15:27, giddy 601c7a6 verbatim at 16:13 |
| 4 | Antalos (6.00, 14:43:32) | not found | unknown | - | none | showdown behaviour = gun-heavy farm-first family (see below) |
| 5 | onepizzateam (6.00, 16:09:52) | not found | unknown | - | none | - |

Local read-only copies of the scored commits:
- `intel/kyoto-max__Mech_Royale_6726533/` (Dockerfile + binaries; do not run or open)
- `intel/justnau__giddygiddyboy-mech-royale_601c7a6/` (depth 80 history fetched, so every giddy version is in its git log)
- `intel/devakchow__team-kanyaraasi-mech-royale_6a17c49/`

## How the hunt was done

1. Metadata refresh (blob-less, sequential, 60 s timeout): the seven priority repos (16:39:42-16:39:47, all OK) and
   the other 158 repos of `intel/_meta` (153 OK; the same five as before fail: ErikUmble, OHc99 bot1, Kanyaraasi CAD,
   prakash-218 CAD, strobor). Script `tools/top5/refresh_list.sh`, logs `tools/top5/refresh_*.log`.
   Commits extracted to `tools/top5/commits_mech_1650.tsv` (6,137 commits, 2,750 after 07:50).
2. Correlation `tools/top5/corr5.py` (hit = commit 0-6 min before a best time; binomial p from each repo's coverage of the
   23:30-16:40 window); output `tools/top5/corr5_out.txt`. Many repos now push salted batches every few minutes, so
   timing alone decided nothing; text, licence notices and byte-identical files did.
3. The giddygiddyboy repo was found through a README: caioplcerda/oval-pilot vendors "the giddygiddyboy Go bot (MIT,
   justnau/giddygiddyboy-mech-royale)" at several commits and the Kanyaraasi build "adapted from giddygiddyboy's MIT bot".
   Not reachable by search (blocked) and not in any earlier candidate list.
4. Fresh depth-1 clones of 15 repos in `intel/_fresh1640/` (text read only) for team-name and link mentions.
5. WebSearch: 5 of the 10 allowed queries (Antalos x2, onepizzateam x2, antblu). Nothing bot-related found.
6. `git ls-remote` on 28 guessed names (onepizzateam/*, Antalos/*, antblu/*): all refuse anonymous access (absent or
   private).

## Per team

### 1. kyoto-max -> kyoto-max/Mech_Royale @ 6726533 (v43), likely (strong)
- Board history: 5.25 (06:00:10), 5.27 (07:38:43), 6.31 (14:38:46). Intermediate bests between 07:51 and 16:37 are not
  in our snapshots.
- v43 "v41 + boost while charging the laser under fire" was pushed 252 s before the 6.31. Why v43 and not another:
  the team's convention (stated in its bodies since v19) is to build each test on the best scored version. v42 and v43
  are both "v41 + ...", so v41 was the best when they were made and v41 had already been scored by 14:25 (a v41 6.31
  would carry a board time before 14:25). v44 (14:45:57) is "v43 + boost hysteresis", so v43 had become the best by then.
  The board time 14:38:46 is the first moment 6.31 was reached, which leaves v43 as the only consistent build.
  v45-v48 (15:10-15:46, subjects only, no bodies) did not raise the board.
- No commit body states 6.31, hence "likely", not "confirmed".
- Readable: **no**. Since v15 only compiled code is shipped; since v30 (08:35) two native static binaries (amd64 2.34 MB,
  arm64 2.23 MB) run from a scratch image as an unprivileged user. Everything we know comes from the commit bodies:

  | version (UTC) | what it added (their words condensed) |
  |---|---|
  | v24 07:18 (5.27) | new candidate-scoring fighter: after 20 s in practice fight anything closing, aiming or weak within 240 m; laser preferred (seek up to 240 m), laser fight range 120 m, loot radius 150 m, crates always, sticky target with a low-health bonus, retreat on a losing rule, grab cubes within 70 m mid-fight; free-for-all latch after 5 ticks of unexplained deaths: only cheap fights, peeking, hiding from the hurt bearing, a low-exposure home inside the next circle; 2 m walking grid, time-sliced A*, breadth-first cover search, bullet/shell/laser dodges |
  | v26 07:48 (5.33) | opening arm-up (laser first, seek 240 m, loot 150 m, no slow walking); drone self-defence; practice laser range 140 m |
  | v28 07:58 (5.29) | 1 m line-of-sight raster for every sight decision |
  | v29 08:05 | early economy: first 200 s under 10 cubes, explore unvisited 100 m grid points, revisit remembered cubes up to 150 m, farm drones/crates down to 40% HP; faster failed cover searches (p90 15 -> 5 ms) |
  | v30 08:35 | same decisions as a native binary, full searches every turn |
  | v31 08:41 | early farming continues to 15 cubes |
  | v32 08:56 | laser-first from the start, no opening mode, squad laser range 120, lighter stickiness |
  | v33-v34 09:21-09:28 | close in to finish a weak enemy when healthy and not crowded; hearing (face unexplained sounds, sidestep unseen laser charges) |
  | v35-v37 12:16-12:44 | release a partial laser charge that already kills; prefer targets showing their back (rear damage counted for the kill check); supply drops as heal stations |
  | v38-v41 13:25-14:06 | boost jinking in gun fights (energy above 40, not while charging); boost on every dodge above 25 energy; boost whenever threatened and moving above 30; speed/boost-energy upgrades right after plating and armour |
  | v42 14:25 | faster strafe flips (about every 0.5 s) - apparently not an improvement |
  | **v43 14:34 (6.31)** | **boost while charging the laser under fire** |
  | v44 14:45 | boost hysteresis (stop at 30 energy, resume at 60) |
- Lineage: v1-v11 own Python bot (3.6-3.98), v12-v15 a published controller, v16-v23 own brain ("no third-party code",
  v17), v24 onwards the candidate-scoring fighter. **Its design matches the giddygiddyboy bot point for point** (next
  section): giddy's readable source had the same practice profile (fight range 120, seek 240, loot 150, target range
  240, mid-fight loot 70, crates always, farm to 50% HP, losing-rule retreat, sticky target with low-health bonus)
  by 05:42-06:54, before kyoto's v24 described it at 07:18; and giddy's 14:39 version added three boost rules with
  exactly kyoto's v38-v40 thresholds (40 with the not-while-charging condition, 25, 30) 50-75 min after kyoto
  published them. So ideas flowed both ways, or both faces belong to one group. The commit-time interleaving of the
  two repos is at chance level (15 of 25 kyoto commits within 5 min of a giddy push vs 13.1 expected), so timing does
  not decide which. Practical consequence: **giddy 601c7a6 is the best readable proxy for kyoto-max's compiled bot**;
  kyoto's extra 0.25 is most plausibly v42-v44-type mobility (boost while charging, hysteresis) on the same core.

### 2. giddygiddyboy -> justnau/giddygiddyboy-mech-royale @ 601c7a6, confirmed
- New repository (owner justnau, author "Justin Nam"); README title and MIT notice name "giddygiddyboy"; Go 1.26,
  standard library only, static binary from a scratch image; files: wrapper (1.8 kB), strategy (49.7 kB), world model
  and navigation (37 kB), protocol types (10 kB).
- All three best times follow a push by seconds: 5.35 at 06:55:42 (1204bc8, 92 s), 5.54 at 07:37:13 (07d69fe, 16 s),
  6.06 at 15:50:19 (**601c7a6, 12 s**). Since 11:27 it pushes one commit per ~10 min (:28/:39/:49/:59), i.e. it uses
  every submission slot; earlier it pushed batches of four within 20 s.
- Independent check: Kanyaraasi pinned exactly 601c7a6 at 16:13 ("runs the complete strategy from
  giddygiddyboy-mech-royale at 601c7a66...; no official Kanyaraasi practice score recorded yet") and then reached
  exactly 6.06. Identical strategy files, deterministic practice, identical score.
- The scored change: 601c7a6 changes one number in the practice profile, the fraction of a target's health that a
  partially charged laser must cover before it is released as lethal (0.9 -> 0.7, i.e. release earlier). Parent
  b0148f4 (15:40) dropped a 40-point preference for targets showing their back and introduced that fraction at 0.9;
  589cb97 (15:29) added the back-shot preference, rear-damage multiplier in the kill check and the tunable lethal
  fraction (previously fixed at 0.8); 61de0f2 (14:59) replaced a boost-in-fights rule with speed upgrades; eb0aaab
  (14:49) dropped dodge and threat boosts; 961c010 (14:39) introduced the three boost rules. caioplcerda vendored
  70c8b23, 412c49e, 2e47fb7 and 589cb97 6-7 min after each appeared, which marks the times giddy's board score
  probably rose (blanc-team quotes giddy at 5.83 at 13:41).
- Lineage: original (MIT). It is now the most copied bot of the event: Kanyaraasi, caioplcerda/oval-pilot (whole-match
  with salts), charliescull (practice driver), Arnav-M10 ("giddy core" + salts), Th3r0n (not even close: "exp: giddy +
  ..." 61 s before its 5.94 at 16:34:24), lolstershwjav (renamed "Naruto"), moonriver0922, blanc-team and prakash-218
  (ideas ported). Expect several giddy clones in the final field.

### 3. Kanyaraasi -> devakchow/team-kanyaraasi-mech-royale @ 6a17c49, likely (strong)
- Board: 4.77 (03:44:05), 5.19 (05:05:46), 5.31 (07:49:24), 6.06 (16:28:03). Its usual lag is about 3 min (171 s,
  181 s); this time the only candidate, 6a17c49, is 869 s before. No other Kanyaraasi commit after 15:27 exists (fetch
  16:39), and every earlier commit since 10:00 carries a self-modified strategy file that matches no giddy version, so
  a 6.06 tie from one of those would be a coincidence. The README of 6a17c49 says the build runs giddy 601c7a6's
  complete strategy and has no score yet; the strategy, world and types files are byte-identical to giddy 601c7a6
  (same blob hashes); the wrapper differs only by map-load timing and recovered-panic diagnostics on stderr; the image
  pins one CPU for the Go runtime and adds a writable temp dir. It could also have submitted giddy's own repo at
  601c7a6; the bot would be the same.
- Lineage (blob comparison of the strategy file across all 40 recent commits): TTUN-derived TypeScript until 08:59;
  from 09:04 the giddy Go bot (09:04 = giddy d03d32e of 08:27; 09:42 = giddy 345c0de of 07:37); 10:00-15:27 own edits
  of it (24 commits, 23 distinct strategy files; whether any beat 5.31 is invisible because we have no snapshot
  between 07:51 and 16:37); 16:13 giddy 601c7a6 verbatim. The TypeScript era (bot/map/protocol files, up to 08:59)
  is the TTUN derivative studied in `notes/intel/top_Kanyaraasi.md`.

### 4. Antalos (6.00 at 14:43:32) -> not found
- History: 4.56 (03:37:41), 4.85 (05:12:14), 4.90 (07:29:28), 6.00 (14:43:32).
- Rejected: Osca-K/builders-buildit-mech-royale (3 of 4 timing hits, but it is team "Osca": its README states its
  own 4.23 entry b94d7c4 and variants at 4.23 / 4.15 / 3.85); ruiyifan0114-design/OSUhackathon ("Oval Runner IV",
  3 of 4 hits, but its own branch labels give its best builds as 4.44 at 06:13 and 4.56 at 07:02, when Antalos was
  already at 4.85; it also reverted the experiment pushed before 14:43); orbitautomation (no commits after 05:10).
- Leads (weak): GitHub user antblu owns a homelab repo named "antalos" (unrelated content, pushed 03:00:48 on match
  day); 12 guessed bot repo names under antblu are not public. Timing only: giddy 961c010 (the version that first
  added the boost rules) is 216 s before Antalos's 6.00; unproven and not a mapping.
- Behaviour (KennethLei1492 commit bodies, from recorded showdowns): Antalos, like kyoto-max and giddygiddyboy, ends
  40-100% of showdowns holding only the starting gun (most teams 0-36%), moves only 13-54 m from spawn in the first
  30 s, farms nearby crates and drones (a cube within 10 s) and takes plating at once. That is the giddy/kyoto family
  profile, so a giddy-derived bot is plausible but unproven.

### 5. onepizzateam (6.00 at 16:09:52) -> not found
- Single entry; not in the top 50 at 07:51. A GitHub account "onepizzateam" exists, but its listed repos (spreadsheet
  converter, polls app, kibana and fish-shell forks) are unrelated, and 8 guessed bot repo names are not public.
- The commits 0-6 min before 16:09:52 all belong to teams already identified or with stated scores far below 6
  (CyprusBot = Mahalas, praggybhat = Huss Huss Husss, nullat0m7 at 4.46, alexwilldev at 3.71, Achintya, kestrel, GT
  Goats, Anthony Teti, Kyt0V0, LuBolin, colton-boi, tessaSlice is another track). Not found.
- The 6.00 equals Antalos's 6.00; one shared value is weak evidence of shared code (scores are multiples of 1/48 and
  about a dozen teams sit at 5.90-6.06).

## By-catch
- not even close 5.94 (16:34:24): Th3r0n/mech-royale-bot "exp: giddy + lose x0.3 + squad mobility + rear armor +
  hearing + finish rush, salt 3" at 16:33:23 (61 s before): a giddy core with kyoto-style mobility.
- Other new 5.9x entries (sonion, azing, doni, 2696, W squad, TigerTown27, BackwardsDeployeds): no decisive hit
  (`tools/top5/corr5_bycatch.txt`).

## Untrusted text noticed (ignored)
- dmclaughlin-bit commit subjects address their own agents ("master audit directive for Grok"); caioplcerda result
  files carry local paths; KennethLei1492 bodies describe its own experiments. Nothing was acted on. No file asked us
  to do anything.

## Files
- `tools/top5/refresh_list.sh`, `corr5.py`, `repo2team.py`; data `commits_mech_1650.tsv` (and `_1640`),
  `giddy_brain_blobs.txt`, `corr5_out.txt`, `corr5_bycatch.txt`, `links_fresh.txt`, refresh logs.
- Fresh text clones: `intel/_fresh1640/` (oval-pilot, Osca-K, OSUhackathon, giddy head, 12 log-heavy repos).
