# Independent startup-rehearsal coverage audit

The frozen default startup rehearsal cannot activate pressure. Each scratch brain receives 800 observations with `t = k * 0.1`, ending at 79.9 seconds. The normal and forced-FFA rehearsals are separate fresh brains, so their clocks do not form a 160-second sequence.

Every synthetic self observation supplies an empty upgrades list. The only offered upgrades occur in phase 9, at 51.3–56.9 seconds for the default phase width of 57. That phase has no secondary weapon. Consequently neither the secondary-plus-upgrade condition nor the 60-second upgraded-gun condition can activate pressure there. Later laser/lightning phases have no offer and still have no upgrades. The 90-second armed deadline is never reached. A shared four-second wall-time cutoff can only reduce coverage further.

`warmup-source-audit.json` records the exact inspected source hashes, phase counts and the source-derived upper bound of zero active-pressure observations. This reviewer did not modify production files or execute warmup instrumentation during the quiet latency window.

The gap is a sound reason to test a bounded active-policy rehearsal in an isolated experiment. It does not prove that the observed 243 ms response came from this gap: JIT compilation, garbage collection and host scheduling remain possible contributors until controlled measurements distinguish them. The source comment claiming every path is compiled before the first real decision is stronger than this construction supports.
