#!/usr/bin/env python3
import os
import subprocess
import sys

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, FIX, SCRIPTS, PY, run_bin

sys.path.insert(0, SCRIPTS)
from run_fixtures import SCHEMAS, load_actual, load_expected, rows


def official(binary, n):
    env = dict(os.environ, NCPU=str(n), TMPDIR=f"{V}/tmp")
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/run_fixtures.py", FIX, "--", "nice", "-n", "10", "taskset", "-c", "2,3", binary],
                       capture_output=True, text=True, env=env, cwd=os.path.dirname(SCRIPTS))
    with open(f"{V}/logs/fixtures_official_{os.path.basename(binary)}_n{n}.log", "w") as fh:
        fh.write(p.stdout + p.stderr)
    return p.returncode, p.stdout.strip().splitlines()[-1]


def own(binary, n):
    bad = []
    cases = sorted(d for d in os.listdir(FIX) if os.path.isdir(os.path.join(FIX, d)))
    for case in cases:
        data = os.path.join(FIX, case, "input")
        if not os.path.isdir(data):
            data = os.path.join(FIX, case, "data")
        out = f"{V}/runs/fx_{os.path.basename(binary)}_n{n}/{case}"
        r = run_bin(binary, data, out, n)
        problems = []
        if r["rc"] != 0:
            problems.append(f"exit {r['rc']}")
        if r["stdout"] != 0:
            problems.append(f"stdout {r['stdout']} bytes")
        if r["rc"] == 0:
            for table, schema in SCHEMAS.items():
                exp = rows(load_expected(os.path.join(FIX, case, "expected", f"{table}.csv"), schema))
                try:
                    act = rows(load_actual(os.path.join(out, table), schema))
                except Exception as e:
                    problems.append(f"{table}: {e}")
                    continue
                if exp != act:
                    problems.append(f"{table} differs")
        if problems:
            bad.append((case, problems))
    return len(cases), bad


def main():
    binary = sys.argv[1]
    for n in sys.argv[2].split(","):
        rc, last = official(binary, n)
        total, bad = own(binary, n)
        print(f"fixtures NCPU={n}: official run_fixtures.py rc={rc} '{last}'; own loop {total - len(bad)}/{total} ok "
              f"(exit 0, stdout empty, rows equal){'' if not bad else ' BAD ' + repr(bad)}", flush=True)


if __name__ == "__main__":
    main()
