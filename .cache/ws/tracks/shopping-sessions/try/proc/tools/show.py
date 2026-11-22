#!/usr/bin/env python3
"""show.py < bench output : compact table of the key medians."""
import json, sys
cols = [("wall_med", "wall", 1e3), ("wall_min", "wmin", 1e3), ("cpu_med", "cpu", 1e3), ("sys_med", "sys", 1e3),
        ("c_startup", "c.st", 1), ("c_setup", "c.setup", 1), ("c_parse", "c.parse", 1), ("c_dedup", "c.dedup", 1),
        ("c_people", "c.people", 1), ("c_write", "c.write", 1), ("c_exit", "c.drop", 1), ("c_teardown", "c.tear", 1),
        ("c_serial", "c.SERIAL", 1),
        ("d_setup", "w.setup", 1), ("d_parse", "w.parse", 1), ("d_dedup", "w.dedup", 1), ("d_people", "w.people", 1),
        ("d_write", "w.write", 1), ("d_exit", "w.drop", 1), ("d_teardown", "w.tear", 1), ("d_startup", "w.st", 1), ("d_tail", "w.TAIL", 1), ("d_ptail", "w.PTAIL", 1)]
rows = []
for line in sys.stdin:
    line = line.strip()
    if line.startswith("{"):
        rows.append(json.loads(line))
    elif line.startswith("load"):
        print(line)
print("name".ljust(10) + "".join(c[1].rjust(9) for c in cols))
for r in rows:
    print(r["name"].ljust(10) + "".join(
        (f"{r[k]*m:9.1f}" if isinstance(r.get(k), (int, float)) and r.get(k) == r.get(k) else "        -") for k, _, m in cols))
