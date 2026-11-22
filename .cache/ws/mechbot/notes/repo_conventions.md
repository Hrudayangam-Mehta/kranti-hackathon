# Repository conventions of the scoring teams, and the layout recommended for ours

Written 21 Nov 2026, about 06:25 UTC. Basis: the 166 read-only clones in `intel/` (153 have a `Dockerfile`
at the top level), their commit histories, and the notes some teams keep in their repositories. Counts
below come from one pass over all clones (`parity_work/layout_survey.py` in the scratchpad, our own
script); the per-team rows were read by hand. Nothing from those repositories was executed and no file
content was copied: other teams' text is described, not quoted, except for a few words of headings and file
names. This note is for the lead; it never goes into the submitted repository (it names other teams, which
`REPO_HYGIENE.md` forbids there).

## 1. What a submission repository looks like

### 1.1 Top-level files (share of the 166 clones)

| File or folder | Count | Remark |
|---|---:|---|
| `Dockerfile` | 153 | required at the top level by the rules |
| `README.md` | 132 | |
| `.gitignore` | 112 | |
| the kit's protocol wrapper (one file) | 110 | copied unchanged from the starter kit |
| `.dockerignore` | 87 | most common entries: `.git`, caches, `tools`, `*.md`, `kit`, `tests`; 20 repositories use the "ignore everything, then allow the few bot files" form |
| one bot file at the top (`bot.py`, `bot.ts`) | 91 | the usual entry point |
| `LICENSE` | 56 | 55 are MIT; **97 of the 153 repositories with a Dockerfile have none**, including the two best public ones |
| `tools/` | 34 | simulators, tuners, check wrappers |
| a copy of the kit (`arena/`, `protocol.md`, `check/`, schema) | 15-22 | the rest download the kit and ignore it in git |
| `src/` | 20 | |
| `tests/` or `test_*.py` | 22 | |
| `sim/` | 11 | |
| `.github/` | 9 | a workflow that runs the official check on every push |
| notes for coding assistants (`CLAUDE.md`, `AGENTS.md`) | 15 | |
| records: `CHANGELOG.md` 5, `EXPERIMENTS.md` 3, `SUBMISSIONS.md` 3, `NOTES.md` 3, `experiments/` 3, `results/` 2 | | see section 4 |
| precomputed map data (binary navigation or visibility grids) | 13 | shipped so that start-up does not have to rebuild it |

A typical repository has a median of 8 commits (90% have 28 or fewer, the largest 160). 121 of 152
histories have a single branch; about 26 use extra branches for experiments or for the submitted state.

### 1.2 The teams with the best scores

The letters before the names are the bot tags of `notes/baseline_parity.md` and are used in the rest of
this note.

| Team (score) | Top level | Image | Records | Tools in the repository |
|---|---|---|---|---|
| M: Kgc3105 (5.58) | Dockerfile, README, entry file, kit wrapper, `src/` with four modules (map, paths, aiming, decisions), `tools/` (simulator, parameter search, paired comparison), package and type-checker files, ignore files. No LICENSE. | Bun slim pinned by digest; copies only the bot files; bundles to one file during the image build; three engine settings | long commit messages: what changed, simulator numbers with error bars, the real score when known | yes, excluded from the image |
| P: shaunkar1 (5.33) | Dockerfile, module file, packages for bot, map geometry, protocol types, house-bot stand-ins, simulator, small lab commands, and an embedded copy of the map (1.9 MB). No README, no LICENSE. | Go build stage, then an empty (`scratch`) image holding one static binary | one commit per compiled-in practice profile ("Squad profile: name") | yes |
| T: varchaskukreja (5.19) | a monorepo for all four tracks; the bot in a sub-folder; separate branches for the submitted state and for experiments; a script that publishes the bot to the submission branch; LICENSE | (per track) | commit titles with the receipt number of the restored best version | yes |
| Kanyaraasi (5.19) | eight files: Dockerfile, LICENSE, a third-party licence file, README, two source files, kit wrapper, `.dockerignore` | Bun slim by digest; copies five named files; sets the user to 65534 and points HOME and the temp directory at `/tmp` | README states what it derives from | none |
| r1ver (5.10) | Dockerfile, LICENSE, README, bot file, kit wrapper, `experiments/` (official runs, per-seed simulator tables), `tools/` | Python slim by exact version; copies three named files; behaviour flags set through an ENV line | a table: time, version (linked to the exact commit), official score, receipt | yes |
| C: chriseco427-spec (5.08) | Dockerfile, LICENSE, README, build manifest with lock file, `src/` with four files, ignore files, a CI workflow | Rust build stage with the lock file enforced, then a dated Debian slim image; user 65534 | commit titles ("... kept off", "defaults unchanged") | none |
| B: brycehcmcgrath (5.06) | Dockerfile, README, a notice file, two notes for assistants, `payload/` with three compiled modules | Python slim by digest; files copied read-only; user 65534 | results ledger kept on a branch | none: only compiled modules are public |
| K: prakash-218 (5.04) | five source files flat at the top, one test file, Dockerfile, a ten-line README | Go build stage, then `scratch`; user 65534 | version numbers in commit titles, real scores quoted in later titles | none |
| Th3r0n (5.02) | Dockerfile, a nine-line README, entry file, kit wrapper, `src/` (ten modules), `tools/` (seven) | Bun slim by digest; copies everything | commit titles: "vN: change (real score)", "exp X: one change", then "back to vN defaults" | yes |
| DV: davidvarvas (5.02) | Dockerfile, README, CHANGELOG, three source files | Python by exact version and digest; one pinned binary-only package; byte-compiles in the build; math-library threads set to one | paired commits: "Check X" then "Use X"; "Record ... results" | none |
| N: JosiahAklog (4.96) | everything flat: bot, map cache, a small native helper with its source, ten test files, a copy of the kit, a file with check results | Python slim by tag; files made read-only; user 65534 | README states the last confirmed official score per version | tests only |

Patterns: the higher the score, the smaller the public surface tends to be. One of the eleven (B) ships
only compiled modules, kyoto-max (a 5.19 board entry, weakly linked) ships Python byte-code, and P ships
source without a word of documentation; so a bundled, minified single file is not unusual on this track.

## 2. Dockerfile patterns

- **Base images.** About 115 `FROM` lines name a Python slim image (the kit's default), 13 Bun
  (`oven/bun:1.4.4-slim`, the kit's TypeScript default), 17 Debian slim or `scratch` as the final stage of a
  compiled build, 2 Node.
- **Pinning of the final stage.** 100 by tag only, 49 by tag and digest, 3 `scratch`, 1 unpinned. Of the 13
  Bun users 3 pin the digest (M, Th3r0n, Kanyaraasi) and all three use the same one. We asked the registry
  ourselves on 21 Nov at about 06:15 UTC: the tag `oven/bun:1.4.4-slim` resolves to
  `sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4` (multi-platform index).
- **Stages.** 21 multi-stage builds (Rust, Go, C++): compile with the lock file enforced, copy one binary
  into a small final image.
- **What is copied.** 40 copy the whole repository (`COPY . .`, the kit's pattern); the others name the
  files, which keeps tools, notes and tests out of the image without a `.dockerignore`.
- **Entry point.** Always the exec form with an absolute path: the interpreter plus one file (Python with
  unbuffered output), or the binary itself.
- **User.** 28 set user 65534 in the image. The scorer forces that user anyway; the line only makes a
  plain local `docker run` behave like the scorer.
- **Environment lines.** Python: no byte-code writing (51), unbuffered (30), math-library threads set to one
  (7). Bun: one repository (M) limits the engine's helper threads; one sets HOME and the temp directory to
  `/tmp`. Node: one caps the heap at 384 MB. A few repositories put behaviour switches into ENV lines
  (r1ver's flag list, a policy name elsewhere); one feeds them from build arguments, which made its scored
  configuration impossible to reconstruct afterwards.
- **Build-time checks.** About 16 Python repositories byte-compile in the build, M bundles in the build:
  a syntax or import error then fails the build instead of the match. A few run a precompute step (map
  cache) or a unit test in the build.
- **Permissions.** Several make the bot files explicitly world-readable or read-only; a file that only root
  can read is the classic way to pass locally and fail as user 65534.

### Small image, fast start

- Slim bases, `scratch` for static binaries, named COPY lines, `.dockerignore`.
- Start-up cost is moved to the build or into shipped data: map caches,
  byte-compiled Python, a bundled single JavaScript file, an embedded copy of the map as a fallback (P).
  Map caches as binary files appear in 13 repositories.
- In our sparring harness the public bots send `ready` 30 to 1,240 ms after `hello` (median about 240 ms):
  nobody is near the 20 s limit. The repository limit of 20 MB is far away as well: the scoring teams'
  trees are 80 kB to 3.2 MB.
- What matters more than start time is the first seconds of the match: M and three others rehearse
  decisions at start-up so that compilation is finished before the first observation.

## 3. README and licence

Common headings: a layout or file table (26), "build and check" with the kit's two commands (9 literal,
many variants), how it plays or strategy (10), submit (7), credits or sources or pre-existing code (10),
licence (12). The top repositories keep it short: Th3r0n nine lines, K ten lines, C 35 lines with layout,
build and check, sources (written with an AI assistant, libraries with their licences, kit not included)
and licence. M's README describes the play style in seven bullet points and credits the kit and one
public bot it took ideas from. Kanyaraasi and Th3r0n state openly what they derive from.

Licence: 55 MIT files among 153 repositories. The rules make MIT mandatory, so the 97 without a licence
file, among them M and P, are exposed; do not copy that habit.

## 4. How submissions and experiments are recorded

| Team | File | Columns or form |
|---|---|---|
| jackbalseca | `SUBMISSIONS.md` | number, receipt, commit (and experiment branch), time, score, what changed (with the simulator's prediction); below it "lessons from official runs", "not submitted" candidates with the reason, the agreed protocol (one change at a time from the best official commit; keep only above the noise band), and a table of live free-for-all tests (commit, match, place, kills, notes) |
| dmclaughlin-bit | `EXPERIMENTS.md` | time, commit, parent commit, parameter set, score, hypothesis with a rule number and the receipt, result (difference to the champion, keep or revert, and a board snapshot: own rank, first, 16th and 32nd score) |
| Rohanasudani | `SUBMISSIONS.md` | tag (`submission-NN`, an annotated tag per entry), commit, time, hypothesis, score, build and check result, notes; plus a candidate checklist |
| r1ver | `experiments/official-runs.md` and CSV files | time, version linked to the exact commit, official mean, receipt; a second table compares official means with simulator means on fixed seeds; per-seed CSV tables |
| alexwilldev | `STATUS.md` | commit, what the batch changed, score with rank and the leader's score, the "wait" figure shown by the page; simulator score next to the real one |
| afiapoks | `RESULTS.md` | one section per entry: receipt, time, commit, result, comparison with the baseline, what the result does and does not show, next step |
| nullat0m7 | `CHANGELOG.md`, `PATTERNS.md`, `docs/bot.md` | versions with scores; a list of confirmed and rejected patterns with the measured difference |
| M, Th3r0n, K, C, P | commit messages only | see section 1.2 |

Receipts have the form `BB-` plus eight hex digits and are the only handle the site gives for an entry.
Experiment discipline that recurs in the better logs: one behavioural change per entry; the parent commit
written down; an unchanged resubmission and a seed-only resubmission to measure noise; "back to defaults"
after every experiment commit so that the main line always equals the best scored version.

## 5. Version identifiers, switches, debug output, tooling

- **Version in the announced name.** About a quarter of the 129 bots whose name we could read (31) put a
  version into the `ready` name ("...-v7", "V28.1"). The name is shown on the spectator stream, so this publishes the
  iteration count. The top teams use one constant name (M, P, Th3r0n, C).
- **Build identity inside the bot.** Nobody embeds a commit hash. Versions live in commit titles, tags
  (`submission-NN`), branch names (`exp-v7-...`) or the ledger.
- **Switches for A/B runs.** Four styles: (a) one table of named numeric parameters, each overridable for
  the simulator, with defaults unchanged in the shipped build (M, C, DV); (b) boolean switches for whole
  behaviours, off by default and kept "for the record of what was tried" (M, T); (c) named profiles compiled
  in, one commit per profile, the profile name a constant in the source (P, 40 profiles in four hours);
  (d) a flag list read from the environment (Lance line) and set in the Dockerfile (r1ver). Style (d) and
  build arguments leave the configuration outside the source; one team could not say afterwards which
  flags its scored image had.
- **Debug output.** stderr only. Usual lines: one at start ("ready, map loaded in N ms"), errors for the
  first five and then every 200th, slow decisions above a threshold, one summary at `end`. Per-decision
  traces only behind a local switch (P prints one status line per decision when asked). Debug drawings
  are off in every shipped build we read; they are capped and never shown on the track anyway.
- **Tooling.** In the repository but outside the image for most teams with a simulator (M, P, Th3r0n,
  r1ver, U). Kept out entirely by the teams with the smallest surface (Kanyaraasi, B, C, DV, K). Nine
  repositories run the official check in CI.

## 6. What the official system shows, and what went wrong for others

After a submission (from the teams' notes, consistent with the rules):

- The page shows the state of the entry (waiting, built, checked, scored or rejected), a receipt, the mean
  score over the 48 practice matches, the rank, and a figure labelled "wait" in milliseconds (0 to 143 ms
  reported). One team saw 0 and 143 ms for the same behaviour and concluded it is not the bot's own
  compute time; treat it as unexplained.
- **No per-match placements, no replays, no stderr, no debug drawings** for practice matches. Several
  teams state this explicitly; all per-match analysis in their notes comes from their own simulators.
- A rejected build or check comes back with a reason and, for a failed check, the end of the bot's stderr.
  It leaves the best score intact but uses one of the four hourly slots, and only one entry can be in the
  queue. Scoring takes a few minutes.
- The best-scoring entry is entered in the final automatically; a button lets the team pick another.
- Scores are identical for identical behaviour; ties on the board go to the earlier submission.

Build and packaging problems recorded by teams:

- files not readable by user 65534, writes outside `/tmp`, packages installed for root only (the kit's
  own warning; several Dockerfiles carry explicit permission lines because of it);
- answers arriving late only under amd64 emulation on Apple hardware (harmless on the scorer, alarming
  locally);
- compiled dependencies: teams pin exact versions and force binary wheels or the lock file so that the
  rebuild for the final cannot differ;
- 13 of the 166 clones have no top-level Dockerfile (some are repositories for other tracks, some keep
  the bot in a sub-folder); the scorer builds only from the top level.

Timing problems on the real scorer:

- M measured worst answers of 55-114 ms in the sandboxed check with default engine settings and about
  16 ms after limiting the helper threads and adding a start-up rehearsal. This matches our own finding
  (`notes/runtime_1cpu.md`).
- alexwilldev saw late answers on the scorer and gained 0.38 with a 12 ms soft budget and capped searches;
  adding hard 20 ms limits inside the searches then lost 0.39. koillea gained 0.17 from a path-search
  time limit with no change in behaviour.
- Bots whose planning depends on the clock do not reproduce: 3.67, 3.75 and 3.90 for one build (Xero),
  2.38 and 2.71 for another (alexwilldev).
- Th3r0n: state left over from the start-up rehearsal (stuck timers) made the mech hop during the first
  four seconds of real matches until it was reset.

## 7. Recommended layout for our repository

### 7.1 Constraints that decide it

- Rules (`notes/rules_audit.md` section 1): public repository of our own with the `Dockerfile` at the top;
  builds on linux/amd64 in under 10 minutes with versions pinned; passes the official check under the
  sandbox flags; at most 20 MB; MIT licence; README names libraries and earlier code; every submitted
  commit stays public and unchanged.
- Owner (`REPO_HYGIENE.md`, binding): the public repository holds only what the scorer needs: one bundled,
  comment-free, minified file, the Dockerfile, the licence and a minimal README; no tools, tests,
  simulator, notes, logs or parameter tables; neutral commit messages; a list of words that must not
  appear; one commit per submission.

So there are two trees: the private workspace with the readable source (`P/bot` and everything around it)
and the public release tree (`P/dist`, built by `tools/package.sh`). The scoring teams' conventions apply
to the workspace; the public tree stays at four files, which is smaller than any public repository we
read and has precedents in spirit (B, kyoto-max).

### 7.2 Public repository: file by file

| File | Content | Change from today's `P/dist` |
|---|---|---|
| `Dockerfile` | base image by tag and digest, engine settings, one COPY line, user, entry point | four edits, text in 7.4 |
| `bot.js` | the single bundled file (106,703 bytes today) | none |
| `LICENSE` | MIT, as now | none |
| `README.md` | as now: one neutral sentence, runtime, entry point, build command, libraries / earlier code / AI assistance / licence | one optional sentence, text in 7.5 |

Nothing else. No `.dockerignore` (not needed once the Dockerfile copies one named file), no package file
(the bundle has no dependencies), no CI workflow (its file would describe the check and the kit).
One commit per submission, neutral message, one neutral tag per submitted commit (`s01`, `s02`, ...) so
that every submitted state stays reachable; never rewrite a submitted commit.

### 7.3 Private workspace: file by file

| Path | Role | Status |
|---|---|---|
| `bot/bot.js` | entry: stdin/stdout loop, newest-observation rule, action sanitiser, fallback policy, start and end log lines | exists |
| `bot/lib/world.js`, `nav.js`, `aim.js` | map geometry and rays, grid navigation, ballistics | exist |
| `bot/lib/senses.js`, `firecontrol.js`, `mover.js`, `tactics.js`, `economy.js`, `stance.js`, `brain.js` | the seven layers of the brain | exist |
| `bot/lib/params.js` | every tunable default | exists |
| `bot/lib/presets.js` | **new**: named presets, each a small set of overrides of `params.js` (the Doctrine V4 names: `laserRange`, `strafe`, `healExit`, `farmHp`, `ffaPair`, `beamClue`, plus the ones proposed in `notes/baseline_parity.md`) | to add |
| `bot/lib/build.js` | **new, generated by `tools/package.sh`**: the build id, the salt and the one resolved override set of this release. The bundle then contains exactly one parameter set, not the list of variants. | to add |
| `bot/Dockerfile` | source of the shipped Dockerfile | exists |
| `sim/` | simulator, house-bot models, runner | exists |
| `tools/package.sh` | bundle, hygiene scan, both conformance runs under the one-CPU quota | exists; extend with preset, salt and id arguments, a SHA-256 of the bundle, and a copy of the release into `runs/` |
| `tools/rules_audit/preflight.py`, `tools/test_*.js`, `tools/arena_micro.js` | gates and tests | exist |
| `runs/SUBMISSIONS.md` | **new**: the ledger, columns in 7.7 | to add |
| `runs/sNN/` | **new**: per submission the four shipped files, the package log, the simulator result files, a one-line `build.txt` | to add |
| `notes/`, `kit/`, `replay/`, `intel/`, `user_docs/` | evidence and references; `intel/` never leaves this machine | exist |

A private git repository over this workspace (without `intel/`, `kit/arena` and `replay/`), tagged with the
same `sNN` names, gives what the public history cannot: the readable source of every submitted bundle. If
the organisers ask us to explain the entry (they compare top entries), we can show the source and rebuild
the identical bundle from it.

### 7.4 Dockerfile: recommended text

```dockerfile
FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4
ENV BUN_JSC_useFTLJIT=0 \
    BUN_JSC_useConcurrentJIT=0 \
    BUN_JSC_useConcurrentGC=0 \
    BUN_JSC_numberOfGCMarkers=1 \
    BUN_JSC_numberOfBaselineCompilerThreads=1 \
    BUN_JSC_numberOfDFGCompilerThreads=1 \
    BUN_JSC_numberOfFTLCompilerThreads=1 \
    BUN_JSC_minNumberOfWorklistThreads=1 \
    BUN_JSC_maxNumberOfWorklistThreads=1 \
    HOME=/tmp \
    TMPDIR=/tmp
WORKDIR /bot
COPY bot.js /bot/bot.js
USER 65534:65534
ENTRYPOINT ["bun", "/bot/bot.js"]
```

Changes against the current `bot/Dockerfile`, each with a scored public precedent on this same base image:

1. **Digest added to the base image** (rules: "pin versions because finalists are rebuilt"; open item C2
   of the rules audit). The digest above was read from the registry by us; three public repositories pin
   the same value (5.58, 5.19, 5.02). Re-check before the first push with
   `docker buildx imagetools inspect oven/bun:1.4.4-slim`.
2. **`COPY bot.js /bot/bot.js` instead of `COPY . .`**: only the bot enters the image, whatever else is in
   the checkout (5.58 and 5.19 name their files).
3. **`USER 65534:65534`**: a local `docker run` without the flag then behaves like the scorer (28
   repositories, among them 5.19, 5.08, 5.06, 5.04). The copied file keeps mode 644, which that user can
   read; `preflight.py` S11 checks it.
4. **`HOME=/tmp`, `TMPDIR=/tmp`**: anything the runtime wants to write goes to the one writable place
   (the 5.19 derivative does this). Optional: the other Bun bots, among them the 5.58 and the 5.02 one,
   scored without it.

No comment lines, as the owner requires. Keep the nine engine lines: they are our measured fix
(`notes/runtime_1cpu.md`) and the 5.58 team measured the same effect with three of them.
`tools/package.sh` already extracts these settings for its conformance runs; after the edit, run it once
and, as soon as a Docker daemon is available anywhere, the official command of the rules audit (section
1) against the built image. That run has never been possible on this machine, and it is the only test of
user 65534 with a read-only file system. If it cannot be done before the first submission, the fallback
with the least unknowns is: change 1 and 2 only.

### 7.5 README: recommended text

Keep the current file as it is (it satisfies the licence and attribution rule and the owner's minimal
form). One optional addition, the owner's decision, because top entries are compared and may have to be
explained:

> `bot.js` is a single-file build of the author's own modules, bundled with Bun.

Do not add: strategy, architecture, results, the check command (it names the kit's folders), the names of
the event, the track or other teams.

### 7.6 Build identity, presets, logs

- **Announced name.** One constant, neutral name for all submissions, no version in it. The current
  `aegis-16` should be replaced: three other public bots announce "Aegis" names and one public repository
  carries the word in its title, so on a compared board it invites confusion. Confirm the choice against
  rule C17 (team name) once.
- **Build id.** A short neutral string such as `07.2.3` (ledger row, preset number, salt), generated into
  `bot/lib/build.js` and printed only on stderr in the start line and the end line. Not in the name, not
  in any action field.
- **Presets.** Chosen at package time: `tools/package.sh <preset> <salt> <id>` resolves the preset from
  `bot/lib/presets.js` into `bot/lib/build.js` and bundles. No ENV switches in the Dockerfile (they would
  publish the knob names) and no build arguments (not reproducible). The salt is mixed into the generator
  seed as today (`PARAMS.rngSalt`).
- **Logs.** As now: one start line (init time, map and brain loaded, build id), the first five errors and
  the first five slow decisions, one end line (place, kills, decisions, errors, slow count, worst time).
  `PARAMS.debug` stays false in every release; keep the debug label code behind it.

### 7.7 Ledger columns (`runs/SUBMISSIONS.md`, private)

The table of `notes/rules_audit.md` section 4.6, plus four columns the public ledgers show to be useful:

| Column | Source |
|---|---|
| ID, UTC submitted, public commit and tag | ours |
| Receipt | the site (`BB-` plus eight hex digits) |
| Bundle SHA-256, build id (preset, salt) | `tools/package.sh` |
| Baseline (parent ID) and the one change (hypothesis) | ours; one change per entry |
| Simulator practice mean with error and n; simulator free-for-all mean with error and n | `sim/run.js` on paired seeds |
| Official score, total (48 times the score), difference to the baseline | the site |
| "Wait" figure shown by the page | the site (meaning unexplained; log it anyway) |
| Gate timing: p99 and worst answer under the one-CPU quota | `tools/package.sh` |
| Board snapshot: first, 16th and 32nd score, our rank | the site |
| Decision: keep, revert, repeat with another salt | ours |

Keep two noise rows early (unchanged resubmission; salt only), as the best public logs do.

### 7.8 Release steps

1. `tools/package.sh <preset> <salt> <id>`: bundle, hygiene scan, conformance with the map and without it,
   both under the one-CPU quota; must print PASS twice, zero late answers, zero errors.
2. `tools/rules_audit/preflight.py --long --foreign intel`: must end without FAIL.
3. Copy `dist/` to `runs/sNN/`, write the ledger row up to "submitted".
4. Copy the four files into the public clone, one commit, neutral message, tag `sNN`, push, submit in the
   same minute, note the receipt.
5. When scored: fill the row; never start the next entry before the previous one shows a result.
