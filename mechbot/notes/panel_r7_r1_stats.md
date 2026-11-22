# Panel R7, round 1: statistician, experiment designer and reward economist (lens `stats`)

Written Sat 21 Nov, 21:35-22:15 UTC. Read only outside my folders. Inputs: panel_r7_brief.md, kit/README.md,
kit/protocol.md, rules_audit.md, submissions.md, submission_plan.md, panel_r4_schedule.md, panel_r6_rewards.md,
build_spec_r5.md, build_spec_r6.md, owner_requests_r6.md, measured_deltas.md (noise rows), bot/lib/params.js, and the V4
simulator ledger tools/panel_r6/d_v4.json (behaviour statistics only). No simulator run, no git, no server.

Tools (all standard library, `python3 -I`, in tools/panel_r7/stats/):
- `draws.csv`: the 14 official draws, coded as differences against V4. Append one row per new result.
- `fit.py`: hierarchical fit, averaged over sigma and tau. Output: `fit_out.txt`.
- `alloc.py`: expected maxima, P(clear the cut) and a policy simulation. Output: `alloc_out.txt`.
- `rewards_r7.py`: reward chain from the ledger. Output: `rewards_r7_out.txt`.

Tags: [M] official, [T] top bot, [S] simulator, [A] arithmetic/model, [N] no evidence, [R] rule text.

## 0. Headlines

1. **Every official reading so far is noise.** [M, A]
   - The 14 draws have sd 0.165 around 4.92.
   - That spread is what one build with per-draw sd 0.17 would produce (homogeneity chi2 12.2 on 13 df, p = 0.51).
   - The fitted spread of true preset effects is tau = 0.04 (median; 80% range 0.005-0.14).
   - No item is distinguishable from zero.
   - V4's true mean is **4.93 +- 0.06**. Its 5.15 was a +1.3 sd draw.
2. **Per-draw sd is 0.17 (80% range 0.13-0.21), not 0.24.** [M, A] The 0.24 comes from V4's three salts alone
   (2 degrees of freedom). The other 11 draws and seven external re-roll pairs pull it to 0.17.
3. **Salts of the V4 family cannot qualify.** [A] With 96 more draws, P(best > 5.6) = 0.03 and P(> 5.8) = 0.00.
   - Exploring new arms (R5 screening rules, adopted arms stacked) gives:
     - 0.28 / 0.07 at cuts 5.6 / 5.8 if arms are worth zero on average;
     - 0.62 / 0.31 if each arm is worth +0.02 on average (section 3.2).
   - **New arms on the best stack beat leader salts for every slot until the 09:00 freeze.** Salts are only fillers
     until then.
4. **Reward-table corrections.**
   - The time price in panel_r6_rewards is about 5x too high. Fighting early shrinks from +0.38 to +0.03..+0.06, so
     lambda_t is about 0.002 pt/s, not 0.014.
   - Its "kills bring more hunters" curve is a counting artefact. Among fights where someone shoots us, P(2+
     attackers) is flat at about 0.62.
   - What decides an action is points per hp risked and P(death), not points per second (section 2).
5. **Final entry: rules.** [R] We may nominate any of our own submissions, and it keeps its own practice score. The
   final rebuilds that exact commit: code cannot change, only the same code's in-game behaviour. Repeated salts and
   ports are allowed. Seed fingerprinting is not (section 4).

## 1. What the 14 official draws say (fit.py, `fit_out.txt`)

**Model:** score = mu_V4 + sum of item effects + noise.
- Effects get a common prior N(0, tau^2).
- sigma and tau are averaged over a grid weighted by the marginal likelihood (Bayesian model averaging).
- External re-roll pairs (D04-D08 and the R4 list) enter as extra evidence on sigma. Without them sigma is 0.18;
  nothing else changes.

| Item (against V4) | Raw reading | Posterior (BMA) | Fixed sigma 0.17 / tau 0.10 | Verdict |
|---|---|---|---|---|
| fight early off (V2) | -0.38 (one pair) | -0.03 +- 0.07 | -0.06 +- 0.08 | noise; keep on ([T] support) |
| pulse retreat instead of d3 (V1) | -0.17 (one pair) | -0.03 +- 0.06 | -0.06 +- 0.08 | noise; d3 stays |
| boost off (V3) | -0.15 | -0.00 +- 0.06 | -0.01 +- 0.08 | noise |
| laserEcon off + far range | in K0 / F-cells | +0.02 +- 0.07 | +0.03 +- 0.09 | noise |
| focus mult | | +0.01 +- 0.06 | +0.02 +- 0.08 | noise |
| farmHp 90 | | +0.01 +- 0.06 | +0.02 +- 0.09 | noise |
| upg std | | +0.00 +- 0.06 | +0.01 +- 0.08 | noise |
| hunt h50 (H) | -0.17 against 5.15 | +0.01 +- 0.06 | +0.01 +- 0.09 | noise |
| hunt lite (HL) | -0.42 against 5.15 | -0.03 +- 0.07 | -0.05 +- 0.09 | noise, leaning down |
| seek on (S) | -0.02 against 5.15 | +0.03 +- 0.07 | +0.05 +- 0.09 | noise, leaning up |

**Build means:**

| Build | Mean +- sd | P(best of 9) |
|---|---|---|
| V4 | 4.93 +- 0.06 | 0.02 |
| S | 4.96 +- 0.09 | |
| K0 | 4.97 +- 0.09 | |
| KS (pending) | 5.00 +- 0.12 | 0.36 |
| H | 4.94 | |
| HL | 4.90 | |
| V1 | 4.90 | |
| V2 | 4.86 | |

KS ranks first on P(best) only because it adds five uncertain effects, which gives it the widest spread. Its mean is
not shown to be higher.

**What follows:**
- (a) Never compare an arm with 5.15 (the selected maximum) or with 4.97 (V4's mean, inflated by selection). Use the
  posterior base mean (4.93 now; rerun fit.py after every report).
- (b) A tested preset of the kind we build has a true effect of about +-0.05. A +0.5 gap will not come from one item.
  - Stacking many items might close it.
  - So might a structural change the gameplay experts must name.
- (c) The 21:25 batch (KS s0-s2, S s1/s2, K0 s1) is the first data that can rank S, K0 and KS. Refit before
  choosing the base:

  ```
  python3 -I fit.py draws.csv --builds=KS:Aoff+Boff+Coff+Foff+seek
  ```

  Rows are coded as in draws.csv: KS = Aoff, Boff, Coff, Foff, seek.

## 2. The reward table, rebuilt in placement points

The anchors and their corrections:
- Level 4.93 [M fit].
- Points flow while alive at 0.068 pt/s on average [S x 1.15 to the official level].
- Escalation chain (`rewards_r7.py`, V4 ledger, 96 fights):
  - one attacker: 0.75 kills, P(death) 0.06;
  - 2+ attackers: 2.12 kills, P(death) 0.63;
  - P(2+ | kills 0/1/2/3+) = 0.57 / 0.65 / 0.64 / 0.65.

| Outcome or action | Value (pt) | Ratio | Evidence |
|---|---|---|---|
| **1st kill** of a house bot (~12-30 s) | **+0.90 net** (+1 banked, -0.10 earlier escalation); +0.14 kill drop (2 cubes x 0.7 x 0.10); + victim's weapon | about +1.05 in all | [S] chain, [A] |
| **2nd-6th kill** | +0.97..+1.00 net, + drop 0.06-0.14 | | [S] |
| **Late kill** (cubes >= 10, or > 80 s) | +1.00; drop about +0.01 | | [S] |
| **Early vs late kill** | Equal within 0.1. An early kill's drop is worth more; its escalation costs more | | [S, A] |
| **Survival second** (death one second later) | 0-20 s 0.03; 20-40 s 0.06; 40-110 s **0.09-0.10** | survival is worth 3x more late | [S] scaled |
| **Time spent** while alive (lambda_t), contested | **0.002 pt/s** (0..0.008); was 0.014 | | [M] P1 shrunk |
| **Time spent**, free (nothing in view) | 0.003 pt/s | | [A] R6 |
| **Damage taken**, 1 hp, average | 0.002 pt | | [S], R6 |
| **Damage taken**, 1 hp, one attacker / 2+ fight | 0.0005 / 0.004 | | [S] |
| 100 hp taken in a 2+ fight | -0.4 | | [S] |
| **Cube** 1-5 / 6-9 / 10+ | +0.10 / +0.06 / +0.01 | upper bound 0.25 | [M other teams] via R6 |
| **Upgrade** (e.g. armor -8%: +8.7% effective hp) | +0.10 (0.05-0.25) | | [A]; the raw model overstates by about 2.5x, as for cubes |
| **Upgrade order** (speed 3rd vs std) | 0.00 +- 0.06 | | [M] Foff |
| **Crate** at 40 m, gun-only (cube + 50% weapon, 1/3 laser) | +0.18; time cost 8 s x 0.002 = 0.02 | about 0.02 pt/s | [A] |
| Farm floor 90% vs 50% | +0.01 +- 0.06 | | [M] Coff |
| **Laser pickup**, gun-only, t < 60 s | +0.5 (0.2-1.0) | 0.14 pt/s on a 7 s detour | [A, T x3]; LG is the first real test |
| Heal second after the 5 s delay | +0.09 (45 hp x 0.002) | | [A] |
| The 5 s regen delay | -0.01 (was -0.07) | | [A] |
| Second outside the zone at 20 dps | -0.04, and -0.13 if it stops a heal | | [A] |

**Action-to-reward ratios.** Every action family in R6 section 2.2 earns 0.02-0.72 pt/s, so all of them clear the
corrected time price of 0.002-0.003 pt/s. Time almost never decides. Rank instead by
**points per 100 hp of expected intake, and P(death) x V_fut**:

| Action | pt per 100 hp |
|---|---|
| Finish under 25% | 2.7 |
| Lone hunter, us with gun + laser | 0.18-0.83 (40 m to 150 m) |
| Lone hunter, gun vs gun | 0.12-0.21 |
| Gun vs a laser hunter | 0.03-0.06 |
| Kill-drop cubes | 0.95 |
| Cube in contact | 0.70 |

So the laser and finishing dominate, and "gun vs a laser hunter" is the trap. This agrees with R6's ranking.

**Dynamic risk factor (owner's request 6):** take risk when hp is cheap and survival seconds are cheap.
- Early (< 40 s, 1 attacker): hp costs 0.0005 pt and a survival second 0.03-0.06 pt. Detour for crates, the laser
  and cubes; push lone hunters.
- Late (> 40 s), or in 2+ fights: hp costs 0.004 and a survival second 0.1. Fight only for kills and finishes; heal
  between fights.
- Formula: r = clamp(1 - (t - 20) / 60, 0, 1) x (1 if one attacker, 0.3 if 2+). Scale the detour radius and the
  engage gate by r.
- [A]; it needs its own draw, and its default off must equal V4.

**Checks of panel_r6_rewards.md against the official results:**

| Row of R6 | Status | Details |
|---|---|---|
| "Our level 4.97" | wrong | 4.93: V4 was chosen because its first draw was the maximum |
| lambda_t contested 0.014 | 5-7x too high | It rests on a single pair (V1 - V2). Rows that go negative only through the time term flip to about 0: "regen delay -0.07", "idle at full hp -0.08 per 10 s" (official seek effect +0.03, agrees), "crate at 150 m -0.06" |
| "Heal breaks 0.00 +- 0.28" | updated | d3 over pulse: +0.03..+0.06 +- 0.06-0.08. Still noise |
| healPm = 0.34 / 0.55 / 0.64 / 0.88 | artefact | It counts the one-sided opening kill (nobody shooting us) as a fight. The real curve is flat at about 0.62. Use 0.62 in the `heal: need` H\* and in V_fut |
| Seek, laser and finish rows | not contradicted | No draw tests them yet |

## 3. Allocating the ~105 slots (alloc.py, `alloc_out.txt`)

### 3.1 Best of n draws

Expected maximum above the build mean:

| n | sigma 0.17 | sigma 0.24 |
|---|---|---|
| 4 | +0.17 | +0.25 |
| 12 | +0.28 | +0.39 |
| 24 | +0.33 | +0.47 |
| 48 | +0.38 | +0.54 |
| 100 | +0.43 | +0.60 |

Each doubling of n adds only about +0.05.

P(at least one of n draws is strictly above the cut), on the 1/48 grid. Each cell is n = 24 / 48 / 96, with sigma
taken from the fit's posterior:

| True mean | Cut 5.4 | Cut 5.6 | Cut 5.8 |
|---|---|---|---|
| 4.93 (V4) | 0.10 / 0.18 / 0.28 | 0.01 / 0.02 / 0.03 | 0 / 0 / 0 |
| 5.10 | 0.53 / 0.73 / 0.88 | 0.08 / 0.15 / 0.23 | 0.01 / 0.01 / 0.02 |
| 5.20 | 0.90 / 0.98 / 1.00 | 0.25 / 0.39 / 0.55 | 0.02 / 0.04 / 0.07 |
| 5.30 | 1.00 | 0.58 / 0.78 / 0.91 | 0.07 / 0.13 / 0.22 |
| 5.40 | 1.00 | 0.93 / 0.99 / 1.00 | 0.23 / 0.36 / 0.51 |
| 5.50 | 1.00 | 1.00 | 0.55 / 0.74 / 0.89 |

**The cut.** [M]
- History of the 32nd place: 4.96 (07:51), 5.33 (16:37), about 5.40 (21:26). The rise slowed from 0.042 to about
  0.015 per hour.
- A saturating fit gives about 5.5 at the close.
- More salt drawing by everyone (6 per hour) and the Sunday rush argue for 5.6-5.8.
- **Plan for 5.6; re-read the board every 3 h.** The mean we need is about 5.3 for 5.6 and about 5.5 for 5.8. Both
  are +0.4 to +0.6 above V4.

### 3.2 Leader salts versus new arms (policy simulation)

Setup:
- 99 slots after the 21:25 batch, with 2 kept for ports.
- 18 arms arrive in the engineer's stages: R5a from slot 2, R5b from slot 6, R6a from slot 15, R6b/R5c in slots
  20-36. No new arms after the 09:00 freeze.
- Effects add when stacked.
- sigma is drawn from the posterior.
- Base mean N(4.93, 0.06).

P(best draw > 5.4 / 5.6 / 5.8):

| Arm prior delta | Salts only | R5 rules (1 draw; 2nd if d >= 0; adopt at 2-draw mean d >= 0) | Stack all (adopt unless d <= -0.25) |
|---|---|---|---|
| N(0, 0.06) (the fit's tau) | 0.32 / 0.05 / 0.00 | **0.66 / 0.28 / 0.07** | 0.54 / 0.23 / 0.06 |
| N(+0.02, 0.06) (panel gains halved) | 0.32 / 0.05 / 0.00 | 0.88 / 0.62 / 0.31 | 0.90 / 0.67 / 0.36 |
| N(+0.05, 0.10) (panel gains as stated) | 0.32 / 0.05 / 0.00 | 0.99 / 0.96 / 0.87 | 0.99 / 0.95 / 0.87 |
| N(-0.02, 0.06) | 0.32 / 0.05 / 0.00 | 0.43 / 0.09 / 0.01 | 0.23 / 0.04 / 0.00 |

These are upper bounds: they assume every slot is used and that effects add.

**Rule.**
- Until the 09:00 SQUAD freeze, every slot goes to a new arm on the current stack, or to an arm's second draw.
- A leader or stack salt fills a slot only when nothing is ready.
- Keep R5's screen (reject on a first draw of d <= -0.25; second draw at d >= 0; adopt at a 2-draw mean d >= 0, or
  >= +0.05 for type B). It is the robust choice: it never loses to "stack all" by more than 0.05, and it wins by 0.2
  when arms are harmful.
- "Parked" arms (-0.25 < d < 0) are dropped; slots are too scarce.
- After 09:00: about 35 slots of stack salts, all on the final code from 12:30 (section 4).
- Ride-alongs (IO-A, RB) never get a solo draw; they enter the stack directly. +0.02 cannot be seen at sd 0.17.

**Switching the leader (= the base new arms are drawn on).**
- The base is the stack of all adopted arms. d is always the arm's mean minus the base's posterior mean from fit.py.
  Never use the raw base mean or the board maximum.
- **Revert** a new stack if its first 4 draws average d <= -0.10 against the previous base. This catches interactions.
- From 11:00 the end-game salts go to the build with the highest posterior mean among stacks with >= 4 draws.
  - Ties go to the stack with fewer type-B changes.
  - The leader is not switched for a single high draw. Every draw stays portable anyway.

### 3.3 Paired salts

With the same salt, two builds play identically in a match until the changed preset first acts.
- **Rarely acting presets** (ZE zone escape, HF's entry rule, ESC): pairing them with an existing draw of the base at
  the same salt measures the difference with sd about 0.17 x sqrt(2 x phi), where phi is the share of matches that
  diverge (sim: 15/40 for heal entry 99%, 1/40 for exit-only). That is 0.05-0.15 instead of 0.24. Use it for the
  owner's harm screens (ZE, HF).
- **Early-acting presets** (K0 items, FIN, ISO, LG): every match diverges early, so pairing gains nothing. For those,
  and for every lottery draw, use a **fresh salt**.
  - A paired draw of a rarely acting preset is about 80% a copy of the base draw, so it adds little to the maximum.
  - An identical (build, salt) pair repeats exactly. It ties our own earlier entry and loses the tie.
- **Salt ledger:** salt = a running counter unique to the whole campaign (next free: 3). A pair reuses a salt only
  deliberately and is labelled "pair".
- **Ask:** the engineer's checker reports phi per new preset (same-salt sim pairs on seeds 1-40, share of matches
  that diverge). That is a behaviour statistic the simulator can be trusted with.

### 3.4 Slot plan, 22:25-01:25 UTC

The 21:25 batch filled the rolling hour, so windows open at about 22:25 / 23:25 / 00:25 with 6 slots each.
- Base B = the refit's best of V4, S, K0, KS. Default S: type S, +0.03 posterior. K0 or KS need +0.05 more, because
  their items are type B.
- Every draw from W1 on is packaged on the newest code with io and RB at their old values. IO-A `io: 'all'` joins
  the stack once W1's P0 shows exact identity.

| Window | Slot | Build (salt) | Purpose | Fallback if the stage is not gated |
|---|---|---|---|---|
| W1 22:25 | 1 | **P0**: V4 SELECT, salt 0, on the newest code (RB2-RB6, io 'v4', new presets off) | must equal 5.15 exactly: proves that every old draw is portable | on C4+RB1 |
| | 2 | FIN on B (s3) | new arm | B s3 |
| | 3 | ISO on B (s4) | new arm | B s4 |
| | 4 | LC on B (s5) | new arm | best pending arm, 2nd draw, new salt |
| | 5 | ESC on B (s6) | new arm | B s6 |
| | 6 | 2nd draw of the best W1 arm with d >= 0 (s7) | screen | B s7 |
| W2 23:25 | 1-2 | AVO on B (s8), LG on B (s9) | new arms (R5b) | 2nd draws of W1 arms by d |
| | 3-4 | 2nd draws of W1 arms with d >= 0 (s10, s11) | adopt or reject | B salts |
| | 5 | **STACK1** = B + arms adopted so far + io 'all' (s12) | first stack draw | B s12 |
| | 6 | STACK1 (s13) | stack mean | an arm's 2nd draw |
| W3 00:25 | 1-2 | 2nd draws of AVO / LG if d >= 0 (s14, s15) | adopt or reject | STACK1 salts |
| | 3 | STACK2 = STACK1 + the W2 adoptions (s16) | re-stack | STACK1 s16 |
| | 4 | **HF** `heal: 'full'` on STACK1, **paired** with STACK1 s12 | owner's item, precise harm screen | STACK1 s17 |
| | 5 | **ZE** `zoneEsc: 'edge'` on STACK1, **paired** with STACK1 s13 | owner's item; acts in about 5% of matches | STACK salt |
| | 6 | STACK2 (s17) | stack mean | |

After 01:25: the R5/R6 order goes on (HN, PRE/PR2, HAND, KD, GASP, SYNC, ARC, UT, risk factor), each 1 draw plus a
second at d >= 0 on the newest stack. The stack is refit after every window.

## 4. Final entry and what the rules allow

**Q1. May the nominated entry be a different commit from our best-scoring one? Yes.** [R]
- "Pick the submission you want in the final before the cutoff. If you leave it unpicked, your best-scoring entry
  goes through."
- "your chosen submission (your best unless you pick another) locks with its practice score."
- The top-32 test uses the chosen entry's own score (rules_audit A10; confirm in the pick dialog).
- Ties: "earlier submissions break all ties". A port has the same score but a later time, so it loses ties the
  original would win. Nominate a port only if it is at least 1/48 above the cut.

**Q2. May a build's code differ between practice and final? No for code, yes for in-game behaviour.** [R]
- The chosen commit is what is rebuilt: "pin versions because finalists are rebuilt"; "an entry that cannot be
  fetched or built for the final scores nothing"; every submitted commit must stay public.
- Nothing can be swapped in after the cutoff.
- Allowed: the same code adapting to the game it observes.
  - SQUAD/FFA posture from observations: deaths we did not cause, beams or bullets between other mechs (L22).
  - Reading `hello.config` and `hello.map.files` ("config is the complete rule set ... balance changes between
    matches").
- Not allowed in spirit, and declined (rules_audit 4.5): recognising the 48 practice seeds (slot, spawn, first
  `next_center`) or keying anything on practice-specific fingerprints. It contradicts "Your bot never sees the seed",
  is worthless on new seeds, and "top entries are compared, and you may be asked to explain yours".

**Q3. Repeated salt draws.** [R, A]

Allowed:
- Any number of draws within the hourly limit (6 per rolling hour per the brief; one entry queued at a time;
  rejected entries count).
- A salt is a legitimate behaviour change: the RNG is seeded with hello.seed and the salt, and "seed your RNG with
  it" is the protocol's own advice.
- Only the best counts, by the board's own rule.
- A **port** (the same presets and salt on newer FFA-only code) is allowed. It is a new submission whose practice
  play is identical, so it earns the same score honestly on the same 48 seeds.

Not allowed:
- Seed fingerprinting (Q2).
- Submitting by program: there is no documented interface; the signed-in owner submits.
- Another team's code, commit or archive: "the later one" is disqualified.
- Bots connected to the browser game server (A20).
- Deleting, force-pushing or rewriting a submitted commit.

Pointless:
- Resubmitting an identical hash: same score, later time, loses the tie.
- The same salt on an FFA-only change, except as a declared port or identity check.

**Nomination rule (at 15:20-15:40 Sun, after the last score):**
1. **Eligible:** entries on the final FFA code, meaning Port-F and every salt drawn on it after the 12:30 freeze.
   Under the firewall, their FFA play is identical apart from their type-B values.
2. **Clear the cut:** score > (32nd at 15:20) + max(1/48, the 32nd's rise over the last 2 h).
3. **Pick:**
   - Among eligible entries that clear the cut, the one with the best FFA evidence: final FFA code, and type-B
     values ranked by the local FFA league.
   - Equal: the earliest.
   - If no eligible entry clears: the highest-scoring entry that does (older FFA code).
   - If none does: our best.
   - Never a diagnostic entry (env squad, identity probes).
4. **Ask (engineer):** split every type-B item into separate SQUAD and FFA values (`laserRangeFfa` exists; add
   laserEcon, focus, farmHp, upg). Then the practice-best values never set the final's play. From 12:30, draw all
   end-game salts on the final code, so each draw is directly eligible and needs no port.
5. **Port-F** in the first 12:44 slot: the best draw's presets and salt on the final code. It must reproduce the
   score exactly. A second port only if a better non-final draw appears later.

## 5. Vetoes and refinements

- **Veto: end-game salts of the V4 family alone.** P(> 5.6) is 0.03 even with 96 draws.
- **Veto: solo draws of ride-alongs** (IO-A, RB, IO6/9/10/11). They are invisible at sd 0.17; they go into the stack.
- **Veto: reading single-pair differences as effects** in any spec (lambda_t from V1 - V2, "heal breaks +0.17",
  "K0 +0.40"). The shrunk values are about one sixth of the raw ones.
- **Refine R5's bar:** d against fit.py's posterior base mean (4.93 now), not 4.97 or 5.15. Drop parked arms.
- **Refine R6 HN/UT:** use healPm flat 0.62, and lambda_t 0.002 contested / 0.003 free.
- **Add:** 1 identity slot (P0) now. Without it the final port has no tested basis.

## Summary for the moderator

- **Fit [M, A]:** the 14 draws fit one build (sd 0.165, homogeneity p = 0.51). Per-draw sigma 0.17 (0.13-0.21); every
  item effect within +-0.06 (tau about 0.04). V4's true mean 4.93 +- 0.06; its 5.15 was luck. Refit with
  tools/panel_r7/stats/fit.py when KS / S / K0 arrive.
- **Qualifying [A]:** V4 salts alone give P(> 5.6) = 0.03 and P(> 5.8) = 0 over 96 draws. We need a true mean of
  about 5.3 (cut 5.6) or 5.5 (cut 5.8).
- **Top proposals, ranked:**
  1. Until 09:00, every slot is a new arm on the current stack or an arm's 2nd draw; salts only as fillers. Keep
     R5's screen, measured against the posterior base mean; drop parked arms. Simulated P(> 5.6): 0.28 (zero-mean
     arms) / 0.62 (+0.02 arms), against 0.05 for salts.
  2. First W1 slot is a P0 identity check: V4 s0 on the newest code must score exactly 5.15. It protects the port.
  3. Fresh salts (one campaign counter) for every lottery draw. Same-salt pairs only for rarely acting owner items
     (HF, ZE): a harm screen at sd 0.05-0.15.
  4. W1-W3 (22:25 / 23:25 / 00:25): P0, FIN, ISO, LC, ESC, 2nd draw | AVO, LG, two 2nd draws, STACK1 x2 |
     two 2nd draws, STACK2, HF pair, ZE pair, STACK2 (fallbacks in section 3.4).
  5. Reward table in placement points (section 2): a kill is +0.9..+1.0 early or late; a survival second is
     0.03 / 0.06 / 0.10 pt at 0-20 / 20-40 / 40-110 s; hp costs 0.0005 / 0.004 pt (one attacker / 2+ fight).
     lambda_t is 0.002, not 0.014, so rank actions by points per hp risked; the risk factor follows.
- **Final entry [R]:** we may nominate any of our commits; its own score must clear the cut. The rebuilt commit
  cannot change, only its in-game posture. Salts and ports are allowed; seed fingerprinting is not. Nominate the
  final-code entry with the best FFA evidence among those at least 1/48 above the cut; earliest on ties.
- **Vetoes:** V4-only salt mining; solo draws of ride-alongs; single-pair readings used as effects (R6 lambda_t,
  healPm 0.34-0.88).
- **Questions:** Gameplay: what structural change is worth +0.4 or more? Engineer: separate FFA values for the
  type-B items; a phi (same-salt divergence share) report per preset; proof that RB2-RB6 are practice-identical.
  Board watcher: the 32nd every 3 h.
