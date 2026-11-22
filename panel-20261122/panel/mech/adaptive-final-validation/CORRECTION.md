# Active-input termination correction

The predetermined fourteen-process batch is preserved in `results.json` and its raw logs. It completed with eight strict passes and six failures. Both organizer checks and all six official-input strict replays passed. Every one of the 4,200 requested observation decisions was timely; none of the six active-input failures was a late answer.

The active input with SHA256 `2db53d3edff1c4170796a4069bfb67316477ff7f6aa2e13ed1edfe1a9fc54ff8` contained the hello and 300 observations, but omitted an end message. The existing driver assumes its last input message is the end and sent that message after the observations. It therefore resent observation tick 3448, and each bot correctly replied. The driver classified that reply as unsolicited, and no end summary was emitted because no end was sent. The gate's preflight checked the observation count and unique ticks but did not validate the terminal message; that omission is part of this test-harness failure.

This is not evidence of a candidate-specific protocol defect. It is also not a reason to mark the original six runs as passes. Their full logs, timings, exact input hash and failed termination verdicts remain intact. The original batch's release decision remains HOLD.

The moderator approved a bounded correction: preserve the original bytes, add a schema-valid terminal end to a separate complete stream, confirm all 300 observation payloads are unchanged, and run only the six affected active checks in the same two candidate rotations. Source, bundles, runtime flags and CPU affinity remain fixed. Do not rerun the successful organizer or official-input checks. The six corrective runs get a separate receipt and are not replacements for the original evidence.
