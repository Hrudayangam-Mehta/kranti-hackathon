# Repository hygiene (owner's instruction, binding for anything that goes into the submitted repo)

The public repository is `Hrudayangam-Mehta/kranti-hackathon` (local clone: /home/user/kranti-hackathon).
The owner wants it hard to find and hard to learn from before the deadline:

- Never write these words anywhere in the repository (files, comments, commit messages, bot name, debug
  text): the old repo name (the one starting with "fare"), "mech royale", "mech-royale", "mechfight", "OSU",
  "Ohio", "campus", "Buildathon", "Builders", "joinbuilders", the names of other teams, or any leaderboard
  score. Protocol field names that the program must send or read are unavoidable and allowed.
- README stays minimal: what the program is in one neutral sentence, how to build, the libraries /
  earlier-code / AI-assistance statement, the MIT licence. No strategy, no architecture, no results.
- Shipped source carries no explanatory comments and no tuning notes; the commented source, tests, tools,
  simulator, notes and experiment logs stay OUT of the repository until results are published.
- Commit messages are neutral and short ("Update", "Fix timing"); no scores, no descriptions of tactics.
- The real bot is pushed only in the minute of a submission.
- Before every push run tools/release_gate.sh. Its word check is case-insensitive with word boundaries for short
  words (\bOSU\b, so identifiers such as "exposure" do not trip it): fare.i, royale, mechfight, \bosu\b, ohio,
  campus, buildathon, builders, joinbuilders, team names. It must print nothing.

## Added by the owner (binding)

- NEVER push anything from which our code or method could be crawled or scraped: no readable source of the
  real bot before a submission, no tests, tools, simulator, notes, logs, parameter tables, experiment
  records or strategy text, ever, until results are published. The repository holds only what the scorer
  needs to build and run the bot.
- The submission build is a single bundled, comment-free, minified file produced locally from the readable
  source (which stays out of the repository), plus Dockerfile, LICENSE and the minimal README.
- History was replaced by one clean commit on Nov 21; keep history minimal: one commit per submission,
  neutral message, never force-push a commit that has been submitted.
