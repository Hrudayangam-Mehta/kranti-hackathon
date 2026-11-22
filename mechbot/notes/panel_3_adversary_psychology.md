# Panel 3 — Adversary psychology / exploitation memo

**Thesis.** House bots measurably aim and decide with first-order rules (linear lead, frozen laser lines, empty-magazine reloads, nearest-target choice); student bots probably do too. Each leaks a timing window a 10 Hz bot can read from `obs` and turn into unanswered damage. Exploit only on per-enemy evidence with a safe default (Johanson et al.); randomise ourselves.

## Measured tells (official house-bot FFA replay; `P/tools/panel3/`)

Older balance (bullets 140 m/s, laser charge 0.65 s): ratios transfer; read times from `hello.config`.

- **Linear lead.** Hit rate ignores target lateral speed (0.94 at >6 m/s inside 50 m) but falls 0.79 → 0.67 → 0.32 as the target's velocity change during flight goes <2 → 2-6 → >6 m/s.
- **Laser.** 39/39 charges released at the nominal charge, aim frozen (0.00 deg drift) on the target's linear-predicted point. Hit 3/25 when the target changed velocity >=4 m/s, 5/11 otherwise.
- **Reload.** Never early: 72/72 empty magazines followed by the reload gap.
- **Target.** Nearest candidate 73% of shots, lowest HP% 54%.
- **Rear blindness.** 16/28 bots opened on from behind did not face the attacker within 5 s (6 died first); experts mostly within 0.7 s.
- **Pursuit, drops.** Brawlers re-closed after 9/11 engagements; drops fell to one lone bot 8-12 s after landing.

## A. House squad (practice)

**A1 (P0, both) Laser-tell dodge.** Trigger: visible mech with `charging:true`. Ray = its muzzle along its `aim`; `tau = charge_s - time since first seen charging`. Simulate our position at `tau` for lateral commands {keep, stop, reverse}; take the largest perpendicular distance, require >= R+1.5 m. If its yaw moves >0.5 deg between observations (tracking laser): hide cell reachable within `tau`, else zap it inside 45 m, else face it. *Fails if* current bots track (`charge_turn_mult` is now 1): the yaw test covers it.

**A2 (P0, both) Bullet-reactive stop-and-go plus seeded jink** (Robowiki). For each visible enemy bullet with closest approach in <1 s, compute miss distance under lateral commands {+1, 0, -1}; choose max-min. No bullet in flight: reversal intervals U(0.45, 1.1) s, 20% of events a 0.3 s stutter (zero command, then resume: 3.5 m behind the linear prediction). A reversal deviates 0.5*58.5*t^2, so beating a led bullet needs t >= 0.31 s, d >= 78 m; inside 60 m use cover, not jinks. Enemies whose first 4 bullets carry no lead get legs >=2 s instead. *Fails if* an aimer models acceleration: if >50% of 12 bullets hit beyond 90 m, use legs of U(1.2, 2.5) s.

**A3 (P0, both) Ammo and cooldown clocks gate exposure.** Per enemy: shots since the last >=2.2 s silence (back-project each bullet's velocity to a muzzle within 4 m; a `reload` sound resets). At count = mag (12; 20 once a 13th arrives without a gap) the gun is dead for `reload` s. After its laser beam: dead for cooldown + charge = 2.4 s. Leave cover on the tick the 12th bullet or the beam is seen; reload inside their ready window. *Fails if* two shooters make attribution ambiguous: assume ready.

**A4 (P1, both) 0.4 s peek.** Hide 1.2 m inside the LOS edge; command out for 2 ticks, then back: peak 2.3 m, exposed 0.4 s. A led bullet fired on sight lands after `0.10 + d/v_bullet`, so at d >= 76 m the peek draws no gun damage. Pre-aim through the wall (5 s memory gives the true position), hold a full laser charge (<=2 s), release on the first clear tick. One 0.3 s jiggle triggers a house laser's frozen shot; then use its 2.4 s dead window. *Fails if* half speed while holding makes the step too slow: gun-peek.

**A5 (P1, practice) Emergence-point ambush.** A hunter that loses sight still knows our true position for 5 s, so it paths to us. `E` = first point on `findPath(hunter -> us)` with `canSee(E, us)`. Stand 80-120 m from `E` with a hide cell <=3 m away; pre-aim `E`; start charging at ETA-0.75 s (ETA = path length / 9 m/s). *Fails if* it jets a roof: when its z rises >3 m, re-solve on the straight line.

**A6 (P1, both) Rear-arc opener on unaware mechs.** `aware` = its aim within 20 deg of the bearing to us for >=0.3 s, or it damaged us within 3 s. An unaware mech with us >90 deg off its aim takes x1.5: full laser (472), then gun. Practice: squad members not yet hunting qualify only when no hunter has LOS and H >= 0.8 H_max; abort when it turns. *Fails if* this recruits hunters early: flag it, compare 48-match means.

**A7 (P2, practice) Drone screen.** Regen >=55 m from live drones; flee along routes passing 50-60 m from a drone home so the pursuer enters its 45 m aggro (25 dps, regen blocked). *Fails if* it picks us.

## B. Student / LLM-written bots (final)

**B1 (P0, final) Finalists are selected for killing.** Practice rewards kills, so expect 32 duellists, and LLM coding agents are weak at strategic reasoning (CodeClash); in a free-for-all every death pays us. While `alive > 8`: fire at a mech only if it is aware and <120 m, or under 35% HP inside an A6 window; stay >210 m or LOS-blocked from every track; steer away from gun/explosion sound clusters; farm crates and drones only with no track within 250 m. *Fails if* we reach the HP race cube-poor: loot debris after `death` sounds.

**B2 (P1, final) Dominated-target rule.** HP is public. For each visible enemy E that is not our target, require another visible mech X with `dist(E,X) < dist(E,us) - 10 m` or `hp%(X) < hp%(us) - 0.1`; otherwise break LOS to E. Under 50% HP break LOS to everyone. *Fails if* nobody else is visible: cover.

**B3 (P1, final) Stuck-pursuer punish.** A track slower than 1 m/s for 1 s with no `walkLine` to us is wall-stuck: mortar its memory-true position every cooldown, refreshing memory with a 0.2 s peek every 4.5 s. *Fails without* a mortar: disengage.

**B4 (P1, final) Drop greed.** From `lands_in <= 5 s` hold a covered cell 90-140 m from the ring. A capturer is confined to an 8 m disc for 4 s: full laser each cycle; mortar the centre at `progress >= 0.5` (16 m/s knock empties the ring, the clock restarts). *Fails if* two others see our cell: leave.

## C. Our own robustness

**C1 (P0, both) No readable rhythm.** One PRNG seeded `hello.seed XOR hash(spawn, zone.next_center)` draws every interval (strafe, peek dwell U(0.25, 0.45) s, hide dwell, peek side); no fixed alternation (the over-switching error, Walker & Wooders). Never below 5 m/s for >0.5 s while an aware mech has LOS (drop ring: circle at r <= 6 m; crates: strafe). Reload in cover at ammo <= 4. Our laser tracks until release. *Fails if* jitter costs aim: cap torso error at 2 deg.

**C2 (P1, both) Anti-tunnel.** Vision is a 120 deg wedge: sweep the torso 360 deg during every covered reload (1.57 s < 2.4 s). On `damaged.rear` or `by != target`: face it the same tick and reselect; two in 3 s: move to a cell blocking both. *Fails if* the sweep delays a peek: skip it when A3 opens a window.

## D. Risk sizing

**D1 (P0, practice) Risk-neutral, banked kills.** A 48-match mean has SE = sigma/6.9 (about 0.4): only E[kills] counts. Kills are banked: attempt a finishing push iff `p_finish >= V/(1+V)`, `V = clamp((T_esc - t)/C, 0.2, 5)` (C = kill-cycle EMA, default 40 s; T_esc default 240 s): 0.83 at t=40, 0.67 at 160, 0.33 at 220. Cornered (`ttkMe` < time to cover): V = 0.2, focus the lowest `h_i/(b*q_i)`, never run. *Fails if* T_esc is wrong: fit hunters-versus-kills from our own replays.

**D2 (P1) Submission variance.** Qualification is a threshold: seek variance below the cut, avoid it above (Tsetlin et al.; Cabral). Expected best of k = 2, 3, 4 evaluations is mu + {0.56, 0.85, 1.03}*SE, so the 5.58 top is partly selection noise (Blum & Hardt). If the best score counts, submit >=4 variants; if the latest counts, freeze at displayed >= 5.5 (4.23 + 0.7 drift + 1.5 SE). *Fails if* the rule is unknown: assume latest.

## Disagreements with the user notes

1. "Feints at 0.3-0.6 s": a full velocity swing takes 0.4 s; intervals under 0.45 s move the body <3 m peak-to-peak, less than its 5 m width.
2. "Low-variance placements": wrong for practice, a mean of banked kills (D1).
3. Sound fusion, seven-agent arbitration: little value against a shared-vision squad; keep sound-cluster avoidance for the final.
4. "Ambush drops, never rush": right in the final (B4); house bots never contested, so capture under panel 1's gate.

Kept: determinism, torso-to-attacker, `charging` dodge.

## Sources

- Robowiki, Stop And Go: https://robowiki.net/wiki/Stop_And_Go_Tutorial
- Johanson, Zinkevich, Bowling: https://proceedings.neurips.cc/paper/2007/hash/6e7b33fdea3adc80ebd648fffb665bb8-Abstract.html
- Walker, Wooders: https://www.math.stonybrook.edu/~gaston/print/Old/WimbledonAER.pdf
- Tsetlin, Gaba, Winkler: https://ideas.repec.org/a/kap/jrisku/v29y2004i2p143-158.html
- Cabral: https://ideas.repec.org/a/bla/jemstr/v12y2003i1p139-150.html
- Blum, Hardt: https://proceedings.mlr.press/v37/blum15.html
- Yang et al., CodeClash: https://arxiv.org/abs/2511.00839
