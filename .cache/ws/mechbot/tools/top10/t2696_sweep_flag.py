# How often an instantaneous 12-degree "aims at me" test (memory 1.0 s, our D0 implementation) flags a mech
# whose idle torso sweeps +-1.9 rad around its walking direction with angular rate 1.1 rad/s phase speed
# (period 5.71 s). Plain kinematics, 0.1 s decisions; b = our bearing relative to its walking direction.
import math
tol, mem, dt = math.radians(12), 1.0, 0.1
for bdeg in (0, 30, 60, 90, 105, 120):
    b = math.radians(bdeg)
    T = 2*math.pi/1.1; n = int(60/dt); last = -99; flagged = 0; crossings = 0; prev = False
    for k in range(n):
        t = k*dt
        on = abs(1.9*math.sin(1.1*t) - b) < tol
        if on: last = t
        if on and not prev: crossings += 1
        prev = on
        if t - last <= mem: flagged += 1
    print(f"our bearing {bdeg:3d} deg off its heading: flagged hostile {flagged/n:5.1%} of the time, {crossings/60*T:.1f} aim crossings per sweep period")
