# Correction to the first quiet-run summary

The raw `results.json` and every original log are retained unchanged.

The first summary incorrectly equated the official checker's `PASS` exit with zero late answers. Its published checker permits a small late fraction. Our intended release gate is stricter and must inspect the explicit counts.

| Frozen build | Official observations | Answered in time | Missed / late | Maximum response |
|---|---:|---:|---:|---:|
| Capture | 300 | 300 | 0 / 0 | 3.8 ms |
| Pressure + ready | 300 | 300 | 0 / 0 | 4.6 ms |
| Burst + varied | 300 | 298 | 2 / 2 | 243.3 ms |

The burst bot's stderr separately records slow ticks 206 and 232 at 78.6 ms and 227.3 ms of bot-side elapsed work. Thus the earlier statement that all three official checks had zero late answers, and the associated immediate publishable status, were withdrawn. The six separate lockstep runs did have zero late answers; those observations do not erase the official-checker outliers.

The first counterfactual stream also does not establish coverage of the new combat movement. It changed aim, fire and reload decisions but produced no movement/boost differences relative to capture. It retained recorded map positions and distant zone geometry, so its results must not be presented as a fully active chase benchmark.

A predetermined two-round diagnostic then compared all three unchanged bundle hashes using strictly parsed official-checker counts and an independently constructed valid-zone/contact fixture. All 12 planned processes completed and passed the strict zero-late gate; every result is retained in `strict-diagnostic/results.json`. This fixed batch was planned before execution and was not repeated until a favorable result appeared. The newer fixture is counterfactual protocol input, not an official replay or physically simulated/scored match. The verified missing active-pressure warmup is a separate coverage concern, not an established explanation for the original inactive-path outliers. `release-validation-status.json` supersedes the temporary publication hold while preserving this correction and the original two late answers.
