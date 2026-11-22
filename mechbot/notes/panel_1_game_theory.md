# Panel 1 — Game theory / attrition memo

**Thesis.** The practice ranking is a kill-count attrition problem, not a survival problem: house bots never die unless we kill them, so a passive survivor scores about 0. Maximise kills per second while at most one hunter has line of sight (LOS), turn every escalation into sequential 1-v-1s by geometry, and switch to placement logic only when the match is detected to be a real free-for-all (FFA).

Symbols: `H` our HP; `h_i` enemy HP; `b` our expected dps (weapon dps x hit prob x LOS); `a_i` enemy i's dps on us; `A=sum(a_i)` over enemies with LOS in the last 1 s; `tau_i=h_i/b`; `r` regen (45/s); `delta` regen delay (5 s); `c` cubes; `R=2.5(1+0.05c)` m.

## Model (a)

- **Kill cycle.** One kill costs `C=tau(1+a/r)+delta` (fight, then regen what it cost). Gun only, we hit 0.6 (b=64), hunter hits 0.5 through a corner peek (exposure 0.57, a=31): tau=21.9 s, C=42 s, 4.8 kills per 200 s, about the current leaderboard top. Gun+laser (b~170): C=19 s. Nanites (r=72, delta=3.5): -17% C; gun_damage: -12%; plating: 0% while n=1.
- **Lanchester.** `rho=(H-H_esc)*b/(h*a)`. With n hunters all holding LOS (square law), k kills need `k*n-k(k-1)/2<=rho`; if geometry caps simultaneous LOS at m (linear law), `k<=rho/m`. rho=6 against 10 hunters: 0 kills in the open, 3 with m=2, 6 with m=1. Realistic rho: 2.1 (gun, 0 cubes), about 6 (10 cubes + laser). Cubes scale power by (1+0.04c)^2, 1.96 at c=10; each kill drops >=2 cubes (+17% power).
- **Regen is symmetric** (replay: house bots regen at 45/s too). A reset erases the smaller of the two deficits, so breaking off a duel we are winning discards our lead. Regen after the kill, or when losing.
- **Range beats brawling.** A strafe reversal escapes a led bullet once `0.5*58.5*t^2>=R+0.3`: `d_dodge=252*sqrt(2(R+0.3)/58.5)`, 78 m (c=0), 94 m (c=10). Inside 45 m lightning auto-hits for 240 dps and house guns hit 0.8: exchange ratio ~1 (C=69 s) versus 2-5 at 80-120 m behind a corner.

## Recommendations

**R1 (P0, both) Mode switch.** `ffa=(16-alive)-ourKills>=2`, latched, tested only for t<200 s. Default: kill objective (R2-R10). ffa: placement objective (R11-R13). *Fails if* two zone/drone deaths in practice latch FFA wrongly.

**R2 (P0, practice) Finish-or-flee planner.** Each tick sort enemies by the R4 index, accumulate `D_k=sum_j tau_j*(A-sum_{l<j}a_l)`, and set `k*=max k: D_k<=H-H_esc`, `H_esc=A*(d_cover/11.7+1)+150`. k*>=1: fight target 1. k*=0: break LOS. Priors: gun `107*p(d)`, p=0.8/0.6/0.35/0.15 for d<40/90/160/230 m; laser 92; lightning 240 if d<45+R; replaced by 3 s moving averages of `damaged`/`hit` events after 3 samples. *Fails if* priors mislead before samples exist (flees winnable duels).

**R3 (P0, practice) Never reset a winning duel.** While `h_max-h_t > H_max-H`, hit the target at least every `delta-1`=4 s. Disengage voluntarily only if our deficit exceeds its deficit by >135 HP, or k*=0. After every kill enter REGEN (no fire, no LOS, in zone, >50 m from drones) until `H>=0.9*H_max` or a hunter gains LOS. *Fails if* the target hides and regens: drop it after 6 s without LOS.

**R4 (P0, both) Target index (b).** `I_i=V_i/tau_i`, `tau_i=h_i/(b*q_i*m_i)` (q_i our hit prob at its range; m_i=1.5 if we are outside its front arc), `V_i=1+min(2,(H/A)*a_i/((A-a_i+1)*tau_median))`. Override: any target within 3 of our hits. Switch only if `I_new>=1.3*I_cur` or LOS lost 1 s. For n>=4 this is lowest effective HP; for n=2-3 it weights threat (Furtak-Buro a/h ordering). *Fails if* ties cause thrash; damage left on abandoned targets regenerates.

**R5 (P0, practice) Stand-off band and peek.** Versus one hunter hold d in [d_dodge, 120] m with a wall corner <=6 m away; expose only while the magazine is loaded or the laser is charged; reload (2.4 s) behind the corner. Never within 50+R m of a lightning holder. Close in only to finish a target with h<=400 at n=1. *Fails if* our own hit rate collapses at range: if measured q<0.35 over 24 shots, shrink d by 15 m (floor 55 m).

**R6 (P1, practice) Escalation and last stand (c).** n = hunters with LOS in the last 2 s. n=2: fight both only if rho>=3, else move to a cell that blocks LOS from the higher-tau hunter. n>=3, or >=4 tracked within 120 m: go to a bastion = cell with a wall <=4 m behind (no free ray >12 m in the rear 180 deg), open arc <=100 deg (inside the 120 deg FOV), longest free ray <=60 m, inside `zone.next` for >=20 s. Precompute offline (72 rays per cell; the map is fixed); after 265 s stay within 40 m of one. Lightning is the bastion weapon (auto-hit, 2000 damage per 100 energy, chains on clustered pushers). *Fails if* mortars reach the dead end: leave after 2 shells within 7 m or when the zone edge is <8 s away.

**R7 (P1, both) Upgrade order.** First two practice offers: nanites > gun_damage ~ gun_rate ~ laser_damage. From offer 3: plating (+15% rho and HP race) > armor (+8.7%, no zone effect). FFA: plating first. *Fails if* hunters never leave LOS (nanites idle): then plating from offer 1.

**R8 (P1, both) Cubes.** Collect to c=10 when path <=40 m and A=0. Opening: kill crates/drones within 80 m only while `H>=0.9*H_max` (dealing damage blocks regen). For c>=10 collect only if visible cubes reach 15. *Fails if* hitbox growth (+5%/cube) costs more than the upgrade.

**R9 (P1, both) Supply drop (e).** Go iff `G=((H_max-H)/r+delta)/C+0.04*min(3,10-c)*K_rem` exceeds `L=p_die*K_rem+t_detour/C`. With K_rem=3, C=30 s, half HP, 100 m detour: G=1.05, so go while p_die<0.25. Gate: damage does not interrupt capture and capture ends at full HP, so enter the ring iff `H>A*(t_approach+4)+200`, no enemy can reach the 8 m ring within 4 s, and `d_path<=11.7*(lands_in+8)` (house bots captured 8-12 s after landing). Shoot a capturer only if `h<=187*q*t_left+315*[laser ready]`; else step into the ring only with lightning and H>=h. *Fails if* a hunter freezes the clock on open ground: abort after 3 s frozen.

**R10 (P2, practice) Zone as a wall.** Stand 15-30 m inside the edge, edge behind (threat arc <=180 deg); keep `dist_to_next_circle<=7.8*time_to_shrink_end`. *Fails if* a detour makes us late: zone damage resets regen.

**R11 (P1 final, P2 practice) HP race (d).** In the last shrink (390-415 s) the radius falls 1 m/s, so every metre from the moving centre `c(t)=lerp(center,next_center,u)` costs 260 HP. Stand on c(t) (2-D test, roofs count); step off by d metres only if that avoids >260*d combat damage. `E_i=h_i-260*d_i`; shoot the enemy with the smallest positive `E_i-E_us` not above `b*H/(260+A)`; never shoot enemies with `E_i<E_us`. Stop trading at `390-delta-(H_max-H)/r` s. *Fails if* the centre becomes a brawl in lightning range; a mortar concussion costs its victim ~2 s, 520 HP.

**R12 (P1, final) Duel threshold (f).** Fight to the death only if `p>=p*(A)=(A-1)s/(1+(A-2)s+)`, s=0.5, s+=0.55: 0.86 (16 alive), 0.81 (8), 0.71 (4), 0.65 (3), 0.5 (2). With `P=H*b/(h*a)` and `p=P^3/(1+P^3)`: need P>=1.85, 1.6, 1.35, 1.25, 1.0; otherwise break LOS, torso on the attacker. *Fails if* exponent 3 is miscalibrated: fit it in the simulator.

**R13 (P1, final) Third-party the winner; stay unattractive.** Do not fire while two others duel (gun sound carries 320 m). On a `death` within 150 m attack the survivor within 5 s iff h<=0.5*h_max, d<=100 m, no other mech tracked within 120 m. If H/H_max<0.6 with an enemy tracked <200 m, or we are both nearest and lowest HP% to a non-target enemy, break LOS and regen. *Fails if* the survivor is healthy: apply R12.

## Disagreements with the user notes

1. "Survival competition, kills secondary": false for the practice ranking that gates the final.
2. "Never take fair fights; third-party": the squad never infights, and the lone early hunter is the cheapest kill available; make it unfair with range and a corner.
3. "Ambush over rush at drops": damage does not stop a 4 s capture that heals fully.
4. "Rotate early to the centre": it maximises approach angles; hold the edge until the last 25 s.
5. Sound fusion and seven-agent arbitration are low value against a shared-vision squad; kill-cycle time is the bottleneck.

Kept: deterministic logic, torso facing attackers, weapon triangle, HP-ranked finish, more aggression in the final four (R12).

## Sources

- Lanchester laws: https://en.wikipedia.org/wiki/Lanchester%27s_laws
- Furtak & Buro, 1-vs-n target ordering: https://ojs.aaai.org/index.php/AIIDE/article/view/12410
- Churchill, Saffidine & Buro, RTS combat: https://ojs.aaai.org/index.php/AIIDE/article/view/12527
- Smith's ratio rule: https://homes.di.unimi.it/righini/Didattica/Logistica/MaterialeLog/S8b%20-%20Scheduling%20single%20machine.pdf
- Marginal value theorem: https://en.wikipedia.org/wiki/Marginal_value_theorem
- Tournament risk-taking: https://www.iza.org/publications/dp/3400
- Kilgour & Brams, The Truel: https://doi.org/10.2307/2691167
