import hashlib
import os
import shutil
import subprocess
import sys

T = "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions"
W = f"{T}/rel18_work"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
DEV = f"{T}/kit/data/dev"
ANS = f"{T}/kit/unz/dev-answer"
P20 = f"{T}/m1data/p20m"
REL16_P20 = f"{T}/panel_s/parse/run/p20_rel16"
ENG = f"{W}/vt/eng.sh"
RUN = f"{W}/run"


def compare(a, b):
    p = subprocess.run([PY, "-B", f"{SCRIPTS}/compare.py", a, b], capture_output=True, text=True, cwd=SCRIPTS)
    ok = p.returncode == 0 and p.stdout.strip().endswith("MATCH")
    return ok, (p.stdout + p.stderr).strip()


def both(a, b):
    ok1, t1 = compare(a, b)
    ok2, t2 = compare(b, a)
    return ok1 and ok2, t1, t2


def engine(data, out, env_extra, binary=None, fresh=True):
    if fresh:
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
    env = dict(os.environ)
    for k in ("NCPU", "SESSIONS_F2", "SESSIONS_PATH", "ENG_BIN"):
        env.pop(k, None)
    env.update(env_extra)
    if binary:
        env["ENG_BIN"] = binary
    p = subprocess.run([ENG, data, out], env=env, capture_output=True, text=True)
    stdout_bytes = os.path.getsize(out + ".stdout")
    err = open(out + ".err").read()
    lanes = [l for l in err.splitlines() if l.startswith(("lane F o", "buckets o", "general path"))]
    return p.returncode, stdout_bytes, err, lanes


def summary_lines(err):
    return [l for l in err.splitlines() if l.startswith(("surviving events", "sessions "))]


def dev(specs):
    allok = True
    for spec in specs:
        label, _, envs = spec.partition(":")
        extra = dict(kv.split("=", 1) for kv in filter(None, envs.split(",")))
        out = f"{RUN}/dev_{label}"
        rc, sb, err, lanes = engine(DEV, out, extra)
        ok, t1, t2 = both(out, ANS)
        good = rc == 0 and sb == 0 and ok
        allok &= good
        print(f"dev {label:8s} env={extra} rc={rc} stdout={sb}B compare(out,answer)={t1.splitlines()[-1]} "
              f"compare(answer,out)={t2.splitlines()[-1]} -> {'MATCH' if good else 'FAIL'}", flush=True)
        print(f"    {' | '.join(lanes)}", flush=True)
        if not ok:
            print(t1, t2, sep="\n")
    print("DEV ALL MATCH" if allok else "DEV SOME FAILED", flush=True)
    return allok


def p20(ncpu):
    out = f"{RUN}/p20_rel18_n{ncpu}"
    rc, sb, err, lanes = engine(P20, out, {"NCPU": str(ncpu)})
    ok, t1, t2 = both(out, REL16_P20)
    good = rc == 0 and sb == 0 and ok
    print(f"p20 NCPU={ncpu} rc={rc} stdout={sb}B -> {'MATCH' if good else 'FAIL'}", flush=True)
    print(f"  compare(rel18, rel16):\n    " + t1.replace("\n", "\n    "), flush=True)
    print(f"  compare(rel16, rel18):\n    " + t2.replace("\n", "\n    "), flush=True)
    print("  " + " | ".join(lanes), flush=True)
    for l in summary_lines(err):
        print("  " + l, flush=True)
    return good


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def seed_dirty(out, foreign_user, foreign_campaign, target_file):
    shutil.rmtree(out, ignore_errors=True)
    ud, cd = f"{out}/user_daily", f"{out}/campaign_daily"
    os.makedirs(f"{ud}/sub")
    os.makedirs(f"{ud}/d.parquet")
    os.makedirs(cd)
    shutil.copyfile(foreign_user, f"{ud}/part-00000.parquet")
    shutil.copyfile(foreign_user, f"{ud}/part-00090.parquet")
    shutil.copyfile(foreign_user, f"{ud}/stale.parquet")
    shutil.copyfile(foreign_user, f"{ud}/sub/inner.parquet")
    shutil.copyfile(foreign_user, f"{ud}/d.parquet/kept.parquet")
    shutil.copyfile(foreign_campaign, f"{cd}/part-00009.parquet")
    shutil.copyfile(foreign_campaign, f"{cd}/old.parquet")
    shutil.copyfile(foreign_user, f"{out}/top.parquet")
    os.symlink(target_file, f"{ud}/link.parquet")
    for path, text in ((f"{ud}/keep.txt", "keep me\n"), (f"{ud}/keep.parquet.bak", "keep me too\n"),
                       (f"{cd}/notes.csv", "a,b\n1,2\n"), (f"{out}/readme.txt", "top level\n"),
                       (f"{ud}/_SUCCESS", ""), (f"{cd}/.part-0.parquet.crc", "crc\n")):
        with open(path, "w") as f:
            f.write(text)
    keep = [f"{ud}/keep.txt", f"{ud}/keep.parquet.bak", f"{ud}/sub/inner.parquet", f"{ud}/d.parquet/kept.parquet",
            f"{ud}/_SUCCESS", f"{cd}/notes.csv", f"{cd}/.part-0.parquet.crc", f"{out}/top.parquet",
            f"{out}/readme.txt", target_file]
    gone = [f"{ud}/part-00090.parquet", f"{ud}/stale.parquet", f"{ud}/link.parquet", f"{cd}/part-00009.parquet",
            f"{cd}/old.parquet"]
    return {p: sha(p) for p in keep}, gone


def dirty(binary_label, binary, foreign_user, foreign_campaign, ncpu):
    out = f"{RUN}/dirty_{binary_label}_n{ncpu}"
    target_dir = f"{RUN}/dirty_{binary_label}_n{ncpu}_linktarget"
    shutil.rmtree(target_dir, ignore_errors=True)
    os.makedirs(target_dir)
    target_file = f"{target_dir}/target.parquet"
    shutil.copyfile(foreign_user, target_file)
    keep, gone = seed_dirty(out, foreign_user, foreign_campaign, target_file)
    before = sorted(os.listdir(f"{out}/user_daily")), sorted(os.listdir(f"{out}/campaign_daily"))
    rc, sb, err, lanes = engine(DEV, out, {"NCPU": str(ncpu)}, binary=binary, fresh=False)
    ok, t1, t2 = both(out, ANS)
    kept_ok = all(os.path.lexists(p) and sha(p) == h for p, h in keep.items())
    missing = [p for p, h in keep.items() if not (os.path.lexists(p) and sha(p) == h)]
    still = [p for p in gone if os.path.lexists(p)]
    after = sorted(os.listdir(f"{out}/user_daily")), sorted(os.listdir(f"{out}/campaign_daily"))
    print(f"dirty {binary_label} NCPU={ncpu}: rc={rc} stdout={sb}B compare={t1.splitlines()[-1]}/{t2.splitlines()[-1]} "
          f"non-parquet and out-of-scope entries intact={kept_ok} stale *.parquet still present={len(still)}", flush=True)
    print(f"  before user_daily={before[0]}\n  before campaign_daily={before[1]}", flush=True)
    print(f"  after  user_daily={after[0]}\n  after  campaign_daily={after[1]}", flush=True)
    if missing:
        print(f"  changed or missing: {missing}", flush=True)
    if still:
        print(f"  stale still present: {still}", flush=True)
    if not ok:
        print("  " + t1.replace("\n", "\n  "), flush=True)
    return rc == 0 and sb == 0 and ok and kept_ok and not still


def rerun(binary_label, binary, first, second):
    out = f"{RUN}/rerun_{binary_label}_{first}_{second}"
    rc1, sb1, _, _ = engine(DEV, out, {"NCPU": str(first)}, binary=binary)
    n1 = len([n for n in os.listdir(f"{out}/user_daily") if n.endswith(".parquet")])
    rc2, sb2, _, _ = engine(DEV, out, {"NCPU": str(second)}, binary=binary, fresh=False)
    n2 = len([n for n in os.listdir(f"{out}/user_daily") if n.endswith(".parquet")])
    ok, t1, t2 = both(out, ANS)
    print(f"rerun {binary_label} NCPU {first} then {second} into the same folder: rc={rc1},{rc2} stdout={sb1},{sb2}B "
          f"user files after first={n1} after second={n2} compare={t1.splitlines()[-1]}/{t2.splitlines()[-1]}", flush=True)
    if not ok:
        print("  " + t1.replace("\n", "\n  "), flush=True)
    return rc1 == 0 and rc2 == 0 and sb1 == 0 and sb2 == 0 and ok


if __name__ == "__main__":
    what = sys.argv[1]
    if what == "dev":
        dev(sys.argv[2:])
    elif what == "p20":
        p20(int(sys.argv[2]))
    elif what == "dirty":
        dirty(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], int(sys.argv[6]))
    elif what == "rerun":
        rerun(sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]))
