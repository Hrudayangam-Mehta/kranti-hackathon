# One-CPU runtime finding (team lead, measured 05:58 UTC Nov 21)

The match sandbox gives the bot one CPU as a CFS quota (docker --cpus 1), not one core: the JavaScript
engine still sees every host core and starts helper threads (JIT compiler tiers, concurrent garbage
collector). Their bursts use up the 100 ms allowance and the whole process is throttled: the decision code
measures 1.2 ms but the answer arrives up to 50 ms late.

Reproduction without Docker (this machine has cgroup v1): `tools/cg1.sh` puts a command into the group
/sys/fs/cgroup/cpu/mechtest (cfs_quota_us = cfs_period_us = 100000). Create the group once with:
  mkdir -p /sys/fs/cgroup/cpu/mechtest; echo 100000 > .../cpu.cfs_period_us; echo 100000 > .../cpu.cfs_quota_us
Check command:
  python3 kit/check/check.py --map-dir $P/kit/arena -- tools/cg1.sh env <VARS> ./bun bot/bot.js

Measured with the real map and the layer 1-7 brain (answer times seen by the checker, 300 observations):

| engine settings | p50 | p90 | p99 | max | late |
|---|---|---|---|---|---|
| default, run 1 | 0.5 | 0.9 | 31.4 | 50.6 | 1 |
| default, run 2 | 0.4 | 0.6 | 7.6 | 43.0 | 0 |
| helper threads limited, run 1 | 0.5 | 1.3 | 6.3 | 13.5 | 0 |
| helper threads limited, run 2 | 0.4 | 1.1 | 5.7 | 12.4 | 0 |

"Limited" = the BUN_JSC_* environment lines now in bot/Dockerfile (no top compiler tier, no concurrent
compilation or collection, one thread per pool). Every release build must be re-measured this way, and a
start-up rehearsal of a few hundred synthetic decisions should move the remaining compile pauses before the
first observation. A late answer makes the mech coast for a second, so this is worth real points.
