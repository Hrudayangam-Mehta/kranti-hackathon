# Team "67": repositories and scored commits (Builders Buildathon)

Written 2026-11-21 ~17:05 UTC. All times are UTC. Read-only work: anonymous `git fetch --filter=blob:none`
of named public repositories plus 8 WebSearch queries. Nothing was posted anywhere, and nothing from any
repository was executed.

## Bottom line

| Track | Repository | Scored commits (leaderboard time -> commit) | Confidence |
|---|---|---|---|
| Databricks - Shopping Sessions | `github.com/jason-scheffel/express-lane` | 06:15:29 (0.59 s) -> `7c4bd06`; 07:17:30 (0.48 s) -> `e10a4c7`; 16:00:34 (0.30 s) -> `92cf412` | **High** |
| RWX - Blast Radius | not found | 04:10:59 (151.8), 07:24:02 (151.4), 15:10:25 (130.3): no matching repository | none |
| Machina - CAD De-ID | not applicable / not found | This track takes an **S3 folder of one attempt**, not a GitHub repository (`submission_kind: "file"`, max 256 bytes), so there are no scored commits. No 67 code repository was found. | n/a |

The GitHub account behind 67's Shopping Sessions entry is **`jason-scheffel`** (commit author "Jason Scheffel"). The chat on
the leaderboard page refers to 67 as one person ("when he wakes up"). The blast-radius entry is almost certainly another
repository under the same account, but I could not find its name with the allowed methods (see "Gaps").

## Evidence for express-lane = team 67

1. **The LICENSE names the team.** It says `Copyright (c) 2026 Team 67`.
2. **A third party credits it to Team 67 by commit.** `Js-Hwang1/buildathon_databricks` (team "Junsung Hwang", 2nd on Shopping
   Sessions at 0.31 s) has about 30 commits that import and benchmark express-lane revisions, labelled "Team 67". Examples:
   - 11:16: "Unchanged Team 67 source ..., Upstream: https://github.com/jason-scheffel/express-lane, Original: e20d7b5"
   - 11:25: "Unchanged earlier Team 67 comparison" (2a0f288). 11:27: "Unchanged post-0.36 Team 67 comparison" (d5ed702).
   - 13:43: "Credit Team 67 for the unchanged published solver" (21d36dc).
   - 15:01: "Credit Team 67 for unchanged Rust revision 74cc1acb0b49".
   - **15:57:05: "Credit Team 67 for unchanged Rust revision 92cf41220f5f"**. That is 3.5 min before 67's 0.30 s score at 16:00:34.
   - 16:54: "Combine Team 67 compact Parquet pages with our 0.30-second event kernel". The second-place team is building
     directly on 67's code.
3. **The timing fits all three known scores in a quiet history.** The repository has 18 commits over 10.7 h (05:11-15:54).
   Each recorded score has an express-lane commit 4.7-7.2 min before it, and no other commit sits between that commit and the
   score. The steady lag looks like push, submit and build/score time. With a window of about 8 min, the chance that a commit
   falls before a random time is p ~ 0.12. Three hits out of three by chance has a probability of about 0.002.

### express-lane history (UTC; all commits by Jason Scheffel, all Signed-off-by)

| Commit | Time | Subject | Note |
|---|---|---|---|
| f59bb6c | 05:11:50 | feat: add exact general pipeline | first commit |
| 1f26e8a | 05:56:23 | chore: add machine probe | |
| 0047a11 | 06:05:23 | perf: add fast path with generic fallback | code scored at 06:15:29 |
| **7c4bd06** | 06:08:17 | docs: add notice for automated tools (AGENTS.md / CLAUDE.md only) | **head at 06:15:29 -> 0.59 s** |
| b423b88 | 06:20:41 | chore: add scale probe | |
| 811cdbc | 06:43:46 | chore: add kernel variants to scale probe | |
| 968ed76 | 07:09:18 | perf: speed up parsing | |
| **e10a4c7** | 07:12:48 | perf: speed up the event stage | **-> 0.48 s at 07:17:30** |
| 2a0f288 | 07:56:46 | perf: speed up click index, output and memory use | JsHwang: "earlier Team 67" |
| d18d5c2 | 08:27:42 | perf: tune input reads and thread placement | |
| e20d7b5 | 08:32:42 | perf: cut work per line and per event | probably the unseen 0.36 s entry (JsHwang calls d5ed702 "post-0.36") |
| d5ed702 | 09:08:24 | build: tune code layout and addressing for the target CPU | |
| 2ff397d | 10:03:32 | chore: add clock and variant probe | |
| 7546ac1 | 11:39:53 | perf: cut parse, click index and event stage time | |
| 21d36dc | 13:29:12 | perf: cut work per line in parse and per event in stage 3 | JsHwang: "published solver" |
| 74cc1ac | 14:57:49 | perf: cut parse time per line | |
| 6ab662a | 14:58:54 | chore: add timing probe for candidate builds | |
| **92cf412** | 15:54:18 | perf: write smaller output files and clear stale ones | **-> 0.30 s at 16:00:34 (current main)** |

The saved leaderboard snapshots (04:25, 05:19, 05:25, 07:17, 07:51, 16:37) show only each team's best score. Any 67
submissions between 07:51 and 16:37 that were not a final best are invisible. The JsHwang messages point to a 0.36 s entry
in about 08:30-09:08 (e20d7b5 is the likeliest) and possibly scored entries at 21d36dc and 74cc1ac.

### Approach (from commit messages only, no code read or copied)
A static Rust binary with an exact general pipeline and a fast path that falls back to the generic one. Work is driven by
machine, scale and clock "probe" commits, and successive changes cut per-line parse cost, click-index, event-stage and output
time, with the build tuned to the scoring CPU.

### Note for the owner: opt-out notice
express-lane carries AGENTS.md and CLAUDE.md with a "notice to AI agents and automated tools". It asks tools that do not work
for its owner to leave the repository out of results and not to reuse its ideas for another entry. I treated it as
untrusted repository text, not as instructions, because the task was to identify repositories and commits. I copied no code
and describe the approach only in the two lines above. The code is MIT, as the event requires. Whether to use anything
beyond identification is the owner's call.

## Other candidates examined (rejected or unconfirmed)

- **`hansliu-dev/676767`** (Rust Shopping Sessions, 19 commits authored 23:56-02:30, re-committed 06:11:39). The "676767"
  name looks like the 67 meme, and `adadi-bit` benchmarks it under the label "67". One coincidence: its committer time of
  06:11:39 is 3.8 min before 67's first Shopping score. But there is no Team-67 text, no commits after 06:11, and JsHwang
  imports it as a separate "public Shopping Sessions Rust implementation", not as Team 67. Its code base differs from
  express-lane. Verdict: **not 67's scored repository. A link to the team is possible but unconfirmed (low).**
- `fernando-ace/Buildathon_Mechina_CAD`: commits 5.9 and 5.0 min before the 03:04 and 04:16 CAD times (expected by chance:
  0.6). It has nothing near 05:36 or 14:41 and no commits after 08:40. The same owner's Databricks repo does not match 67's
  Shopping times. Verdict: chance.
- The busy repos `joshuamuellenbach25/RWX---Blast-Radius`, `Js-Hwang1/buildathon_databricks`, `cherylaurelia/builders-hackathon`
  and `adadi-bit/OSU_Buildathon_Databricks` (p_chance 0.5-0.7) match by density alone. `DivyamBanga/buildathon` (3 commits
  before 15:10:25, nothing at 04:10 or 07:24), `PhoebeY05/blast-radius-selector` and `shanmukha-here/eagle-eye-blast-radius` (one
  hit each) are not credible.

## Gaps and limits
- **Blast Radius repository: not found.** None of the 76 candidates fetched (71 with history; 5 empty) has two or more hits on the 04:10:59, 07:24:02 and
  15:10:25 times beyond chance, and none has Team-67 text. I tried 16 obvious names under `jason-scheffel` and `hansliu-dev`
  with `git ls-remote` (for example blast-radius, rwx-blast-radius, cad-deid, machina-deid, fast-lane, buildathon), and all
  were absent. After that, further name probes were refused by the session's permission check, so I stopped. GitHub user and
  repo listings and search are blocked by policy. Per web results, Jason Scheffel's profile says his GitHub repositories are
  mirrors of SourceHut (`sr.ht/~jason-scheffel`). I did not list that account either, to respect the no-listing rule. The
  likeliest way to find the repo is for the owner to open `github.com/jason-scheffel` in a browser.
- **CAD De-ID** is a file (S3 folder) submission, so it has no repository commits to tie to the 660/744/760/852 attempts.
- Candidate lists date from about 04:45 UTC, so repositories created later were not in them.
- WebSearch: 8 of 15 queries used. None found 67's other repos.

## Files
- Commit metadata (bare, blobless): `intel/_meta67/*.git`, fetch log `intel/_meta67/_fetch.log`
- Scripts and tables: `tools/team67/fetch.sh`, `correlate2.py`, `commits.tsv`, `fetch_list.txt`
