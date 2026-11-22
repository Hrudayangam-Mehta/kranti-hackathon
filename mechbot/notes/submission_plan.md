# Submission plan (owner only; never goes into the repository)

> SUPERSEDED (19:15 UTC Sat) by notes/panel_r4_schedule.md, which lists the corrections (its section 10):
> sections 3, 5 and 6 never ran or no longer apply; sigma per draw is 0.16-0.17, not 0.20; the adoption bar
> (+0.6, or +0.4 after a second salt) would adopt a true +0.2 change only 11% of the time; the cut is now about
> 5.4 and projected 5.8-5.9 at the close; freezes are 09:00 (SQUAD code), 11:00 (presets), 12:30 (FFA code),
> 15:15 (last submission). Section 4 (owner checklist) still applies, extended to both tracks.

Written 07:15 UTC Sat. Cutoff Sun 16:00 UTC. Board 05:19 UTC: 1st 5.58, 16th 4.92, 32nd 4.44 (+0.15 per
hour since 02:40). The first submission waits for the owner's "go".

## 1. Numbers used
- One match point = 1/48 = 0.021.
- Identical deterministic code repeats exactly; any behaviour change, a salt included, re-rolls all 48
  matches (measured about 0.3, D04-D05): one draw has sigma about 0.2.
- One changed-build pair: |d| < 0.3 is noise (a draw only); 0.3-0.6 replicate; 0.6+ is real. Two salts per
  arm: adopt at a mean difference of 0.4+.
- Identity check (a change that must not touch practice, or a resubmitted hash): any difference fails.
- Best of N draws of one build: +0.2 (4), +0.3 (8), +0.37 (16); each draw beyond 8 adds under one match
  point.
- The final is all free-for-alls: practice points above the cut are worth nothing. Practice only has to seat
  the safest free-for-all build.

## 2. Check of rules_audit.md section 4
- Correct: the SE table, 138 slots, the k-per-arm counts, L9's 4.61 / 1.15 / 0.58.
- Wrong noise model: SD 3 with weak pairing predicts 0.61 for a re-roll difference; measured re-rolls moved
  0.06 and 0.27. Fixed seeds remove most variance: best of 16 is +0.37, not +0.6-0.8; one pair resolves 0.6,
  not 1.2; its reject lines (-0.5, -1.0) are twice too loose.
- "Free-for-all mean 8.5 (lock 9.0) in every pool" is impossible for 16 copies of our bot: they average
  exactly 7.5. Use one candidate seat among 15 base copies.
- Its margin "2 x the 3-hour rise" covers a one-hour horizon six times; replaced in section 5.
- "Always use all four slots" ignores publication: every slot here carries a decision.

## 3. Schedule
Hours without the owner are skipped; Sunday anchors do not move. Base = SELECT defaults (laserRange far,
healExit 70, farmHp 90, strafe d4, ffaPair on, beamClue off, idlePull off, env auto), salt 0. Leader = the
best-supported preset set so far. The simulator's prediction is logged before each slot.

Phase A (first hour after "go"):
- S01 base. Banks the timestamp, calibrates the simulator. Rejected: next slot is that fix only. Below
  L32 - 0.5, or 1.0 under the simulator: stop; debug timing, stuck, crash locally.
- S02 base, env squad (latch off), salt 0. Identical to S01: deterministic AND the latch is silent in all 48
  practice seeds. Different: S03 resubmits S01's hash (no new commit); equal again = the latch leaks, harden
  it; different = not deterministic, remove the clock dependence before any A/B. Later slots shift by one.
- S03 base, salt 1. |S03 - S01| is our own re-roll noise; above 0.45, multiply every threshold by 1.5.
- S04 laserRange mid, salt 0 (the largest contested lever).

Phase B (next three attended hours):
- S05 laserRange mid, salt 1. Two against two: mid - far of +0.4 or more, mid leads; -0.4 or less, far;
  between, salt 2 of each, then |d| of 0.3 decides, otherwise far (doctrine, top bot).
- S06 base + beamClue on, salt 0. Identical to S01: on in every later build. Different: off for good.
- S07-S09 one preset each on the leader: farmHp 50, healExit 90, strafe fast (last: lost 0.7
  once). Adopt only at +0.6 against the leader's mean, or +0.4 after one more salt each. idlePull stays off
  (safer in the final), untested.
- Any SQUAD code change after S01 makes a new base: repeat S01 and S02 for it before more presets.

Phase C (code freeze Sun 04:00 UTC; candidate scored by 10:00 UTC, earlier wins ties):
- C1 = frozen code + adopted presets + free-for-all features, salt 0. Where it differs from a scored twin
  (same presets and salt) only in free-for-all parts, it must reproduce the twin's score exactly; if not,
  drop the leaking part (beamClue first) and use the twin.
- Gate at C1 (section 5). Margin 1.0 or more: lock now. 0.5-1.0: no slots until 13:00. Under 0.5: salts 1-7
  (C2-C8) as needed; best score wins, earliest on ties; then fall back (section 5).

Phase D (lock, Sunday UTC):
- 13:00-15:00: salts of the chosen build only, if its margin fell under 0.5.
- 15:00: evaluate the gate; pick the entry explicitly on the track page.
- 15:15: last submission, only a fix for a crash or rejection of the chosen build; then pick again.
- 15:30: verify: chosen entry shown, repository public, hash present, logged-out download of
  https://github.com/Hrudayangam-Mehta/kranti-hackathon/archive/HASH.tar.gz works.
- After 16:00: nothing is pushed.

## 4. Owner checklist (every submission)
I first change one SELECT string or the salt, run tools/package.sh (conformance PASS, hygiene grep empty),
write the log row, push when you say "ready", and confirm the hash on GitHub. I hand over: slot id, the URL
https://github.com/Hrudayangam-Mehta/kranti-hackathon, the 40-character hash, the one change.
You:
1. Check the form: a slot is free and no entry of ours is waiting.
2. Paste the URL and the 40-character hash (always the hash: it pins the commit). Nothing else. Submit.
3. Wait for "scored" or "rejected" (p50 1.5 min, p95 4 min); submit nothing else meanwhile.
4. Report back: UTC time, status (reason word for word if rejected), score (two decimals), run time, our rank,
   the board's 1st / 16th / 32nd / 33rd scores, which entry is marked chosen, when the next slot frees up. A
   screenshot is enough.
Never submit a hash I did not hand over; never leave a probe (env squad) as the chosen entry.

## 5. Gate for the final entry
Margin = our score - L32 now.
- G1 qualifies: margin > max(0.30, 3 x L32's hourly rise over the last 3 h). Strictly greater: a tie loses
  to the earlier team.
- G2 free-for-all ready: env auto, ffaPair on, beamClue per S06, idlePull off, determinism shown.
- G3 safest: among G1 + G2 builds, the best local free-for-all league (300+ matches per pool: one seat among
  15 base copies, house stand-ins, mixed roster bots), never worse than base by 1 SE in any pool. Practice
  score does not rank builds that pass G1; salts of one build are equally safe.
- G4 equal: the earliest submitted.
- Nothing passes G1 + G2: highest-scoring G1 build with env auto. Nothing passes G1: our best score.

## 6. When to stop publishing
Every pushed commit stays public and hands rivals a copy plus a diff naming our knobs. Push only what is
submitted, in the same minute; never force-push or delete; resubmitting a public hash publishes nothing new.
Stop new commits at the first of:
- a G1 + G2 build with margin 1.0 or more; after it only up to two free-for-all-only improvements (local
  league +0.3 places, over 2 SE), each reproducing the locked score exactly;
- Sun 10:00 UTC, for anything but a salt of the candidate or a fix;
- a sign of copying (a new team at exactly our score soon after a push, unusual forks): lock the best
  qualifying G2 build;
- Sun 15:15 UTC.

Log: notes/submissions.md.
