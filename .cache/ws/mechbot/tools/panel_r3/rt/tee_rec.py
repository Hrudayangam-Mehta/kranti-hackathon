#!/usr/bin/env python3
"""Recorder for sim proc bots: tee_rec.py OUT.jsonl -- <bot command...>
Every line the simulator sends is appended to OUT.jsonl and forwarded to the bot; the bot's stdout is passed back.
The recorded stream (hello, obs..., end) can then be replayed by timing.py: the bot is deterministic, so a replay
reproduces the match decisions exactly (closed loop in effect)."""
import subprocess, sys, threading

out = sys.argv[1]
cmd = sys.argv[3:] if sys.argv[2] == "--" else sys.argv[2:]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, bufsize=0)
f = open(out, "wb")

def back():
    for raw in p.stdout:
        sys.stdout.buffer.write(raw); sys.stdout.buffer.flush()

threading.Thread(target=back, daemon=True).start()
for raw in sys.stdin.buffer:
    f.write(raw)
    try:
        p.stdin.write(raw); p.stdin.flush()
    except OSError:
        break
f.close()
try:
    p.stdin.close()
except OSError:
    pass
try:
    p.wait(timeout=3)
except subprocess.TimeoutExpired:
    p.kill()
