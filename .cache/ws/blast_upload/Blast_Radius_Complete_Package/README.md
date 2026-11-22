# Blast Radius — complete research and Rust submission package

## Start here

- reports/Blast_Radius_Research_and_Rust_Submission.pdf: complete 30-page report.
- reports/: editable DOCX, Markdown source, and its benchmark chart.
- blast-radius-rust/: complete submission project, with Dockerfile at its root.
- submission.rs: convenient standalone copy of the Rust source.

## Validation status

Public 30-patch sample: 254.904 simulated seconds, zero missed commits.
Three native runs produced identical output. 29 Rust and 23 Python regression tests passed.
Docker execution and official submission have not been performed. The report distinguishes
verified repository identities from unresolved leaderboard attribution.

## Prepare the project

From the blast-radius-rust directory, run:

    make fetch-kit
    make test
    make check-package
    make sample

The last command is the remaining Docker validation gate. Consult that directory's
README.md for prerequisites, benchmark details, and the submission process.

Publish the contents of blast-radius-rust as the repository root when preparing
an entry; the outer complete-package folder and reports are for your reference.

Research and implementation snapshot: 22 November 2026.
