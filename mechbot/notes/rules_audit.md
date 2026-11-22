# Mech Royale rules audit

Written 2026-11-21 05:20 UTC. Cutoff: 2026-11-22 16:00 UTC (Sun 11:00 EST, `cutoff_at` in the page data).
Time left at writing: 34 h 40 min, so at most 138 submissions at 4 per hour.

`P` = `/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot`

Sources read in full: `kit/protocol.md`, `kit/README.md`, `kit/check/check.py` (code), `kit/mechfight.schema.json`
(bot messages), the kit wrappers' loop and doc strings, `notes/hello_example.json`, the saved pages
`web/tracks_builders.html`, `buildathon.html`, `leaderboard.html`, `status.html`, `watch.html` (text and the
embedded page data), the official replay `replay/mech16.jsonl.gz`, `kit/check/stream.jsonl.gz`, `SPEC.md`,
`BRAIN_SPEC.md`, the panel notes, and `user_docs/` (as data). Not opened: anything under `P/intel` (other
teams' repositories) and the token file.

Marks: **[R]** rule text, quoted. **[M]** measured in this audit (Appendix A). **[I]** inference, not verified.

## 0. What changes our plan

1. The practice score has one job: put our chosen entry in the top 32. The prize is decided only by a
   64-match free-for-all (FFA) series that the scorer never lets us rehearse. (L9)
2. The chosen entry "locks with its practice score": the bot that plays the final must itself clear the
   top-32 line. Two separate variants (one for practice, one for the final) are not possible. (L9)
3. In practice every house-bot death before ours is +1 and nothing else scores. The starter bot, which walks to
   the zone and shoots the nearest mech, scores 1.15. In the final the mean score is 7.5 by symmetry and
   placement is the only objective. One bot, two modes. (L7)
4. Board scores are integer totals over 48 matches (steps of 0.0208) and ties go to the earlier submission:
   26 of the top 50 teams share a score with another team, including the 32nd/33rd places. Submit early. (L8)
5. Only the best score counts and failures cost nothing but a slot. Every behaviourally different variant
   is a fresh draw; the best of 16 draws is about 0.6 to 0.8 above the bot's true mean. (L8, section 4)
6. One A/B pair of submissions cannot resolve differences under about 1.0 point. Fine tuning belongs in the
   local simulator; the scorer is for calibration, gate score, and effects of 0.75 or more. (section 4)
7. In the last shrink the zone leaves a point `p` up to 25 s early depending on which side of the drifting
   centre it is. One metre can cost 144 to 1300 HP. The formula is in L4.
8. `README.md` and `LICENSE` (MIT is mandatory) are missing from `P/bot` now; `ready.name` is `aegis-16`,
   not a confirmed team name; the Dockerfile base image is pinned by tag only. (section 1)
9. A rejected submission still uses one of the 4 hourly slots, and only one entry may be in the queue.
   Run the local gate before every push. (C19)
10. Everything we submit is public at once and must stay public. Push and submit in the same minute; submit
    the final FFA logic late. (L23)

## 1. Compliance checklist

Fast gate (run before every push; exit status 1 on any FAIL):

```sh
python3 $P/tools/rules_audit/preflight.py --long --foreign $P/intel
```

Official check (needs a Docker daemon; this sandbox has the client but no daemon, so it has NOT been run here):

```sh
cd $P/bot && docker build --no-cache --platform linux/amd64 -t mech-bot .
cd $P/kit && python3 check/check.py --map-dir /arena -- docker run --rm -i --network none --cpus 1 \
  --memory 512m --memory-swap 512m --pids-limit 128 --cap-drop ALL --read-only --tmpfs /tmp:rw,size=64m \
  --user 65534:65534 -v "$PWD/arena:/arena:ro" mech-bot
```

(`--memory-swap`, `--pids-limit`, `--cap-drop` are added to the kit's command to match protocol section 3.)
No-Docker approximation, run here [M]: `python3 $P/kit/check/check.py --map-dir $P/kit/arena -- unshare -n
taskset -c 0 $P/bun $P/bot/bot.js` gives PASS, p99 about 1 ms. It does not test uid 65534 or the read-only disk.

| ID | Requirement | Rule text or source | How to verify locally | Status 05:20 UTC |
| --- | --- | --- | --- | --- |
| C1 | Public GitHub repository, our own, `Dockerfile` at the top level | [R] "Push your bot to a public GitHub repository with the `Dockerfile` at its top level" (protocol 1) | `test -f $P/bot/Dockerfile`; after the push open the repository URL logged out; the page must not say "forked from" | Dockerfile present |
| C2 | Builds on linux/amd64 with network in at most 10 minutes; versions pinned | [R] "Builds run on linux/amd64 with network access in at most 10 minutes; pin versions because finalists are rebuilt." | `time docker build --no-cache --platform linux/amd64 ...` (expect under 60 s); `docker buildx imagetools inspect oven/bun:1.4.4-slim` gives the digest to append as `@sha256:...`; preflight S2 | WARN: tag only (same tag as the kit's `ts/Dockerfile`) |
| C3 | Passes `check.py` under the sandbox flags | [R] "the scorer runs this same check that way before your matches, so a bot that passes only without them is rejected" | Official command above; preflight D1 | PASS without Docker; Docker run pending |
| C4 | At most 20,000,000 bytes at the submitted commit | [R] "The repository may hold 20 MB at the commit you submit"; page data `max_bytes: 20000000` | preflight S1; with git: `git archive --format=tar HEAD \| wc -c` and `git count-objects -vH` | 78,793 bytes in 5 files |
| C5 | Sandbox: no network, uid 65534 with no capabilities, read-only disk except `/tmp` (64 MB), 1 CPU, 512 MB without swap, at most 128 processes and threads, map read-only at `/arena` | protocol 3 | Docker flags above; preflight S5 (network), S6 (writes), S7 (processes), S11 (file modes: a file without o+r cannot be read by uid 65534), D7 (peak memory) | PASS; peak RSS 65 MB in a 4200-decision soak |
| C6 | `ready` within 20 s of `hello`, container start included | [R] "within hello_budget_ms (20 s; covers container start)" | preflight D1 "ready time" (FAIL above 12 s, WARN above 5 s) | 0.5 to 0.6 s |
| C7 | Each answer within 50 ms wall time; `check.py` rejects when 7 or more of 300 answers are late in each of 3 passes | [R] "more than 2% late fails; a late pass is retried with a fresh bot, up to 3 passes"; code: `missing > n * 0.02` | preflight D1 and D7 (targets p99 < 15 ms, max < 30 ms); repeat while `stress-ng --cpu $(nproc)` runs to imitate a busy scorer host (the status page shows host load up to 17) | p99 about 1 ms, max about 5 ms (fallback policy only: `lib/brain.js` does not exist yet) |
| C8 | Stdout carries only protocol JSON lines, flushed per line, at most 65,536 bytes each; logs on stderr | [R] "Anything on stdout that is not a protocol message fails the conformance check"; code: any non-JSON, non-object or over-long line is a `problem` and fails the first pass | preflight S4 (one stdout call site), D1 "bad lines 0", D2 and D3 | PASS |
| C9 | Every action is schema-valid: `tick` (number, echoed), `move` and `aim` two finite numbers, `fire` exactly two booleans, `boost`/`jump`/`reload` booleans, `pick`/`take`/`drop` numbers and never `null` | schema `Action`; [R] "Answers with any other tick ... are dropped" | preflight D2 (18 legal edge-case observations incl. offers, empty slots, radius-0 zone, an 88 KB line), D4 (missing map, changed config). JS turns `NaN` into `null`, which is schema-invalid: the answer is dropped and the mech coasts | PASS 18/18 |
| C10 | Answer only the newest queued observation | [R] "If observations queue up on stdin, skip to the newest one and answer that"; code: every 25th observation arrives as three lines in one write, two of them repeats of ticks already answered; answers to older ticks are counted "stale" and tolerated, a tick never sent fails | preflight D1 "answers to older queued observations", D3 (repeated tick, 200 s gap). The recorded stream also has tick gaps of 4, 6, 8 and 128 [M]: never assume 2 ticks between observations | PASS |
| C11 | Exit on `end` or when stdin closes; never exit earlier | [R] "then stdin closes; exit"; code: no exit within 2 s is only a warning ("the server kills it"); exiting before `end` fails the check and idles the mech in a match. After death no observation arrives until `end`: no inactivity timeout | preflight D3, D6 | PASS, exit status 0 |
| C12 | Debug drawings inside the caps (64 lines, 64 points, 16 texts, 80 characters, 8192 bytes per action, 8 MB per match) | protocol 6; code: over the caps is a warning only | preflight D1 "debug drawings" | none sent (keep off in the shipped build) |
| C13 | Never crash, never stall | [R] "A bot that crashes or stops answering stays in any match as a sitting target and is scored, not rejected." | preflight D2, D3, D4, D7; stderr summary must show `errors=0 slow=0` | PASS |
| C14 | Repository public with every submitted commit until results are published | [R] "Keep your repository public with every submitted commit until results are published; an entry that cannot be fetched or built for the final scores nothing." | One tag per submission (`S01`, ...); never force-push, amend, rebase, rename or delete; after each push `git ls-remote --tags origin` and a logged-out download of `https://github.com/<owner>/<repo>/archive/<sha>.tar.gz` | repository not created yet |
| C15 | Original code, own repository | [R] (quoted in the event chat from the Blast Radius page) "One team a person, and your own team's repository. No sharing code between teams: top entries are compared, and you may be asked to explain yours. A submission with the same repository, commit or archive as another team's is disqualified, the later one." | preflight `--foreign $P/intel` fails on any byte-identical source file (we ship no kit file, so there is no legitimate overlap); `P/intel` never enters the repository; fresh repository, not a fork; push and submit within the same minute | not run by this audit (it would read other teams' files) |
| C16 | MIT licence; README names libraries and earlier code | [R] "Anything built in this hackathon must be released under the MIT License." [R] "You can use open-source libraries and code you wrote before the weekend. If your track takes a repository, name them in its README." | preflight S3. README: team name and members, how it works, "no third-party libraries; base image oven/bun 1.4.4", AI assistance (allowed: [R] "Any language, libraries, or AI are allowed") | FAIL: both files missing |
| C17 | Team rules and bot name | [R] "Up to two people, or enter on your own. Each person is on one team." [R] "Any current student ... Register with your school email." [R] "A bot's `ready` name is cut to 32 characters with control characters removed." | The user confirms eligibility and the registered team name; preflight D1 "ready.name" | name is `aegis-16`; team name not confirmed |
| C18 | No secrets in the repository | common sense; the GitHub token is used only to push | preflight S9 (token and key patterns); before the first push `git log -p \| grep -E 'ghp_\|github_pat_'` must print nothing | PASS |
| C19 | Submission limits | [R] "Your team may submit 4 times an hour"; [R] "Each track accepts one entry per team at a time, including entries waiting in line. Every submission counts toward the track's hourly limit, even a rejected one." | Gate green before each push; wait for "scored" before the next submit | n/a |
| C20 | Final pick | [R] "Pick the submission you want in the final before the cutoff. If you leave it unpicked, your best-scoring entry goes through." | At T-60 min check the track page shows the intended entry as chosen | n/a |

What `check.py` does not test: more than one enemy in view, offers, supply drops, late zone phases, long
matches, memory growth, hostile or future fields. `preflight.py` D2 to D7 cover those.

## 2. Scoring levers

**L1. Placement is death order; `alive` is the place we would get now.**
[R] "Placement is the order mechs die in: the last mech alive is 1st, and the first to die is 16th." [R] on `obs.alive`:
"Mechs still alive (NPCs not counted). Your placement if you died now would be `alive`."
[M] Every death in the official replay carries `place` = mechs alive at that moment; the kit stream ends with
`place 13` at `alive 13`.
Bot: banked points = `16 - alive`. Each other mech that dies before us is +1, whoever kills it. When our death is
certain, the only useful act is one that makes another mech die first (finish the lowest-HP enemy in reach);
when another death is imminent elsewhere, staying alive a few ticks longer is +1. Confidence: high.

**L2. Same-tick deaths share a place.**
[R] "Mechs that die on the same tick share a placement."
[M] All 51 visible board scores are integer totals over 48 matches: no half places appear, so shared places
are whole numbers or same-tick deaths involving the entrant are very rare. The replay has no same-tick mech
deaths, so whether the shared place is the better or the worse one is unknown.
Bot: value a same-tick trade at 0 extra points; never plan around it. A kill one tick before our death is a
sure +1. Confidence: rule high, direction unknown (A1).

**L3. If the clock runs out, survivors are ranked by HP.**
[R] "If the clock runs out, survivors are ranked by HP."
With the default config this cannot happen: the zone is a point at 415 s, 260 HP/s, and the largest HP pool
(10 cubes, 3 plating) is 2981, so everyone is dead by about 426.5 s, before the 480 s cap.
Bot: compute from `hello.config` whether the zone can kill everyone before `match.duration_s`. Only if it
cannot: in the last `regen_delay + (max_hp - hp) / regen_per_s` seconds stop dealing damage, stay in the zone
out of sight, and take a cube last (+4% max HP, healed). Confidence: high; relevant only after a config change.

**L4. The radius-0 finale converts HP and position into placement.**
[R] "Starts at radius 560 m around (41.3, −72.8), then shrinks 380 → 240 → 140 → 70 → 25 → 0 m." [R] "Outside it, you
lose `dps` HP per second (no armor, no regen)." [R] "the center and radius move linearly from the current circle to
the next one."
Schedule from the config (seconds): hold/shrink 0-60/60-110 (20 HP/s), 110-155/155-195 (35), 195-230/230-265
(60), 265-295/295-325 (100), 325-350/350-375 (160), 375-390/390-415 (260). [M] The replay's zone table matches,
and zone damage is applied every tick (1.75 = 35/20, 3 = 60/20).
The final centre is published at 375 s as `zone.next_center`. A point `p` leaves the zone during a shrink at
`t_exit = shrink_end - w * shrink_s`, where, with `q = p - c_next`, `v = c_current - c_next`, `R` = current
radius, `r1` = next radius, `dR = R - r1`, `a = dR^2 - |v|^2`, `b = r1*dR + q.v`, `c = |q|^2 - r1^2`:
`w = 0` if `c <= 0`; `w = min(1, c / (2b))` if `a = 0` and `b > 0` (1 if `b <= 0`); otherwise
`w = min(1, (-b + sqrt(b^2 + a*c)) / a)`. [M] Checked against brute force (error below 1e-5). During a shrink the
same formula holds with the current `zone.center`, `zone.radius` and the remaining time `shrink_end - t`.
Examples for the last shrink (25 s, 260 HP/s), 5 m from the final centre: no drift 1300 HP; drift 4.8 m (the
replay's value) 1091 to 1609 HP; drift 20 m: 722 HP on the side toward the old centre, 6500 HP on the far
side. After 415 s a mech lasts `hp / 260` s: 5.4 s at 1400, 7.5 s at 1960, 11.5 s at 2981.
Bot: (a) from 375 s the goal is `next_center` itself; only one body fits on it (radius 2.5 m, more with
cubes; "Overlapping mechs are pushed apart"); if displaced, stand on the side toward the previous centre.
(b) Rank mechs by `E = hp - dps * exposure(p)`; do not spend HP on mechs with lower `E`: the zone kills them
first. (c) Plating and cubes raise `E`; armour and nanites do nothing here. (d) A mortar blast throws mechs at
16 m/s: it moves a rival off the point, and each metre is hundreds of HP. Lightning (45 m) reaches across the
whole last circle. (e) In practice the surviving squad dies in the same order: being alive at 415 s with the
largest `E` is 15 points. Confidence: geometry high; the 2-D centre-point test for "inside" is assumed (A11).

**L5. A crash is a scored sitting target.**
[R] "Crash = idle: If your process exits, your mech idles for the rest of the match."
Bot: wrap every stage; fall back to a safe action; never exit; bound every history buffer (512 MB without swap:
an out-of-memory kill is a crash). In an FFA a mech with zero velocity and frozen aim for 2 s is a crashed
or late bot: its cubes plus two are free. Confidence: high.

**L6. A late answer costs the trigger, then the mech.**
[R] "your mech keeps the continuous parts of your last action (`move`, `boost`, `aim`) and drops the one-shot
parts (`fire`, `jump`, `reload`, `pick`, `take`, `drop`). After `coast_s` (1.0 s) of missed answers, your mech
idles." [R] "Answer times vary by a few ms between runs and machines, so a bot that answers near the limit can
score differently on a rerun."
A late tick stops the gun, releases a charging laser early at partial charge, loses a `pick` or `take`, and keeps
draining energy if `boost` was set. Bot: typical decision 3 to 5 ms; a deadline guard near 25 to 30 ms that reuses
the previous plan and should never fire (when it fires the run is no longer reproducible); warm the code paths
during the `hello` window; no allocation in the hot path; resend `pick` and `take` until the event confirms them.
Fast answers also shorten the 48-match run ([R] "A fast bot speeds up the match"). Confidence: high.

**L7. Practice: one bot against a 15-bot squad on fixed seeds.**
[R] "Practice plays 48 matches against 15 house bots (4 easy, 4 medium, 4 hard, 3 expert) acting as one squad:
they share vision, never fight each other, and hunt you weakest first (one early, more as you thin them out,
all of them late)." [R] "Practice seeds are private and fixed all event. Your bot never sees the seed, and your slot
and spawn vary each match."
[M] Board at 04:25 UTC: 1st 5.58 (268 points), 16th 4.73 (227), 32nd 4.23 (203), 50th 4.00 (192), starter 1.15
(55). 21 of the top 50 sit between 4.00 and 4.25 [I: the four easy bots die, then the entrant dies].
[M] House bots can die to the zone: in the official FFA replay a house brawler died outside the circle at 209.65 s.
Bot: practice score = house bots dead before we die (L1). The first hunter is a lone easy bot: the cheapest
point in the match. Each kill raises the number of hunters, so return to full HP out of sight between kills
when possible. "All of them late" is a deadline for cheap kills. Zone and drone deaths of house bots count the
same as ours. Confidence: rule high; how the escalation is triggered is unknown (A2).

**L8. Only the best practice score counts; ties go to the earlier submission.**
[R] "The leaderboard ranks each team's best practice score alongside the starter bot." [R] "Equal scores rank the
earlier submission first." [R] "Failed builds or checks are rejected with the reason and never affect your best score."
[M] Scores are multiples of 1/48 = 0.0208. In the top 50 there are 12 tied groups covering 26 teams; 32nd and
33rd both have 4.23 and are split by submission time.
Bot and process: put a passing entry on the board now for the timestamp. A low score costs nothing. Each variant
that behaves differently is a new draw from the same strength; expected best of N draws at a per-match SD of 3 is
+0.45 (N=4), +0.62 (8), +0.77 (16), +0.90 (32), +1.02 (64), +1.12 (128). Give the bot a build salt mixed into
the RNG seed so that a new draw costs a one-line change. Confidence: arithmetic high, SD assumed (section 4).

**L9. The final: top 32, 16 qualifying matches, top 16, 64-match series.**
[R] "At the cutoff, your chosen submission (your best unless you pick another) locks with its practice score. The
top 32 teams enter a qualifying round: each plays 16 matches (16-mech free-for-alls) against other qualifiers on
new seeds. The top 16 by qualifying mean (16 - place) advance and are announced without scores. All 16 finalists
play a 64-match series (16-mech free-for-alls) together on new seeds; the last 4 play live at the venue and count
the same. The series mean alone decides finalist rankings, and earlier submissions break all ties."
[R] "Each track pays $5,000 to the winner. Winner takes all. Second place gets nothing."
Consequences: (a) practice only seats us; (b) the entry that plays the final must itself hold a top-32 score;
(c) an FFA has mean score exactly 7.5, per-match SD about 4.6, so a 16-match qualifying mean has a standard
error near 1.1 and a 64-match mean near 0.55: an average FFA bot is eliminated half the time; (d) scoring is
linear, there is no bonus for winning a match: maximise expected place; (e) winner-takes-all on a noisy mean: if
we are not the favourite, prefer the higher-variance option in close calls, if we are, the lower; (f) ties in the
final also go to the earlier submission: among equal candidates choose the earliest. Confidence: high.

**L10. Empty seats.**
[R] "Expert house bots fill empty slots. If a qualifying entry fails to fetch or build, it sits out and the next
practice-board team takes its seat."
Being 33rd to 36th still has value; our own entry must still fetch and build when finalists are rebuilt (no
dependencies, pinned base image). [M] In the official FFA replay house bots kill each other, so a fill-in expert is an ordinary FFA
opponent. Confidence: high.

**L11. `hello.seed` is fixed per slot.**
[R] "`seed` is yours: seed your RNG with it to make your bot reproducible. It is fixed per slot and says nothing
about the match (it is not the match seed)."
Bot: all randomness from a PRNG seeded with `hello.seed` mixed with a build salt; no `Math.random`, no clock in
decisions. Then a resubmission of the same logic reproduces its score (A4), and a new salt is a new draw.
Note: the protocol example shows slot 3 with seed 2873465123, the kit stream slot 3 with 315233926, so the
table may change between scorer versions. Confidence: medium-high.

**L12. The config can change between matches.**
[R] "`config` is the complete rule set the server uses. Read numbers from it instead of hard-coding them, because
balance changes between matches." The track page shows "Scorer version builders-3".
Bot: zone schedule from `config.zone.phases`; weapon numbers from `self.weapons[i].stats`; mech numbers from
`self.stats`; decision interval from `tick_hz / decide_every` and from the tick difference; thresholds as
ratios; work without enemy `hp` (`vision.show_enemy_hp`), with unknown weapon kinds and upgrade ids, with a
different number of phases. [M] preflight D4 passes on a mutated config. Confidence: high.

**L13. Vision memory.**
[R] "Once you have seen a mech or an NPC drone, you keep tracking its real, current position for `memory_s` (5 s)
after it leaves view ... Everything else (crates, cubes, weapon pickups, projectiles) is listed only while you see it."
Bot: a listed mech is at its true position even behind a wall: pre-aim the corner, lob the mortar. A 240 degree
torso sweep (1.05 s at 4 rad/s) at least every 5 s keeps every mech with line of sight inside 200 m tracked.
The same holds against us, and the practice squad shares vision: cover stops shots, not knowledge. Loot needs
our own memory. Confidence: high.

**L14. Supply drops are known to everyone and heal fully.**
[R] "Every mech sees it in `obs.drops` from the moment it is called." [R] "stand inside its ring (`radius` 8 m) alone
for `capture_s` (4 s) to gain `cubes` (3) power cubes, full HP, and full energy." [R] "While two or more mechs are
in the ring, the capture clock freezes. If the ring empties, or a different mech becomes the only one in it, the
clock restarts."
[M] Replay: a capture took a mech from 1327/1456 HP and 1 cube to 1624/1624 and 4 cubes; house bots captured 12 s
and 8 s after landing. Calls at 70/140/210 s, landings at 95/165/235 s, inside the circle the zone is closing to.
Bot: the only instant full heal. Be at the ring at landing time when the approach is survivable; nothing in the
rules lets damage interrupt a capture [I]; stepping into an enemy's ring freezes it; a mortar blast that empties
the ring restarts it; `holder` and `progress` reveal an enemy's position without line of sight; an untaken drop
stays usable. Confidence: rules high.

**L15. Rear armour.**
[R] "A hit from outside your torso's front arc (`mech.front_arc_deg` 180°, centered on your aim yaw) deals
`mech.rear_mult` (×1.5) damage. The direction is where the shot came at you from: the bullet's path, the beam's or
arc's origin, or the blast point of a shell."
Bot: legs and torso are independent, so retreat while the torso faces the main damage source; with several
attackers choose the yaw that keeps the largest damage share inside 180 degrees and keep a wall behind; shoot
mechs whose aim points away (rear laser 472, rear laser on a mortar holder 756); a shell that lands just behind
a target counts as rear, so err long. `damaged.rear` and `hit.rear` measure it. Confidence: high.

**L16. Regeneration needs 5 s without dealing or taking damage, inside the zone.**
[R] "After `regen_delay` (5 s) without dealing or taking damage, you regenerate `regen_per_s` (45) HP/s, except
while outside the zone. Zone damage counts as taking damage: the 5 s timer starts again when you step back inside."
Bot: healing means holding fire as well as hiding. One hit every 5 s denies an enemy's regeneration and ours too,
so do it only when ahead. Instant heals that ignore the timer: a cube (+4% max HP, healed), plating ([M]
replay: 1231/1456 became 1454/1674, so the pick can be delayed up to 5 s and used as a heal), a supply drop.
Two nanites: 2 s delay, 115 HP/s. Confidence: high; whether crate and drone hits count as dealing damage is open (A12).

**L17. Zone damage ignores armour and stops regeneration.**
[R] "Armor (upgrades) reduces weapon damage, not zone damage."
Bot: early zone is cheap (20 HP/s is 70 s of life at 1400 HP) and can be crossed to avoid a fight at the price
of the 5 s regeneration delay; from phase 4 (100 HP/s and up) never. Fastest possible edge speed including centre
drift: 7.2, 7.0, 5.7, 4.7, 3.6, 2.0 m/s by phase, all below walking speed 11.7 m/s, so the zone is outrun on
any path up to 1.6 times the straight line. Use the L4 formula as the per-cell arrival deadline. Confidence: high.

**L18. Cubes: stats cap at 10, size does not.**
[R] "+4% max HP (healing the difference) and +4% damage, up to `stat_cap` 10 cubes." [R] "Each cube also makes you
`size_per_cube` 5% bigger, with no cap" [R] "Cubes go to the closest mech within `cubes.pickup_radius` (ties go to
the lower id)."
[R] "Killed mechs drop all their cubes plus two." Thresholds: 1, 3, 6, 10, 15, 21, 28, 36, 45.
[M] The replay winner reached 16 cubes with max HP still 1960.
Bot: get to 10 fast. Above 10 a cube is only size (radius 3.75 m and height 13.5 m at 10 cubes) and a step toward
the upgrade at 15 or 21. Pickup is automatic inside 3.5 m and cannot be refused: route around cubes when over
the cap unless the next threshold is in reach. Size changes navigation clearance and what cover hides us. A mech
with many cubes is a larger target carrying a larger drop. Confidence: high.

**L19. Offers default to choice 0 after 5 s.**
[R] "If you do not pick by `expires` (5 s), choice 0 is applied." [R] "Offers queue; the next offer appears after you
resolve the current one." [R] "weapon upgrades only for weapons you hold when the offer is drawn" [R] "Weapon upgrades
belong to your mech, not the item"
Bot: send `pick` on every decision while `offer` is not null (a late tick drops it). Hold the weapon kinds whose
upgrades we want before crossing a threshold (pool: 9 general, 4 gun, 3 per special weapon held). Upgrades of a
kind we abandon are dead weight: commit to the gun plus one special. Confidence: high.

**L20. Loadouts are visible and the triangle is hard-coded.**
[R] "Laser beats mortar (cook-off ...). Mortar beats lightning ... Lightning beats laser (short)." `mechs[].weapons`,
`charging` and `aim` are in every observation.
Bot: drop the mortar (`drop` alone) when a laser holder has line of sight (+60%: 504, or 756 from behind);
stay beyond 45 m (54 or 65 m with Tesla coil) of a lightning holder; break line of sight before a visible charge
completes; a taken weapon cannot fire for `max(1 s, its cooldown)` (mortar 2.6 s), so no swaps under fire.

**L21. Early cubes.**
[R] "Destroying a crate drops 1 cube, and drops a weapon with probability `loot.crate_weapon_chance` (0.5)."
[R] "Each drone drops 2 cubes."
A crate is 7 bullets (300 HP), a drone 8 (350 HP, 25 damage per second back, and its hit restarts our
regeneration). Spawns are at least 130 m apart. Bot: opening route = nearest weapon pickup plus crates and
drones on the way while at full HP; the first upgrade arrives with the first cube.

**L22. Free information.**
`damaged.by` and `damaged.bearing` identify an unseen attacker; `hit` events (crates since 2026-11-16) measure our
hit rate; `kill` counts our kills; `alive` counts everyone's. `(16 - alive) - our kills >= 2`, or a beam or bullet
between two other mechs, means the match is an FFA, not practice. Two zone or drone deaths of house bots would
trip the count alone, so require the beam or bullet evidence as well before leaving practice behaviour.

**L23. Public repository, copies, and timing.**
[R] C14 and C15 texts. A copier who submits our commit before we do would make ours "the later one"; every
pushed commit is readable by rivals before the cutoff.
Process: develop privately; push only what is submitted and submit within the same minute; submit the real
final logic between T-3 h and T-1 h; keep the code readable because we "may be asked to explain" it.

**L24. Fixed map.**
[R] "The map is the same every match; spawns, crates, NPCs, loot, the zone, and supply drops are random per match."
All map work (walkability, cover, bastions, roof access) can be precomputed inside the 20 s `hello` budget
(target under 3 s) or shipped as data inside the 20 MB limit.

## 3. Ambiguities and how to resolve them

| ID | Question | Why it matters | How to resolve | Working assumption |
| --- | --- | --- | --- | --- |
| A1 | Do same-tick deaths share the better or the worse place? | value of trades and of the finale | Search any further official replay for two mech `death` events with equal `t` and read their `place`; in the browser game die together with a bot | worse place (no gain) |
| A2 | How many hunters after k kills, what "late" means (time, zone phase, alive count), whether non-hunters shoot on sight | the whole practice plan | Read the result page for per-match data or replays (A3); the user watches the cast or plays one browser match; one probe submission that never fires and only evades: its score is the house deaths we did not cause and its run time shows how long it lived | hunters = 1 + kills, all from about phase 4 |
| A3 | What does a scored submission show: total only, per-match places, replays, stderr, debug file? The kit contradicts itself: wrappers say "Your team sees stderr after each match" and debug is "recorded to a file only your team can download"; protocol says "Matches do not show stderr to you" and "Nothing on the track shows them to you" | decides whether per-seed analysis and telemetry are possible | Look at the first scored submission's page | total only, no telemetry |
| A4 | Is a rerun of identical logic identical? | meaning of every A/B | S02 = S01 plus a README-only change; compare the two totals | identical unless timing interferes |
| A5 | Is `hello.seed` the same for a slot in every match and scorer version? | reproducibility | Only observable with telemetry (A3) | fixed within a scorer version |
| A6 | Which commit is scored: the head at submit time or at fetch time? Can a commit be named? | pushing during scoring | Read the submission row (commit hash); never push between submit and "scored" | head at submit time |
| A7 | Is 20 MB the tree at the commit or the whole clone? | history hygiene | Keep both under 1 MB | tree at the commit |
| A8 | Does the code-sharing rule apply to this track, and does reading public repositories count? The saved Mech Royale page (signed out) does not contain the text; it is known from a chat quote of another track's page | disqualification risk | Treat as binding; ask hi@joinbuilders.org if needed | binding; ideas only, no code, no constants copied |
| A9 | Does an entry still queued at the cutoff count? | last-minute plan | Do not find out: last submission at T-45 min | does not count |
| A10 | If we pick a lower-scoring entry, is the top-32 cut applied to that entry's score? | choosing an FFA-safe entry | The rule text says yes ("locks with its practice score"); confirm in the pick dialog | yes |
| A11 | Is "inside the zone" a 2-D test on the mech centre, and does 260 HP/s continue after 415 s? | finale positioning | A replay that reaches 415 s (ours ends at 209 s), or one browser match | yes to both |
| A12 | Do hits on crates and drones restart our regeneration? Do misses? | farming while healing | Replay: a mech that shoots a crate while damaged; local sim follows the answer | hits yes, misses no |
| A13 | When is an offer drawn (threshold reached or shown)? Does the 5 s run for queued offers? | weapon-held trick in L19 | Replay `upgrade` events against `weapon` events; local sim | drawn when shown |
| A14 | Does damage interrupt a supply-drop capture? | L14 | Replay: HP of a holder during `state 2` | no |
| A15 | Are remembered mechs flagged, and do their `hp`, `aim`, `charging` stay live? | target model | Needs a stream with occlusion (the kit stream has one enemy always in view [M]) plus our line-of-sight code | not flagged, live |
| A16 | Is there a wall-clock cap on a 48-match run? | slow bots | Unknown; runs take 1 to 4 minutes now | keep decisions under 5 ms |
| A17 | Can the config differ inside one 48-match run or only between scorer versions? | L12 | Watch "Scorer version" on the track page; when it changes, resubmit the current best | assume it can |
| A18 | Is the 4-per-hour limit a rolling window? | scheduling | The form "shows ... when the next one frees up" | rolling |
| A19 | Is direct-hit mortar damage 200 + 160, and is the splash distance measured to the centre? | aim point | Replay `boom` and `hit` pairs | 360 on a direct hit |
| A20 | May a program connect to the browser game's server (the Play page speaks the same `hello`/`obs`/`end` messages over a WebSocket)? | unlimited test matches | Not sanctioned by any rule text: ask the organizers first; a person playing by hand is clearly allowed | not allowed |

## 4. Submission strategy

### 4.1 What a score can tell us

- Total points `T = 48 * score`, an integer. One point of `T` is 0.0208.
- Per-match score SD is not published. Kill counts with mean 5.5 give about 2.3 if Poisson-like; a few long
  survivals push it to 3 to 3.5. Planning value 3.0.

| Per-match SD | SE of one 48-match score | SE of a difference of two scores | Difference needed for 95% | Same seeds, correlation 0.3 |
| --- | --- | --- | --- | --- |
| 2.0 | 0.29 | 0.41 | 0.80 (38 points of T) | 0.34 |
| 2.5 | 0.36 | 0.51 | 1.00 (48) | 0.43 |
| 3.0 | 0.43 | 0.61 | 1.20 (58) | 0.51 |
| 3.5 | 0.51 | 0.71 | 1.40 (67) | 0.60 |
| 4.0 | 0.58 | 0.82 | 1.60 (77) | 0.68 |

- The seeds are the same for both arms, but the two bots' matches diverge after the first different action, so the
  pairing removes little noise. Treat the "same seeds" column as the best case.
- Reading one A/B pair: below 0.6 no information; 0.6 to 1.2 suggestive, replicate; above 1.2 real.
- Replication with k salts per arm (SD 3): a true difference of 1.0 needs 3 per arm, 0.75 needs 6, 0.5 needs 12
  (6 hours of slots for one question), 0.25 needs 48. The scorer cannot tune parameters.
- Local simulator: 400 seeds per arm gives SE 0.15 per arm; use it for everything under 0.75, and use the scorer to
  check that the simulator's score for a build matches the real one (column "sim" in the log).
- The noise itself is measured by S01, S03, S04 below: the SD of their three scores is the SD of one score.

### 4.2 Experiment protocol

1. One file, `lib/build.js`: `export const BUILD = { id: 'S07', preset: 'base', salt: 3 }`. `preset` names a row
   of parameter overrides; `salt` is mixed into the RNG seed. A submission differs from its baseline in exactly one
   field of this file or in one code change, never both.
2. Tag and commit message = submission id. Write the log row, including the simulator's prediction, before the
   result arrives.
3. Always use all four hourly slots. Priority: (a) a structural change waiting for validation; (b) a calibration
   probe; (c) another salt of the current best (a board ticket and a noise sample at once).
4. Decision for a change (difference against the baseline, both averaged over the same number of salts):
   adopt when the simulator shows at least +2 SE and the scorer shows no worse than -0.5; reject when the scorer
   shows -1.0 or worse on one pair or -0.5 or worse on the mean of three; otherwise replicate or decide on the
   simulator alone.
5. Strength is the mean over salts. The maximum over salts is only the number we lock in.
6. Do not resubmit an identical commit except for the single determinism test (S02).

### 4.3 Schedule and lock (T = 2026-11-22 16:00 UTC)

| When | What |
| --- | --- |
| now | S01: first build that passes the gate, whatever its strength. Banks a timestamp; answers A3, A6, A18 |
| +15 to +45 min | S02 determinism, S03 and S04 salts: answers A4 and gives the noise SD |
| until T-12 h | Development in the simulator. Scorer slots by the priority in 4.2. Record the board's 1st/16th/32nd/40th scores every 3 h |
| T-12 h | Architecture freeze. After this only presets, salts, and fixes for crashes or FFA safety |
| T-6 h to T-3 h | At most 3 candidate presets, 3 salts each (9 slots). Rank by mean. Each must also pass the local FFA bar (4.4) |
| T-3 h to T-1 h | 8 slots: 8 more salts of the chosen preset. The best-scoring salt is the entry; on equal scores the earliest |
| T-60 min | Pick the entry explicitly on the track page. Check: chosen entry shown, repository public, tag present, logged-out archive download works |
| T-45 min | Last moment for an emergency submission. Nothing later (A9, and the queue will be busy) |
| after T | Do not touch the repository until results are published |

Submitting needs a signed-in person on the track page; no submission interface for programs is documented. Hours
without that person are lost slots: place the candidate and salt blocks in attended hours.

Gate rule: the chosen entry needs `score >= L32 + margin`, with `L32` the 32nd score on the board and
`margin = max(0.5, 2 * rise of L32 over the last 3 h)`, evaluated at T-60 min. If the preferred candidate fails
it, choose our highest-scoring entry instead: not qualifying is worth nothing.
Lock early when the margin is at least 1.0 and the local FFA mean is at least 9.0 against every opponent pool:
further pushes only publish our logic.

### 4.4 The risk of a practice-tuned bot in the final

Model (`tools/rules_audit/stats.py`: 16 performances = skill + Gumbel noise, ranked):

| Our mean score against average finalists | Chance to pass qualifying (16 matches, top 16 of 32) |
| --- | --- |
| 7.5 | 0.50 |
| 8.3 | 0.79 |
| 9.3 | 0.95 |
| 10.2 | 0.99 |

In the 64-match series against 15 rivals whose skill varies, an edge of about 1 point over the average finalist
wins about 11% of the time, 2 points about 54%, 3 points about 91%. Qualifying alone eliminates an average FFA
bot half the time, and no practice score changes that.

How a practice-tuned bot loses in an FFA: it assumes nobody else fights (so it ignores third parties and stays
on one target); it expects one weak hunter first (and walks into a strong bot); it counts kills as the score (and
chases); it relies on house-bot habits (slow reaction, known aim) that team bots do not share.
Required before the lock: (1) environment detection with a safe default (L22) and no logic keyed to practice
seeds; (2) at least 300 simulated FFA matches against each of three pools (16 copies of our bot, house
stand-ins, mixed aggressive and passive variants) with a mean of 8.5 or more in each; (3) the practice score of
that same build above the gate rule. If (2) and (3) conflict, (3) wins until the margin is 1.0, then (2).

### 4.5 Levers we decline

- Recognising the 48 practice matches from the first observation (slot, spawn, first `next_center`) and choosing
  a preset per match would add 1.5 to 3 points on the board. It contradicts the stated intent ("Your bot never
  sees the seed"), is worthless on the final's new seeds, and would have to be explained to organizers who
  "compare" top entries. Do not build it.
- Connecting a program to the browser game's server without permission (A20).
- Copying or adapting any other team's code or constants (C15).

### 4.6 Experiment log (fill one row per submission)

| ID | UTC submitted | Commit / tag | Baseline | One change (hypothesis) | preset / salt | Sim practice mean +- SE (n) | Sim FFA mean +- SE (n) | Score | T = 48 x score | Diff vs baseline | Run time | Gate p99 ms | Board 1st / 16th / 32nd | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | | | none | first passing build | base / 0 | | | | | n/a | | | | timestamp banked |
| S02 | | | S01 | README only (determinism, A4) | base / 0 | same | same | | | expect 0 | | | | |
| S03 | | | S01 | salt only (noise sample 1) | base / 1 | same | same | | | | | | | |
| S04 | | | S01 | salt only (noise sample 2) | base / 2 | same | same | | | | | | | SD of S01, S03, S04 = |
| S05 | | | best | | | | | | | | | | | |
| S06 | | | best | | | | | | | | | | | |
| S07 | | | best | | | | | | | | | | | |
| S08 | | | best | | | | | | | | | | | |
| P01 | | | S01 | probe: never fire, only evade (A2) | evade / 0 | | n/a | | | | | | | read: house deaths not caused by us |
| C1a | | | best | candidate 1 | c1 / 0 | | | | | | | | | |
| C1b | | | C1a | salt | c1 / 1 | | | | | | | | | |
| C1c | | | C1a | salt | c1 / 2 | | | | | | | | | mean of C1a-c = |
| C2a | | | best | candidate 2 | c2 / 0 | | | | | | | | | |
| C2b | | | C2a | salt | c2 / 1 | | | | | | | | | |
| C2c | | | C2a | salt | c2 / 2 | | | | | | | | | mean of C2a-c = |
| F01-F08 | | | chosen | salts of the chosen preset | cX / 3-10 | | | | | | | | | entry = best score, earliest on ties |

## 5. Where the user's notes conflict with the rules or the measured facts

1. "Survival optimization ... kills matter only through cubes" (dossier, strategy report). True for the FFA
   final. False for practice, which gates the final: house bots never fight each other, so the score is the
   number of house bots dead before us. Evidence: starter 1.15, best 5.58, 32nd place 4.23.
2. "Focusing on defense until the end" (the request) and "avoid marginal fights". A defensive bot scores near the
   starter in practice and does not reach the top 32. Defence first is correct only after FFA is detected.
3. "Consistently places top 4". No team averages better than place 10.4 in practice; top 4 would need 12 or
   more house bots dead.
4. "Maintain separate exploitation and generalization variants" (dossier). One entry is chosen and it "locks with
   its practice score": the entry that qualifies is the entry that plays the final.
5. "Bot team coordination", "seven parallel agents", "agent swarm" in the match. A team has one mech; the sandbox
   has 1 CPU and 50 ms. The seven agents can only be seven functions called in sequence. Coordination between
   two entries would break "One team a person ... No sharing code between teams".
6. "Third-party engagements", "let others create risk", "false attacks to trigger other bots". There is no third
   party in practice: the squad never fights itself and shares vision. These tactics exist only in the FFA rounds.
7. "Supply drops: ambush over rush". A capture is 4 s for full HP, full energy and 3 cubes, and nothing in the rules
   lets damage interrupt it; in the replay house bots captured 8 to 12 s after landing. In practice there is
   nobody to ambush except the hunters who are already coming.
8. "Rotate early to `next_center` and hold interior cover". Only the next circle is known; the final point appears
   at 375 s. Against a converging squad the centre has the most approach angles; early zone damage is 20 HP/s and
   the zone is slower than walking.
9. "Avoid cube grabs past 10". Pickup is automatic within 3.5 m; cubes beyond 10 still count toward the upgrades
   at 15 and 21; a supply drop adds 3 regardless. The replay winner had 16.
10. "Final four: shift to combat weighting". Scoring is linear with no win bonus. What changes late is the zone:
    use the `E` ranking of L4, not a general rise in aggression.
11. "Prioritize rooftops". Not against the rules, but `SPEC.md` limits navigation v1 to the ground layer, and a
    quarter of crates and loot are on roofs. Treat roofs as out of scope unless the simulator shows a gain.
12. Python bot export, "pure Python 3.13 stdlib", `python:3.13.2-slim` (user simulator). Allowed by the rules, but
    `SPEC.md` fixes plain JavaScript on Bun 1.4.4. Ship one runtime.
13. "Week 0 to Week 3" plan. The cutoff is Sun 2026-11-22 16:00 UTC.
14. "Kept public ... through final scoring". The rule says "until results are published".
15. Silent walking and Bayesian sound fusion as core modules. The practice squad shares vision; sound is useful
    only in the FFA rounds, and moving at 5 m/s makes us an easy target.
16. The user simulator's results are not measurements of the real game: it is a simplified model. The user's
    own simulator text does agree with `SPEC.md` on one point the other notes miss: "Practice rewards kiting &
    thinning weak Easy bots, while Finals reward third-partying and late-zone survival."

Our own notes, for the record: (a) `stance_playbook.md` uses "radius = 415 - t" and `E = hp - 260 d`; that is
exact only without centre drift, use the L4 formula. (b) `SPEC.md` lists the replay's house types (expert, hard,
medium, brawler, sniper, thirdparty, farmer); the practice squad is "4 easy, 4 medium, 4 hard, 3 expert" and no
squad replay exists, so the simulator's easy-tier stand-in is unverified. (c) The `SPEC.md` layout has no
`LICENSE`; it is mandatory. (d) "Leaderboard right now" in `SPEC.md` is the 04:25 UTC snapshot.

## Appendix A. Measurements made for this audit

- Board (page data, 04:25 UTC): 50 standings with timestamps; all 51 scores equal an integer divided by 48
  (chance of that for arbitrary two-decimal numbers: below 1e-16). `max_bytes` 20000000, `practice_limit` 4,
  `cutoff_at` 2026-11-22T16:00:00Z, scorer `builders-3`, 141 teams. Status page: Mech Royale run time p50 1 m 33 s,
  p95 3 m 50 s, 24 workers, 210 scored and 1 rejected in the last hour, queue 0 of 1000.
- Replay `mech16.jsonl.gz` (16 house bots, FFA, ended at 209.65 s): places equal the alive count at death; no
  same-tick mech deaths; zone hits 1.75 and 3 per tick; one house bot killed by the zone; plating, cube and drop
  effects as quoted in L14, L16, L18; zone schedule equal to the config.
- Kit stream: 300 observations, slot 3, seed 315233926, config identical to `notes/hello_example.json`; tick steps
  2 (295 times), 4, 6, 8, 128; one enemy, always in view; `end` place 13 at `alive` 13.
- `check.py` code: the behaviours listed in C7 to C12.
- Current `P/bot` (fallback policy, no `lib/brain.js` yet): preflight 24 pass, 1 warn (image digest), 2 fail
  (README, LICENSE).

## Appendix B. Files of this audit

- `P/notes/rules_audit.md` (this file)
- `P/tools/rules_audit/preflight.py` compliance gate (S1 to S12 static, D1 to D7 dynamic)
- `P/tools/rules_audit/stats.py` the numbers of section 4 (seeded, standard library)
- `P/tools/rules_audit/strip.py`, `chat.py`, `grep_ctx.py` page-text helpers; `*.txt` the stripped pages
