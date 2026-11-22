import sys
p = sys.argv[1] + "/src/fast/trace.rs"
s = open(p).read()
s = s.replace("""    #[inline(always)]
    pub fn now(&self) -> Option<Instant> {
        if self.on {
            Some(Instant::now())
        } else {
            None
        }
    }

    #[inline(always)]
    pub fn add(&mut self, stage: usize, start: Option<Instant>) {
        if let Some(start) = start {
            self.record(stage, start, Instant::now());
        }
    }

    #[cold]
    fn record(&mut self, stage: usize, start: Instant, end: Instant) {
        let a = &mut self.acc[stage];
        let s = start.duration_since(self.base).as_secs_f64() * 1e3;
        let e = end.duration_since(self.base).as_secs_f64() * 1e3;
""", """    #[inline(always)]
    pub fn now(&self) -> Option<f64> {
        if self.on {
            Some(cpu_ms())
        } else {
            None
        }
    }

    #[inline(always)]
    pub fn add(&mut self, stage: usize, start: Option<f64>) {
        if let Some(start) = start {
            self.record(stage, start, cpu_ms());
        }
    }

    #[cold]
    fn record(&mut self, stage: usize, s: f64, e: f64) {
        let _ = self.base;
        let a = &mut self.acc[stage];
""")
s += """
fn cpu_ms() -> f64 {
    let mut t = libc::timespec { tv_sec: 0, tv_nsec: 0 };
    unsafe { libc::clock_gettime(libc::CLOCK_THREAD_CPUTIME_ID, &mut t) };
    t.tv_sec as f64 * 1e3 + t.tv_nsec as f64 * 1e-6
}
"""
open(p, "w").write(s)
