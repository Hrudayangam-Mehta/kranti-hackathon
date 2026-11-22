"""Panel R6 I/O: hit probability of a perfectly led gun shot with a lateral bias b = tick * v_perp (V4's one-tick over-lead),
spread 0.6 deg per axis, hit if |lateral| < 2.8 m and |vertical| < 4.8 m (centre aim on a 9 m mech). stdlib only."""
import math
def Phi(x): return 0.5 * (1 + math.erf(x / math.sqrt(2)))
def p_hit(R, b, half=2.8, vhalf=4.8, sd_deg=0.6):
    s = R * math.radians(sd_deg)
    ph = Phi((half - b) / s) - Phi((-half - b) / s)
    pv = Phi(vhalf / s) - Phi(-vhalf / s)
    return ph * pv
print('range m | v_perp 6 m/s (house mean) | 11.7 (walk) | 19.5 (boost)  : hit% fixed / V4 (delta points)')
for R in (60, 90, 130, 180, 220):
    row = []
    for v in (6.0, 11.7, 19.5):
        a, b = p_hit(R, 0.0), p_hit(R, 0.05 * v)
        row.append(f'{100*a:5.1f}/{100*b:5.1f} ({100*(a-b):+.1f})')
    print(f'{R:4d}    ', ' | '.join(row))
# shot-weighted estimate: sim shot mix by range (A traces): 0-40 304, 40-80 747, 80-130 588, 130-240 90 ; v_perp mix: 45% >6.5, mean 6.2
mix = {30: 304, 60: 747, 105: 588, 170: 90}
tot = sum(mix.values()); g = 0
for R, n in mix.items():
    for v, w in ((2.0, 0.35), (6.0, 0.3), (11.7, 0.3), (19.5, 0.05)):
        g += n * w * (p_hit(R, 0.0) - p_hit(R, 0.05 * v))
print(f'shot-weighted gain over the sim range mix: {100*g/tot:+.2f} points of hit rate (relative {100*g/tot/0.816:+.2f}% of gun damage)')
