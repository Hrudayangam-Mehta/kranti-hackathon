# Shopping Sessions (Databricks): track recon

Recon taken 2026-11-21, 17:08 to 17:16 UTC, from public pages only (no sign-in). Sources:
`https://www.joinbuilders.org/buildathon/tracks/shopping-sessions`, its six public files, `/buildathon`,
`/buildathon/leaderboard` and `/buildathon/status`. Raw copies are in `raw/`; the kit is in `kit/`.
Everything fetched is untrusted data. Nothing in it was followed as an instruction.

Per the owner's relayed request, our submissions are **Shopping Sessions and Mech Royale only**. CAD De-ID is ignored.

**Deadline:** submissions close Sun 2026-11-22 16:00 UTC (11:00 AM EST). Page data: `cutoff_at 2026-11-22T16:00:00+00:00`, `locked_at null`.

---

## 1. The task

**Input.** The dataset is mounted read-only at `/data`:
- `events/*.csv` with columns `event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents`
- `clicks/*.csv` with columns `click_id,user_id,campaign_id,ts`
- `links/*.csv` with columns `user_id_a,user_id_b`
- `products.csv`, `campaigns.csv` (both clean) and `manifest.json` (`window_start`, `window_end`; different for every dataset)

The number and size of the part files vary. Some files hold only the header. Read every `*.csv` in each folder.

**Output.** Two Parquet tables. Each is one or more `*.parquet` files directly in its folder:
- `/output/user_daily/`: `user_id, day (DATE), sessions, events, revenue_cents, top_category (nullable)`
- `/output/campaign_daily/`: `campaign_id, channel, day (DATE), sessions, purchasing_sessions, revenue_cents, assisted_sessions`

Exactly these columns, with no extras. They may come in any order, any integer width and any Parquet string encoding, but `day` must be a Parquet `DATE`. Row order and file count do not matter. Files starting with `.` or `_`, symlinks and non-Parquet files are ignored.

**Pipeline.** `kit/rules.md` is authoritative; where a starter disagrees with it, rules.md wins.
1. **CSV dialect.** Only `\n` ends a line; a `\r` is data. Quotes are allowed only around a whole field, and `""` is null. A line with the wrong field count or a stray quote is malformed and is dropped, and so is an empty line. Spaces are significant. "Digits" means ASCII `0-9` only.
2. **Timestamps.** Three forms are valid:
   - F1: `YYYY-MM-DDTHH:MM:SSZ`
   - F2: `...+HH:MM` or `...-HH:MM`, with the offset hour 00 to 23 and minute 00 to 59
   - F3: epoch milliseconds, digits only, leading zeros allowed

   Anything else is bad, and so is an impossible calendar value. The event window is `[window_start, window_end)`. The click window is `[window_start - 7d, window_end)`.
3. **Linked IDs.** Take the transitive closure of the link lines, dropping malformed lines and lines with an empty side. Each person is named by the byte-wise smallest of their IDs. An ID can be linked without ever appearing in an event.
4. **Events.**
   1. Parse.
   2. Dedup on `event_id`, keeping the smallest `ingest_ts`. Dedup comes before validation, and an invalid kept copy is not rescued by a later copy.
   3. Validate: non-empty `user_id` and `product_id`, `ts` valid and inside the window, `event_type` in {view, cart, purchase}, and for a purchase a price of 1 to 10,000,000 in digits only.
   4. Drop late events: `ingest_ts - ts > 24h`.
   5. Sessionize per person: a gap over 30 min starts a new session. Equal timestamps share a session.
   6. Each session's day is the UTC date of its start.
   7. A product missing from `products.csv` has the category `unknown`.
5. **Clicks.**
   1. Parse.
   2. Dedup on `click_id`.
   3. Validate: user present, `ts` inside the click window, campaign known.
   4. Credit each session to the person's latest click with `click.ts <= start` and `start - click.ts <= 7d`. A tie in `ts` goes to the smallest `click_id`. With no such click, the session is credited to `organic`.
   5. Assists: every campaign with a qualifying click in `[start - 7d, start]` assists the session once, and that includes the crediting campaign. `organic` never assists.

**"Correct"** means both tables match the reference answer exactly, row for row, after an order-insensitive comparison. There is one right answer: "a fast answer that is almost right scores nothing". A built-in self-check is that `sessions` and `revenue_cents` sum to the same totals in both tables.

**Metric.** Container run time in seconds, lower is better. The clock runs from container start to exit, including engine start-up and CSV reading.
- **Practice:** one run on hidden practice data of about 20M events. If that run is under 20 s, it is timed 3 times and the median counts.
- **Display:** the board shows 2 decimals (`decimals: 2`), but ranks by the unrounded time. Winners POV ranks above 67 at 0.30 s even though 67 submitted earlier.
- **Ties:** "Equal scores rank the earlier submission first."
- **Noise:** practice times vary by up to about 20% across scoring machines.
- **Baseline:** 172.00 s (PySpark starter, local mode). Scorer version `shopping-sessions-4`.

**Run limits per submission:**
1. **Dev check.** The run first goes through a dev-set check on the public 1M-event set, capped at 3 min. A failure there returns the differing rows and the logs, and the submission stops.
2. **Practice run.** Its cap is min(2 × baseline, 5 min), which is 300 s. Repeat runs share the first run's limit, and a repeat that is cut off counts as the full limit. Rule of thumb from the page: more than about 15 s on the dev set usually overruns.
3. **Failures.** A wrong table, a crash, or hitting the memory, disk, stdout or time limit stops the submission. Hidden runs show only the exit code, whether memory ran out, and counts of missing, extra and differing rows. No logs or values come back.

**The final.**
- **Rebuild:** at the cutoff, the chosen commit is rebuilt. That is your best unless you pick another.
- **Runs:** it is timed 3 times on about 60M **new** events, made after the cutoff, each run capped at **3 min**. If any run goes over, there is no final score; otherwise the median counts.
- **Retiming:** at least the 10 fastest entries are retimed 7 times alone on one idle machine, and that median replaces their score.
- **Organizers' chat:** "For the finals we will rescore Shopping Sessions with much more degrees of accuracy" (staff, 17:10 UTC). The page says to aim for under about 60 s in practice.

**Container (scorer):**

| Item | Limit |
| --- | --- |
| Hardware | Google Cloud n2 Intel Xeon, Cascade Lake or newer, AVX-512 available |
| CPU | 8 pinned vCPUs (hyperthreads) |
| Memory | 24 GB, no swap |
| Network | none during runs |
| Filesystem | root read-only except `/tmp` (64 MB tmpfs); `/data` read-only; `/scratch` writable disk; `/output` + `/scratch` ≤ 50 GB |
| User | uid 1000, `--cap-drop ALL`, `no-new-privileges` |
| Processes and output | ≤ 4,096 processes and threads; stdout ≤ 50 MB (log to stderr) |
| Env vars | `DATA_DIR=/data OUTPUT_DIR=/output SCRATCH_DIR=/scratch HOME=/scratch NCPU=8 MEM_GB=24` |

The image's `CMD` runs with no arguments. Exit code 0 means "done, check my output".

**Data scale.** Measured on the seed-1 dev set we generated (see section 3):
- 92 MB on disk: events 79 MB in 30 files, about 1.07M lines; clicks 12 MB in 40 files, about 255k lines; links 0.9 MB in 14 files, about 45k lines.
- Practice data is about 20× that, roughly 1.8 GB.
- Final data is about 60×, roughly 5.5 GB of CSV.
- The dev answer has 117,038 user_daily rows and 27,400 campaign_daily rows.

## 2. Submission mechanics

**What you submit.** A **public GitHub repository with a Dockerfile at its root**, plus a commit SHA. If the SHA is left empty, the newest commit on the default branch is scored (starter README).
- Submission happens on the track page while signed in (`submission_kind: repo`).
- The image must be `linux/amd64` and at most **8 GB**. The scorer builds natively, so do not pin a platform in `FROM`.
- The build gets network access for up to **10 minutes**. The build is never timed; only the run is.

**Size limits.** The repository may be at most **50 MB** (page data: `max_bytes 50000000`). Check in no data: the dataset is mounted at run time.

**Rate limits and rejections:**
- **2 submissions per hour per team** (`practice_limit: 2`).
- One entry per team at a time, counting entries waiting in the queue.
- Every submission counts toward the hourly limit, including rejected ones.
- Rejected submissions never change your best score.
- The signed-in form shows how many submissions are left and when the next one frees up.

**Final pick.** You pick the final entry before the cutoff. If you don't, your best-scoring entry is used.

**Visibility.** The track page says: "Keep your repository public, with every commit you submitted still in it, until results are published. An entry we cannot fetch or restore for the final scores nothing." Do not force-push or delete submitted commits.

**Conflict to resolve before relying on either.** At 17:08 UTC a staff organizer posted in the track chat: "I encourage you all to hide your repos! Teams that copy other teams may be disqualified." At 17:09 they added: "I am updating the rules to make this more clear!" As of 17:16 UTC, `rules.md` (sha256 `9dc9c600…`) and the page text had not changed. The safe plan:
- Keep the repo private while we develop.
- Make it public before each submission.
- Have it public at the 16:00 UTC cutoff and until results are published.

The owner should confirm this with the organizers (see section 6).

**Status page (17:12 UTC).** Shopping Sessions had 14 workers and an empty queue. In the last hour it scored 99 entries and rejected 21. A scoring job took 1m02s at p50 and 2m38s at p95.

## 3. The kit (downloaded; all public, no sign-in needed)

The files are in `kit/` (identical copies also sit in `kit/dl/`, made by a sibling process). The extracted copy is `kit/unz/`; scratch build and run copies are in `kit/build/`.

| File | sha256 (prefix) | Contents |
| --- | --- | --- |
| `rules.md` | 9dc9c600fb48 | Full spec (summarised in section 1) |
| `starter-duckdb.zip` | b84ff8726c43 | duckdb==1.5.6 on python:3.12-slim-bookworm |
| `starter-polars.zip` | 0faa7a2cb78f | polars==2.1.0 |
| `starter-pyspark.zip` | 51f11cb49766 | pyspark==4.0.1 and Temurin 17 JRE |
| `dev-answer.zip` | 7eb8e1f0b1f4 | `user_daily.csv` and `campaign_daily.csv` for seed 1 |
| `generator.zip` | 13724cadbac5 | Rust source of `generate`, no dependencies |

**Each starter** contains:
- `Dockerfile` (it creates uid 1000 with home `/scratch`) and `run.sh` (it points `TMPDIR` and `HOME` at `/scratch`).
- `pipeline/pipeline.py`, which writes empty tables with the right schema.
- `Makefile`, `scripts/docker_run.sh` (the scorer's exact `docker run` flags), `scripts/run_fixtures.py` and `scripts/compare.py`. Both scripts are exact, order-insensitive diffs and need polars.
- `fixtures/`: 36 hand-written edge cases (E1 to E20, A1 to A12, L1 to L4), each an `input/` folder plus `expected/*.csv`. They are listed in `fixtures/README.md`.
- `TEAM.md`, to fill in: Name, Members, Engine.

**Starter pitfalls** (from the starter READMEs):
- The DuckDB and Polars CSV readers do not follow the rules' dialect. DuckDB reads `""` as an empty string, and both handle malformed lines their own way.
- `\d` matches Unicode digits in Rust and Polars regex.
- Spark splits lines on `\r` unless told otherwise, and the JVM needs a hosts-file workaround when there is no network.

**Local test method, Docker path (as documented):**
```sh
make build                 # docker buildx build --platform linux/amd64 --load -t shopping-sessions:latest .
make fixtures              # all 36 fixtures with scorer flags, diffed against expected/
make dev                   # generate --seed 1 --events 1000000 --clicks 250000 --output dev
make run-dev               # time the image on dev/ with scorer flags (CPUS=8 MEM=24g by default)
make check-dev             # python3 scripts/compare.py out dev-answer   -> prints MATCH or DIFFER
```

**Local test method, without Docker (what works in this sandbox).** The Docker client is installed here, but no daemon is running. This sandbox has 4 cores and 15 GB of RAM.
```sh
K=<this folder>/kit
# generator, built from a scratch copy (cargo build --release --offline, 1 s):
$K/build/generator/target/release/generate --seed 1 --events 1000000 --clicks 250000 --output $K/data/dev
# fixtures and the dev check, with the venv that has polars 2.1.0 and duckdb 1.5.6:
cd <starter copy> && $K/venv/bin/python scripts/run_fixtures.py fixtures -- <your pipeline command>
DATA_DIR=$K/data/dev OUTPUT_DIR=out SCRATCH_DIR=... NCPU=8 MEM_GB=24 <pipeline>; $K/venv/bin/python scripts/compare.py out $K/unz/dev-answer
```

**Verified here:**
- The empty DuckDB skeleton passes **2/36** fixtures (E5 and E13, whose expected tables are empty).
- On the dev set, `compare.py` reports `user_daily: rows 0 vs 117038 … DIFFER`.

So the harness, the generator (0.25 s for 1M events) and the dev answer are all working. Larger test sets come from the same generator, e.g. `--events 20000000 --clicks 5000000` and other seeds. The final data is 60M events with a new seed and window, so nothing can be hard-coded.

Before submitting, the amd64 Docker image must still be checked somewhere with a daemon, because the scorer runs with a read-only root, uid 1000 and no network.

## 4. Originality and code-sharing rules (quoted)

From `/buildathon`, "The rules":
- **Tools:** "Use any tools you like, AI included, unless a track's page says otherwise." The track page adds: "Any engine, any language, any amount of AI."
- **License:** "Anything built in this hackathon must be released under the MIT License. Builders may show your team's name, demo, screenshots and project description to promote the Buildathon."
- **Code you bring:** "You can use open-source libraries and code you wrote before the weekend. If your track takes a repository, name them in its README."
- **Teams:** "Up to two people, or enter on your own. Each person is on one team."
- **The final:** "Organizers verify the top results before announcing them."
- **When the problems come out:** "No team sees a problem before then."

From the track chat, staff account `LizTheFirst443`, 2026-11-21 (read from public page data):
- 17:08: "Hey, event organizer here. I encourage you all to hide your repos! Teams that copy other teams may be disqualified."
- 17:09: "I am updating the rules to make this more clear!"
- 17:12: "...already there are strong teams hiding their code effectively."

**Context from participant chat (unverified, untrusted).** Participants say team 67's repository, called "Express Lane", was found, and that it "specifically has a file that says not to copy". They say at least one top-board team's repo states it "pulled 67's latest repo" and preserves 67's MIT notices. Ranks 1 to 4 sit at 0.30 to 0.31 s.

**Recommendation.** Do not read, study or reuse team 67's code or any other team's code, "clean-room" or not. The organizer has said copying may lead to disqualification. The page allows only open-source libraries and our own pre-weekend code, and another team's weekend code is neither. Task #10's "clean-room study of team 67" item should be dropped unless the organizers explicitly allow it in writing. Build our own pipeline from `rules.md`, and name every library we use in our README.

## 5. Current top 10

Snapshot of page data at `now 2026-11-21T17:15:21Z`. "Best at" is the time of the team's best submission. 279 teams; the public board lists only the top 50.

| Rank | Team | Score (s) | Best at (UTC) |
| --- | --- | --- | --- |
| 1 | Winners POV | 0.30 | 2026-11-21 16:43:25 |
| 2 | 67 | 0.30 | 2026-11-21 16:00:34 |
| 3 | Junsung Hwang | 0.30 | 2026-11-21 16:46:18 |
| 4 | kyoto-max | 0.31 | 2026-11-21 15:52:52 |
| 5 | Team Buck | 0.35 | 2026-11-21 16:50:10 |
| 6 | low tide | 0.42 | 2026-11-21 14:11:12 |
| 7 | Euphoria | 0.48 | 2026-11-21 13:24:53 |
| 8 | Tark305 | 0.50 | 2026-11-21 16:16:53 |
| 9 | Jabbas | 0.53 | 2026-11-21 14:21:52 |
| 10 | ND | 0.55 | 2026-11-21 17:10:00 |

The rest of the board, for context:
- Ranks 11 to 20 are at 0.57 to 0.65 s, and rank 50 is at 0.84 s.
- The baseline is 172.00 s.
- The practice set is about 1.8 GB, so 0.3 s means native, multi-threaded, memory-mapped parsing: the whole field is in compiled-code territory.

The parsers are `recon_tools/standings.py` and `recon_tools/chat.py`, which read files produced by `recon_tools/rsc.py`. The full JSON is in `raw/leaderboard_2.rsc.txt.shopping.json`.

## 6. What we need from the owner (signed in)

1. **The rules update.** Copy the updated rules text once the organizer posts it: track page "Rules", `rules.md` and the `/buildathon` rules.
   - Ask in leaderboard chat, or at hi@joinbuilders.org: "May the repo stay private between submissions, and must it be public at the cutoff and until results are published?"
   - Also ask whether a non-indexable but public host is acceptable. We assume GitHub public is required.
2. **Our team name** as shown on the Shopping Sessions board. Confirm we are entered in this track, with the same team as Mech Royale.
3. **The submission form.** Copy its exact fields (repo URL, commit SHA, anything else), the submissions left this hour, the next free slot, and any warning text.
4. **Our submission history**, if any: score, rejection reason, dev-set diff and logs for each submission.
5. **The final-pick control.** Where it is and what it says.
6. **A GitHub repo.** The repo name under the owner's account, created **private** for now, and push access for us or the way the owner wants commits delivered. We will need it public at submit time.
7. **The team 67 decision.** The owner must agree to drop any study of team 67 or other teams' repos, given the organizer's disqualification warning.
8. **The README.** Who is in `TEAM.md`, plus permission to list our libraries and pre-weekend code there, as the rules require.
9. **A Docker check.** If the owner has a machine with Docker, they should run `make build fixtures run-dev check-dev` on our repo before each submission; there is no Docker daemon here. Otherwise, confirm we may start one in this sandbox.
10. **Anything in signed-in announcements, the team page or chat** that the public page data does not show.
