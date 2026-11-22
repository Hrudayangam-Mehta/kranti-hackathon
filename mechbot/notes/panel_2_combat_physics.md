# Panel 2: combat physics, ballistics and control

**Thesis.** With exact fire control and a 115-150 m stand-off our gun out-trades a house gun 2-3:1 before any dodging. Inside about 56 m no dodge exists, so range and cover are the only defence. Scripts: `tools/panel2/`.

**Calibration warning (P0).** The official replay used an older balance: bullets 140 m/s (now 252), walk 9.0 (11.7), accel 45 (58.5), gun cadence 0.40 s (0.24), laser charge 0.65 s (0.75). Replay-derived facts (hit distances 45-77 m, FFA over in 210 s, ~8 m/s) are not current-balance numbers.

## (a) Gun fire control

```
tl = 0.10 s                      // latency; sweep 0.05-0.15 in sim
S  = self.pos + self.vel*tl + (0,0,muzzle_height)
C  = tgt.pos + tgt.vel*tl + (0,0,4.5*(1+0.05*cubes_t))
D = C - S;  V = tgt.vel;  L = self.radius + 0.5;  vb = gun.speed
a = vb^2 - V.V;  b = D.V - vb*L;  c = D.D - L^2
t = (b + sqrt(b*b + a*c)) / a    // exact
P = D + V*t;  yaw = atan2(Py,Px);  pitch = atan2(Pz, hypot(Px,Py))
```
Closed-form intercept [2]; bullets do not inherit shooter velocity. Fire gate, with w = r_t + 0.3 and sigma = 0.0105 rad: fire only if the yaw error of the ACTUAL `self.aim` <= max(0.004, w/R - sigma), pitch error <= max(0.004, 4.8/R - sigma), and `shotClear`. Slew is 0.2 rad yaw per tick (180 deg = 0.79 s): with no target, park the torso on the likeliest threat bearing.

| R (m) | T = tl + flight (s) | yaw gate (mrad) | P, straight target | P vs house motion* | linear shooter vs our jink** |
|---|---|---|---|---|---|
| 50 | 0.29 | 46 | 1.00 | 0.97 | 0.82 |
| 75 | 0.39 | 27 | 1.00 | 0.90 | 0.54 |
| 100 | 0.48 | 17.5 | 0.99 | 0.82 | 0.37 |
| 125 | 0.58 | 11.9 | 0.97 | 0.70 | 0.25 |
| 150 | 0.68 | 8.2 | 0.92 | 0.58 | 0.18 |
| 200 | 0.88 | 3.5 | 0.80 | 0.39 | 0.11 |

*Replay linear-lead error x1.3; house bots reversed twice in 5,939 combat frames, so linear lead is the practice gun. **Monte-Carlo, reversal interval 0.5-1.0 s.

Jinking targets (finals). Reachable lateral width after T at walk speed: W = a T^2/2 (T <= 0.4 s), then 2v(T - 0.2). While W <= 2w (R <= 89 m; 63 m for a slow target) aiming at the midpoint `x + vT - W/2` always hits; beyond, the ceiling is 2w/W (0.84 at 100 m, 0.50 at 150 m). Jitter faster than 0.4 s loses to aim-at-current (0.86-0.93), reversals slower than 1 s to linear lead: run virtual guns [1] over {full, half, zero, midpoint} lead, EMA 0.1.

## (b) Our dodge envelope

Deviation from a linear lead s seconds into a reversal: d(s) = a s^2/2 (s <= 0.4 s), then 2v(s - 0.2). A miss needs d >= w: s* = sqrt(2w/a) = 0.309 s (0.372 s at 10 cubes).

- Jink threshold R_j = vb (s* - tl) + 3 = **56-68 m** (72-84 m at 10 cubes); at 45 m a linear shooter still hits 0.82-0.89.
- Reversal interval drawn from {0.5 ... 1.0} s (seeded RNG), perpendicular to the threat (best fixed value: 0.5 s at 60-100 m, 0.6 at 125 m, 0.7 at 150 m); never below 0.5 s (amplitude a h^2/4 drops under w). Boost-jinking improves 0.37 to 0.22 at 100 m for 17 energy/s: bursts <= 2 s only.
- **Laser.** Replay (old rules): all 39 beams left 13 ticks after charge start along a direction fixed at charge start (position + velocity x charge time); 11 hit, the misses having changed velocity. Today's rules let the torso turn while charging, so locking is unverified. Closed-loop rule: on the rising edge of `charging`, t_rem = charge - 0.1 s; each tick take the move (8 directions) maximising our predicted distance from their current aim ray at t_rem. Needed 3.5 m: 0.40 s from rest, 0.35 s by reversing. If the ray follows us on two observations they track: no dodge exists (needs v/R > 4 rad/s), so reach cover if within 6 m (walk) or 9 m (boost), else face them and fire; with lightning inside 45 m, zap (2 s short).
- **Mortar shell.** `t = (uz + sqrt(uz^2 + 2g(pz - zg)))/g; I = p.xy + u.xy*t` (g = 22; two passes with zg = surfaceZ(I)). Danger if I is within 12 m of our predicted position. Escape distance v(t - v/2a): walk needs t >= 1.1 s, boost 0.78 s; take the cheapest direction clearing 12 m.

## (c) Mortar firing

`tan(th) = (v^2 - sqrt(v^4 - g(g d^2 + 2 dz v^2)))/(g d)`, flight = d/(v cos th); iterate 3x for the 3 m launch offset (tube at z + 9.5) and the lead. Flat pitch / flight: 30 m 0.064 rad / 0.42 s; 60 m 0.129 / 0.84 s; 100 m 0.219 / 1.42 s. Aim at the feet; fire at movers only when flight <= 0.9 s (d <= 65 m). Self-splash floor **15 m (20 m advancing)**, `rayShot` clear over the first 12 m.

## (d) Damage and regeneration economy

| weapon | sustained dps | TTK 1400 HP | rear x1.5 | notes |
|---|---|---|---|---|
| gun | 107 (187 burst) | 11.8 s | 7.0 s | p = 0.85: 15.1 s; p = 0.5: 25.7 s |
| gun + drum mag | 139 | 9.1 s | | +30%; tungsten 123, rotary 115 |
| laser | 131 | 10.4 s | 5.6 s | mortar holder 504/shot; rear + cook-off 3.2 s |
| lightning | 240 | 5.8 s, 72 energy | 3.8 s | |
| gun + lightning | 427 | **3.5 s** | | |
| gun + laser | 238 | 5.6 s | | |
| mortar | 138 direct, ~40 splash | 7.8 s | | |

Laser damage(c) = 315(0.35 + 0.867c): charge fully; release early only for a kill. Cubes scale our damage and target HP by (1 + 0.04c).

Regeneration needs 5 s without dealing **or** taking damage:
1. One hit every <= 4.5 s holds a target at zero regen.
2. While healing, hold fire unless the shot kills or expects >= 225 damage (5 s x 45).
3. Healing dH costs 5 + dH/45 s (1000 HP: 27 s).
4. Engage iff `t_kill * DPS_in <= HP_self - 500` and `DPS_out/DPS_in >= 1.5`, where t_kill = HP_t / sum(dps_w p_w(R)) and DPS_in sums enemies with line of sight; otherwise break line of sight.
5. A peek must deal >= 3x what it takes. Return gun fire cannot land before 0.15 s + R/252 (0.55 s at 100 m, 0.75 s at 150 m).

## (e) Laser peek cycle (2.4 s)

Charging halves speed. Park the centre 3.0 m behind the shadow line. t = 0: press. t = 0.35 s: boost out (3.5 m takes 0.44 s). t = 0.80 s: `shotClear`, release and reverse. Exposure 0.3 s before plus 0.5 s after the shot; 15 energy. Per enemy gun that is <= 2 returning bullets at 100 m, <= 1 at 150 m, for 315 dealt.

## (f) Engagement range

House gun accuracy (replay): 0.96 (30-45 m), 0.83 (45-60), 0.65 (60-80), 0.36 (80-100), 0.26 (100-130), 0.17 (130-170). Exchange p_us/p_them: 1.2 at 50 m, 1.4 at 70 m, 2.4 at 90 m, **2.9 at 115 m**, 3.4 at 150 m, before jinking. If their error is flight-time-limited, today's faster bullets shift their curve out x1.4 (1.9 at 115 m, 2.2 at 150 m): R7 decides.

| us \ them | gun | + lightning | + laser | + mortar |
|---|---|---|---|---|
| gun | 100-130 m, jink | >= 70 m | 100-130 m, beam dodge | 60-130 m, shell dodge |
| + laser | peek 100-150 m | peek | peek only | 100-200 m, first target |
| + lightning | rush to 35-40 m only if <= 1 enemy has LOS and energy >= 80 | only with +30% HP | rush (short) | no rush |
| + mortar | shells <= 65 m | shells 50-65 m | drop the mortar | gun |

## (g) Energy

Jet 10 m/s at 1.5 energy/m (budget 1.7): 20 m = 34, 40 m = 68, 59 m = 100. Boost: 5.9 s / 115 m per tank, 46 m more than walking. Lightning 12 energy/s (8.3 s, 33 shots per tank): start a kill only with energy >= 3 ceil(HP_t/60) + 10. Keep >= 35 in combat.

## Recommendations

| id | P | rule | failure mode |
|---|---|---|---|
| R1 | P0 | Exact intercept, latency, actual-aim gate (a) | wrong tl: misses beyond 80 m |
| R2 | P0 | Range-keep R* = 115 m (85-150): closing speed = clamp(0.5 (R - R*), +-v_walk), remainder lateral; torso on the threat | no long sight line; hunters boost in |
| R3 | P0 | Jink {0.5-1.0} s only when R > 60 m | walls block the strafe |
| R4 | P0 | Engagement gate, regen denial, hold-fire (d) | stale p(R) tables |
| R5 | P1 | Beam-line dodge (b) | trackers: cover branch |
| R6 | P1 | Laser peek (e) at R >= 100 m | corner misjudged: beam hits wall |
| R7 | P1 | Online accuracy per 25 m band (bullets seen vs `damaged`); R* = argmax p_us/p_them, p_us >= 0.6 | under 30 shots: keep prior |
| R8 | P1 | Lightning rush and mortar limits (c, f) | squad arrives within 3.5 s |
| R9 | P2 | Shell impact escape (b) | upgraded splash: assume 9.1 m |
| R10 | P2 | Virtual guns (a) | adaptive movers poison statistics |
| R11 | P2 | Drum mag > tungsten > rotary; stop at 10 cubes | fewer upgrade offers |

## Disagreements with the user notes

1. "Survive, avoid kills": in practice mode score = kills before death.
2. "Lateral boost-dodge on `charging`": a tracked hitscan beam cannot be out-run; only a velocity change (if the shooter lead-locks) or a line-of-sight break works.
3. "Prioritise rooftops": a roof hides us only if setback > 9R/(h - 8) (45 m for a 20 m roof at 60 m).
4. "Never take fair fights": fairness depends on range; take any 1v1 at 100-150 m.
5. "Blind suppression fire": dealing damage resets our own regen clock.

## Sources

[1] https://robowiki.net/wiki/Virtual_Guns
[2] https://gamedeveloper.com/programming/predictive-aim-mathematics-for-ai-targeting
