import sys
M = (1 << 64) - 1
def mix(v):
    v = ((v ^ (v >> 30)) * 0xBF58476D1CE4E5B9) & M
    v = ((v ^ (v >> 27)) * 0x94D049BB133111EB) & M
    return v ^ (v >> 31)
for seed in map(int, sys.argv[1:]):
    state = mix(mix(seed ^ 0x5D588B656C078965) ^ mix(0 + 1) ^ 0)
    draws = []
    for _ in range(8):
        state = (state + 0x9E3779B97F4A7C15) & M
        draws.append(mix(state))
    user_key, event_key, click_key = draws[5], draws[6], draws[7]
    print(f"seed {seed}: user key {user_key & ((1 << 40) - 1):#x} event key {event_key & ((1 << 40) - 1):#x}")
