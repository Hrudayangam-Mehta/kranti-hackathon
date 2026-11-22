#!/usr/bin/env python3
# stdin filter: rewrites hello.map to a v3/ layout under a directory that holds only v3/ (the final may rename
# the arena folder); every other line passes through unchanged, flushed at once.
import json, sys
NEWDIR = sys.argv[1]
for line in sys.stdin:
    if '"hello"' in line[:200] or line.startswith('{"type":"hello"') or '"type": "hello"' in line[:60]:
        try:
            m = json.loads(line)
            if m.get('type') == 'hello':
                m['map'] = {'dir': NEWDIR, 'files': ['v3/world.json', 'v3/terrain.i16']}
                line = json.dumps(m) + '\n'
        except ValueError:
            pass
    sys.stdout.write(line)
    sys.stdout.flush()
