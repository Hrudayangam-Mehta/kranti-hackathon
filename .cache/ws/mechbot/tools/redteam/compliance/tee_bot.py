#!/usr/bin/env python3
"""Run a bot command, pass stdin/stdout through unchanged, and record both directions as JSON lines with times.
usage: tee_bot.py <prefix> -- <bot command...>   ->  <prefix>.in.jsonl  <prefix>.out.jsonl  (stderr passes through)"""
import os, subprocess, sys, threading, time
prefix = sys.argv[1]; cmd = sys.argv[3:]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, bufsize=0)
fin = open(prefix + '.in.jsonl', 'wb'); fout = open(prefix + '.out.jsonl', 'wb'); ftm = open(prefix + '.times.tsv', 'w')
def down():
    for line in p.stdout:
        t = time.perf_counter()
        os.write(1, line); fout.write(line); ftm.write(f'out\t{t:.6f}\n')
    try: os.close(1)
    except OSError: pass
th = threading.Thread(target=down, daemon=True); th.start()
try:
    for line in sys.stdin.buffer:
        t = time.perf_counter()
        try: p.stdin.write(line); p.stdin.flush()
        except (BrokenPipeError, OSError): break
        fin.write(line); ftm.write(f'in\t{t:.6f}\n')
finally:
    try: p.stdin.close()
    except OSError: pass
    try: p.wait(timeout=5)
    except subprocess.TimeoutExpired: p.kill()
    th.join(timeout=2); fin.close(); fout.close(); ftm.close()
sys.exit(p.returncode or 0)
