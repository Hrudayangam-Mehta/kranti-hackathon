# Adaptive Mech review — Round 1: public competitor and reward audit

**Checked 22 November 2026, approximately 09:02 UTC.** This round is read-only source and rules research. No game server, private competitor surface, simulator ranking, production edit, build, or submission was used.

## Decision

Use the scored capture entry as the next experimental parent. The owner's new results are pressure **4.74** at `69ed1814707634fb4b5e5953082f3d67ac9e52f8` and burst **4.67** at `26f382eab378e1193ab9203bb4ec7e706c6780bf`, versus capture **5.47** at `099e7e392a863346575d7ef45bb9af3432544329`. These are owner-reported aggregate receipts, not independently accessed signed-in results. The observed differences are −0.73 and −0.80 placement points. Different fresh seeds and absent per-match records prevent attributing those differences to a particular component.

The public Ahmad Suliman project is now attributable. Its current head is **not proven to be the 6.74 submission**. The most useful lesson is that growth, fight, recovery and positioning remain conditional choices. A permanent combat latch is an unnecessarily strong assumption. Three small proposals are below; none requires importing the competitor implementation or adding another decision wrapper.

## Attribution, exact pins and limits

| Claim | Evidence and confidence |
|---|---|
| Official rank 1 is Ahmad Suliman at 6.74 | The directly opened [track](https://www.joinbuilders.org/buildathon/tracks/builders) and [leaderboard](https://www.joinbuilders.org/buildathon/leaderboard), refs `turn338136496view0` and `turn338136496view1`. Rank labels, rather than alphabetical display order, were read. |
| A public GitHub account named Ahmad Suliman is `ahmad-ovh` | [Public profile](https://github.com/ahmad-ovh/), ref `turn338136496search0`, plus its linked profile repository. Name alone would be insufficient to tie an entry to the leaderboard. |
| The account's Buildathon repository identifies its own team as Ahmad Suliman | [Pinned STATE document](https://github.com/ahmad-ovh/Buildathon/blob/f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675/docs/STATE.md) explicitly identifies that team and claims the earlier 6.28 result. This is direct self-attribution, corroborating the profile and track. |
| Public head inspected | [`f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675`](https://github.com/ahmad-ovh/Buildathon/commit/f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675), commit time 06:57:57 UTC. The only returned branch was `main`. |
| Documented Apex-Go v3 checkpoint | [`56e0f76be02a4b85bae99d71a209f1958173b244`](https://github.com/ahmad-ovh/Buildathon/commit/56e0f76be02a4b85bae99d71a209f1958173b244), 06:46:59 UTC; the later head is 15 commits ahead. |
| Earlier self-reported scored checkpoint | [`a484109a70db447abd390ffe871c32026cd15d7e`](https://github.com/ahmad-ovh/Buildathon/commit/a484109a70db447abd390ffe871c32026cd15d7e), called Apex-Go v2 in the team's notes, which report 6.27 then 6.28 after rescore. That history is their claim, not a newly authenticated scoring receipt. |
| Exact commit earning 6.74 | **Unresolved.** The official public page exposes no submission link. Scoped code search for 6.74 returned no results; the returned 52-commit history, branch list, STATE and EXPERIMENTS documents did not establish the mapping. |
| License and active language | [MIT license](https://github.com/ahmad-ovh/Buildathon/blob/f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675/LICENSE). [Dockerfile](https://github.com/ahmad-ovh/Buildathon/blob/f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675/Dockerfile) builds a static **Go** executable from `cmd/mechbot` and `internal`. The Python README is a stale description of the executable. |

The broad name lookup also found another similarly named account with unrelated projects; it was not treated as the entrant. No personal contact details were retained. GitHub's public web renderer returned an accessibility error for repository pages; the GitHub connector returned the public repository resources successfully. No permission-denied surface was bypassed and no owner's uploaded token was used for this research.

The official top-five snapshot was Ahmad Suliman 6.74, rogue_agi 6.39, tigerbyte 6.36, not even close 6.21 and immortal-lucy 6.21. The board can change, and this round did not establish exact submission revisions for the other four.

## What the reward and rules actually favor

The official practice metric is mean `16 − place`; it is not a damage reward. The 15 house opponents cooperate, share vision, and escalate from one early hunter to more hunters as opponents are removed, then all hunters late. The exact escalation thresholds and private house policy are not published. Finals instead use team-bot free-for-alls. The event lists a $5,000 Mech prize; the separate $100 content-video announcement does not alter gameplay scoring. [Track](https://www.joinbuilders.org/buildathon/tracks/builders); [announcements](https://www.joinbuilders.org/buildathon/leaderboard).

Builders-4 uses 96 fresh private seeds and retains the first result for identical code. Tiny commit/salt changes are not a justified way to estimate a paired effect. The 48-match statement still in the protocol is stale against the newer track and announcement.

Relevant current [protocol](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1) facts:

- Dealing **or** taking damage resets health regeneration; stopping incoming damage alone does not start healing while we keep farming.
- Supply capture needs sole occupancy, and gives repair, energy and cubes. A visible contest freezes progress.
- Cubes improve capped combat stats but continue growing the body after that cap; an upgrade threshold can still create value beyond it.
- Carried upgrades persist when a weapon is dropped. Equip delay and a charging-slot lock constrain replacement.
- Future-zone feasibility matters throughout a trip. Actual aim, shared torso and independent triggers constrain weapon use.

Those contracts support conditional fighting and economic detours. They do not prove that passivity is superior: if nobody else dies, waiting alone produces no placement gains. Likewise, extra damage that fails to remove a mech has no direct score value. Timeout HP ranking is an additional reason to distinguish a short recovery opportunity from indefinite avoidance.

## What the attributable source does — and does not prove

The following is a clean-room structural reading, with no competitor implementation, weights, learned tables or constants imported into our code.

| Area | Source-grounded observation | Transferable contract |
|---|---|---|
| Fight admission and exit | [policy.go](https://github.com/ahmad-ovh/Buildathon/blob/56e0f76be02a4b85bae99d71a209f1958173b244/internal/bot/policy.go) totals engaged incoming pressure and compares it with the cost of finishing opponents. Its damaged state can end when the exchange improves; a near finish can remain eligible. | Combat eligibility should depend on the current exchange and feasible escape, with hysteresis, rather than a one-way equipment trigger. |
| Resource collection during combat | The same file can move toward nearby weapon upgrades or cube clusters while the torso continues fighting. It separately handles threatening drones that block recovery. | Legs can obtain a bounded resource advantage without silencing physically compatible fire. A kill should trigger fresh goal valuation. |
| Economy and zone | [strategy.go](https://github.com/ahmad-ovh/Buildathon/blob/56e0f76be02a4b85bae99d71a209f1958173b244/internal/bot/strategy.go) values resources against travel/handling time, reachability and future zone. Its drop branch considers health and existing cube growth. | Evaluate goal completion and return feasibility, not merely straight-line proximity. |
| Range | [plan.go](https://github.com/ahmad-ovh/Buildathon/blob/56e0f76be02a4b85bae99d71a209f1958173b244/internal/bot/plan.go) evaluates several possible engagement distances with movement exposure before returning a band. | The range sent to movement must be the range for which combat admission was evaluated. |
| Lobby and phase | [hide.go](https://github.com/ahmad-ovh/Buildathon/blob/56e0f76be02a4b85bae99d71a209f1958173b244/internal/bot/hide.go) distinguishes uncertain opening, inferred cooperative squad, FFA, late play and final duel using observations. | Alive count, time and observed interaction should change risk tolerance without treating a slot seed as a private match seed. |
| Weapon execution | [combat.go](https://github.com/ahmad-ovh/Buildathon/blob/56e0f76be02a4b85bae99d71a209f1958173b244/internal/bot/combat.go) uses one torso owner and separately admits compatible triggers, retaining a charged laser when a new fight is declined. | Tactical retreat or goal changes must not accidentally release a held beam. |

Their claimed local simulations and effect sizes were not reproduced. We do not currently have an authoritative reactive ranking simulator for this evaluator, so those source claims cannot validate our score predictions. Their assertions about exact local-to-official transfer, narrow score resolution, or a particular percentage hit rate are not independently established facts. Several documents retain old fixed-seed assumptions alongside newer updates.

### Adversarial findings in the public model

The [15-commit comparison](https://github.com/ahmad-ovh/Buildathon/compare/56e0f76be02a4b85bae99d71a209f1958173b244...f29e4d3b8316aefb42d4b5848bf1c0e60a7d2675) materially changes the documented v3 behavior:

1. Current range planning computes an advantage at one of its candidate distances, then discards the chosen distance and returns a fixed movement band. A decision can therefore be admitted under a different range than the bot follows.
2. Current defaults still enable named options whose behavior was removed: enemy beam cooldown use, a separate covered-reload path, beam-based FFA evidence, late cautious play and the practice rim preference. Setting those flags is not evidence that the advertised mechanism runs.
3. Current targeting was simplified to distance/visibility; lead iteration, vertical projection and head-clearance fallback were reduced. Fire tolerances were widened beyond the nominal target radius. Increased trigger volume is not demonstrated increased landed damage.
4. Current weapon values promote mortar and ignore the advertised laser/lightning preference parameters. The default upgrade table was also reversed toward utility upgrades. The documentation's older evaluation cannot be assigned to these choices.
5. The combat model estimates both sides partly from default weapon stats and empirical range factors. Enemy upgrade/cooldown knowledge remains incomplete. Its lightning suppression assumption does not independently prove that the desired enemy is the nearest legal arc recipient on that tick.

These are reasons to test precise mechanics, not allegations about the author's intent. Neither current head nor its earlier documentation should be treated as an oracle.

## Diagnosing our two failed aggressive candidates

The observations below come from our actual published source in `experiments/mech-pressure-cycle/bot/lib/pressure.js` and its `brain.js` integration. They identify possible failure mechanisms, not measured death causes.

| Concrete behavior | Why it can lose under the current reward |
|---|---|
| A secondary plus one upgrade, or an armed timeout, permanently enables pressure | That trigger says little about current HP, available charge/ammo, enemy concentration, next-zone travel, or whether a cheap repair is nearby. |
| `mode()` clears losing/disengagement flags and all loot/grab/farm goals on every active decision; the brain skips economic planning | The policy can stop converting early kills into resources and suppress capture's repair advantage. Nearby weapon scanning still works, so this is not a total pickup failure. |
| Only a nearly finished owned capture is retained | A high-value new repair opportunity is categorically absent even if it is closer and faster than the next favorable fight. |
| Target support is a small penalty based on allies near the target | It does not veto a fight whose multiple incoming lines are already lethal to us; distance to the target is not incoming damage at our position. |
| Fixed preferred ranges come mostly from our carried kinds | Holding lightning is not proof that the next arc is ready, affordable or lands on that enemy. Closing also exposes us to an enemy's short-range channel. |
| Short cooling movement is the only explicit combat recovery phase | A brief weapon recovery is different from health regeneration; repeated firing can keep HP recovery disabled. |
| No ordinary NPC combat target after commitment | A drone may continue draining health or blocking recovery while the policy seeks a mech instead. |
| A static post-commit upgrade order replaces the normal choice | The same offer can be valued identically near spawn and near match end, despite different remaining payoff time and current equipment. |

The shared macro is a plausible common contributor to both lower scores. That does **not** isolate weapon scheduling as good or bad: both candidates bundled several changes. Preserve the 5.47 parent and test smaller mechanisms.

## At most three next changes on capture

### 1. Make the existing finish decision depend on ready, feasible damage

Keep `prof.decideMode` as the single decision owner. Replace its sustained-DPS finishing shortcut with a short, explicitly bounded readiness check using observed ammo, reload, cooldown, charge, aim settlement and physical shot admission. Avoid recomputing another full target model. A real immediate finish may override recovery; an empty gun's average DPS may not.

**Required cases:** empty/reloading gun against a low-HP target; aligned ready gun; held laser during mode change; energy-starved lightning with a nearer blocker; equal target HP with one versus several actual incoming lines. A change in target, weapons, visible attackers or zone invalidates the old cue. This overlaps the Rust reviewer's independently identified defect.

### 2. Keep growth and repair conditional inside the existing goal priority

Use capture's current cube, grab and drop candidates. Re-evaluate their marginal value after a kill or equipment/HP change, and compare action time plus exposure with an actual near finish. A rough physical admission is `travel + handling + exit <= available zone time`; known contest must prevent a finite capture-completion promise. During a verified recovery window, farming damage is a cost because it restarts regeneration.

Do not install another planner or restore unconditional drop-first behavior: the Rust reviewer found that capture's drop/grab priority can itself outrank a needed survival response. Reuse existing path estimates and incoming-pressure fields, and make the choice reversible.

**Required cases:** one-step cube gain crossing an upgrade threshold; stat-cap cube without a threshold; full-health versus damaged bot at the same drop; visible contest; fast kill versus slow capture; low HP with a drone; an apparently nearby resource behind a long detour or expiring zone.

### 3. Use one contextual estimate for range and upgrade payoff

Reuse the existing weapon/controller state. Choose a feasible combat band from the channels that can contribute now, then evaluate the same band in fight admission. Recompute when range eligibility, energy or equipment changes; do not keep a stale advantage from an abandoned band. For the pending upgrade offer, compare live configured effects on the current pair and relevant remaining horizon, with the existing order as a stable fallback when data are missing.

This is deliberately narrower than rebuilding aiming, navigation or every policy function. Keep the current slot locks and no-thrash rules. No copied hit-rate tables, proposed probabilistic model or additional randomness is required.

**Required cases:** cooling versus ready secondary, mirrored weapon counters, a terrain-blocked short route, far versus near zone expiry, weapon absent/present, and a late upgrade whose extra energy capacity cannot be used before the next forced action. Evaluate claims with behavior cases first and official distinct-build receipts next.

## Research boundary and next handoff

The useful facts are now sufficient; further broad repository search is unnecessary. Source snapshots were held only in isolated `competitors/ahmad-ovh-Buildathon-*` directories for inspection. **They must not enter our release or evidence branches.** This report contains our analysis and source links only. No competitor source, comments, constants, empirical tables or identifiers were inserted into our implementation.

Evidence inventory: `adaptive-round1-competitors.sources.json`. Primary rules refs: `turn338136496view0`, `turn338136496view1`, `turn173788447view0`, `turn589710781view0`, `turn589710781view1`. The parent should open source pages before using web refs in its final response. The 6.74 source revision remains explicitly unresolved.

