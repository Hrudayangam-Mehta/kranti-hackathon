# Our restatement (plain arithmetic) of the proj1-family range choice against a gun+laser mech, and of
# house-bot gun damage at the two held ranges. Numbers from kit/protocol.md and notes (D1, S05).
def clamp(x, a, b): return max(a, min(b, x))
gun_sus = 45*12/(12*0.24+2.4)        # 102.3 dps if every round lands
las = 315/(0.75+1.65)                # 131.25 dps at full charge, every cycle
def my(d): return gun_sus*clamp(0.97-(d-40)*0.0035, 0.3, 0.97) + (las if d < 280 else 0)
def en(d): return 105*clamp(0.9-(d-40)*0.0125, 0.06, 0.9) + (125 if d < 280 else 0)
best, bd = -1e9, 130
for d in (28, 40, 55, 75, 100, 130, 160, 190):
    a = my(d) - 1.15*en(d)
    print(f"d={d:3d}  my={my(d):6.1f}  enemy(model)={en(d):6.1f}  adv={a:7.1f}")
    if a > best + 2: best, bd = a, d
print("damage-model choice:", bd, "m;  at 170 m adv =", round(my(170)-1.15*en(170), 1))
# house gun incoming at held range, two hit-rate sources (D1 table; S05 skandra live)
for name, d, h1, h2 in (("~100-130 m", 115, 0.57, 0.31), ("~170 m", 170, 0.23, 0.12)):
    print(f"house gun at {name}: {gun_sus*h1:5.1f} dps (D1 {h1:.0%}) / {gun_sus*h2:5.1f} dps (S05 {h2:.0%}); with laser {las+gun_sus*h1:5.1f}/{las+gun_sus*h2:5.1f}; 1400 hp lasts {1400/(las+gun_sus*h1):4.1f}-{1400/(las+gun_sus*h2):4.1f} s")
print("bullet flight 100/130/170 m:", [round(d/252, 2) for d in (100, 130, 170)])
for s in (4.96, 5.10, 5.19, 5.31, 5.42, 5.50, 5.54, 5.60): print(s, "=", round(s*48), "/48 =", round(round(s*48)/48, 4))
