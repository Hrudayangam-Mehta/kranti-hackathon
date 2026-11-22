"""Inject extra dialect and boundary dirt into a generated dataset (test-only).
Usage: mutate.py SRC_DIR DST_DIR SEED
"""
import datetime
import os
import random
import shutil
import sys

src, dst, seed = sys.argv[1], sys.argv[2], int(sys.argv[3])
rng = random.Random(seed)
shutil.rmtree(dst, ignore_errors=True)
shutil.copytree(src, dst)

EPOCH = datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc)


def to_ms(text):
    try:
        if text.isdigit():
            return int(text)
        if text.endswith("Z") and len(text) == 20:
            dt = datetime.datetime.strptime(text, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
            return int((dt - EPOCH).total_seconds()) * 1000
    except ValueError:
        return None
    return None


def as_form(ms, form):
    if form == "f3":
        return "0" * rng.randint(0, 6) + str(ms)
    if ms % 1000:
        return str(ms)
    dt = EPOCH + datetime.timedelta(milliseconds=ms)
    if form == "f1":
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    minutes = rng.choice([0, 30, 45, 59]) + 60 * rng.randint(0, 23)
    sign = rng.choice([1, -1])
    local = dt + datetime.timedelta(minutes=sign * minutes)
    off = f"{'+' if sign > 0 else '-'}{minutes // 60:02d}:{minutes % 60:02d}"
    if minutes == 0 and rng.random() < 0.5:
        off = "-00:00"
    return local.strftime("%Y-%m-%dT%H:%M:%S") + off


def bad_ts(ms):
    dt = EPOCH + datetime.timedelta(milliseconds=ms - ms % 1000)
    return rng.choice([
        dt.strftime("%Y-%m-%d %H:%M:%SZ"),
        dt.strftime("%Y-%m-%dT%H:%M:%Sz"),
        dt.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        dt.strftime("%Y-%m-%dT%H:%M:%S+0200"),
        dt.strftime("%Y-%m-%dT%H:%M:%S+24:00"),
        dt.strftime("%Y-%m-%dT%H:%M:%S-05:60"),
        dt.strftime("%Y-%m-%dT%H:%M:%S"),
        dt.strftime("%Y-02-30T%H:%M:%SZ"),
        dt.strftime("%Y-13-%dT%H:%M:%SZ"),
        dt.strftime("%Y-%m-%dT24:%M:%SZ"),
        dt.strftime("%Y-%m-%dT%H:%M:60Z"),
        str(ms) + ".0",
        "-" + str(ms),
        " " + str(ms),
        str(ms) + " ",
        "1.79e12",
        "",
        "9" * 25,
    ])


def quote(field):
    return '"' + field + '"' if rng.random() < 0.15 else field


def mutate_field_space(field):
    r = rng.random()
    if r < 0.3:
        return " " + field
    if r < 0.6:
        return field + " "
    return field.upper()


def rewrite(folder, fn, extra_lines):
    path = os.path.join(dst, folder)
    names = sorted(n for n in os.listdir(path) if n.endswith(".csv"))
    all_extra = list(extra_lines)
    for name in names:
        p = os.path.join(path, name)
        raw = open(p, "rb").read().decode()
        lines = raw.split("\n")
        header, body = lines[0], [l for l in lines[1:] if l != ""]
        out = []
        for line in body:
            out.extend(fn(line, header))
        k = rng.randint(0, max(1, len(all_extra) // max(1, len(names))))
        out.extend(all_extra[:k])
        del all_extra[:k]
        rng.shuffle(out)
        text = header + "\n" + "\n".join(out)
        if out and rng.random() < 0.7:
            text += "\n"
        open(p, "wb").write(text.encode())
    if all_extra:
        open(os.path.join(path, "zz-extra.csv"), "wb").write((header + "\n" + "\n".join(all_extra) + "\n").encode())
    open(os.path.join(path, "empty0.csv"), "wb").write(b"")
    open(os.path.join(path, "headeronly.csv"), "wb").write(header.encode())


def strip_quotes(line):
    return [f[1:-1] if len(f) >= 2 and f.startswith('"') and f.endswith('"') else f for f in line.split(",")]


def event_line(line, header):
    out = []
    f = strip_quotes(line)
    if len(f) != 7:
        return [line]
    r = rng.random()
    ms = to_ms(f[2])
    if ms is not None and r < 0.25:
        f[2] = as_form(ms, rng.choice(["f1", "f2", "f3"]))
    elif ms is not None and r < 0.27:
        f[2] = bad_ts(ms)
    r = rng.random()
    if r < 0.01:
        f[1] = mutate_field_space(f[1])
    elif r < 0.015:
        f[5] = mutate_field_space(f[5])
    elif r < 0.02:
        f[0] = f[0] + rng.choice([" ", "\r"])
    elif r < 0.025:
        f[4] = rng.choice(["Purchase", "cart ", " view", "VIEW", "purchase\r", "buy"])
    elif r < 0.035 and f[4] == "purchase":
        f[6] = rng.choice(["0", "00250", "10000000", "10000001", "19.99", "-5", "+5", "", "1000\r", "０", "0000000000000000000001"])
    line2 = ",".join(quote(x) for x in f)
    r = rng.random()
    if r < 0.005:
        line2 += "\r"
    elif r < 0.008:
        line2 += ",x"
    elif r < 0.010:
        line2 = line2.replace(",", '",', 1)
    out.append(line2)
    r = rng.random()
    ing = to_ms(f[3])
    if ing is not None and r < 0.02:
        g = list(f)
        g[1] = rng.choice([f[1], "u" + str(rng.randint(0, 99999)), ""])
        g[2] = as_form(ms, "f3") if ms is not None else g[2]
        delta = rng.choice([-1000, 0, 1000, 60000])
        g[3] = (EPOCH + datetime.timedelta(milliseconds=ing + delta)).strftime("%Y-%m-%dT%H:%M:%SZ")
        if delta == 0:
            g = list(f)
        out.append(",".join(quote(x) for x in g))
    if ms is not None and rng.random() < 0.01:
        g = list(f)
        g[0] = f[0] + "x" + str(rng.randint(0, 9))
        g[2] = as_form(ms + rng.choice([0, 1_800_000, 1_800_001, -1_800_000, 86_400_000]), "f3")
        g[3] = (EPOCH + datetime.timedelta(milliseconds=(ms - ms % 1000) + 86_400_000 * rng.choice([0, 1]) + rng.choice([0, 1000]))).strftime("%Y-%m-%dT%H:%M:%SZ")
        out.append(",".join(quote(x) for x in g))
    return out


def click_line(line, header):
    global rng
    f = strip_quotes(line)
    if len(f) != 4:
        return [line]
    outer = rng
    rng = random.Random(f"{seed}/{f[0]}")
    try:
        return click_values(f)
    finally:
        rng = outer


def click_values(f):
    ms = to_ms(f[3])
    r = rng.random()
    if ms is not None and r < 0.3:
        f[3] = as_form(ms, rng.choice(["f1", "f2", "f3"]))
    elif ms is not None and r < 0.32:
        f[3] = bad_ts(ms)
    r = rng.random()
    if r < 0.01:
        f[1] = mutate_field_space(f[1])
    elif r < 0.02:
        f[2] = mutate_field_space(f[2])
    out = [",".join(quote(x) for x in f)]
    if rng.random() < 0.03:
        out.append(",".join(quote(x) for x in f))
    if ms is not None and rng.random() < 0.02:
        g = list(f)
        g[0] = f[0] + "t"
        g[3] = str(ms)
        out.append(",".join(quote(x) for x in g))
    if rng.random() < 0.004:
        out.append(",".join([f[0] + "r"] + f[1:]) + "\r")
    return out


def link_line(line, header):
    f = strip_quotes(line)
    if len(f) != 2:
        return [line]
    r = rng.random()
    out = [",".join(quote(x) for x in f)]
    if r < 0.05:
        out.append(",".join(quote(x) for x in reversed(f)))
    elif r < 0.06:
        out.append(f"{f[0]},{f[0]}")
    elif r < 0.07:
        out.append(f"{f[0]},")
    elif r < 0.08:
        out.append(f"{f[0]},{f[1]},{f[1]}")
    elif r < 0.085:
        out.append(f'{f[0]},{f[1]}"')
    return out


rewrite("events", event_line, ["", "event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents", ",u1,1,1,view,p1,", '"', "a,b,c"])
rewrite("clicks", click_line, ["", "click_id,user_id,campaign_id,ts", "k,u,c_1"])
rewrite("links", link_line, ["", "user_id_a,user_id_b", "uq,user_id_a", "uzz", ",", "\r"])
