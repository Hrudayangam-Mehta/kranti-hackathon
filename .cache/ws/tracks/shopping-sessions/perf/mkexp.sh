#!/bin/sh
# copy src_repo to perf/exp_src and add SESSIONS_EXP hooks (1 = no event push, 2 = scanner only, 3 = stop after parse)
S=/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions
rm -rf $S/perf/exp_src && mkdir -p $S/perf/exp_src && cd $S/src_repo && tar --exclude=./target -cf - . | tar -xf - -C $S/perf/exp_src
cd $S/perf/exp_src && python3 - <<'PY'
p='src/fast/mod.rs'
s=open(p).read()
s=s.replace('''    fn line(&mut self, f: &[&[u8]; 7]) {
        let ctx = self.ctx;
        let event_id = f[0];''','''    fn line(&mut self, f: &[&[u8]; 7]) {
        let ctx = self.ctx;
        if ctx.exp == 2 {
            std::hint::black_box(f);
            return;
        }
        let event_id = f[0];''')
s=s.replace('''            self.sink.push(self.arena, part_of(event, H1, ctx.p1_bits), rec);
        }''','''            if ctx.exp == 1 {
                std::hint::black_box(&rec);
            } else {
                self.sink.push(self.arena, part_of(event, H1, ctx.p1_bits), rec);
            }
        }''')
s=s.replace('''    units: Vec<Unit>,
}''','''    units: Vec<Unit>,
    exp: u32,
}''')
s=s.replace('''        units,
    };''','''        units,
        exp: std::env::var("SESSIONS_EXP").ok().and_then(|v| v.parse().ok()).unwrap_or(0),
    };''')
s=s.replace('''                if barrier.wait().is_leader() {
                    lap("parse");
                }''','''                if barrier.wait().is_leader() {
                    lap("parse");
                }
                if ctx.exp >= 1 {
                    unsafe { libc::_exit(0) };
                }''')
open(p,'w').write(s)
PY
