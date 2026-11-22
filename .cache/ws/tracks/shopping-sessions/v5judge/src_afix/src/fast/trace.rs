use std::sync::Mutex;
use std::time::Instant;

pub const NAMES: [&str; 21] = [
    "setup", "links", "events", "clicks", "wait_links", "wait_events", "unmap", "dedup", "bar_dedup", "order",
    "people", "user_write", "campaign", "last_write", "wait_jobs", "release", "bar_parse", "merge", "bar_merge",
    "persons", "reclick",
];
pub const LINKS: usize = 1;
pub const EVENTS: usize = 2;
pub const CLICKS: usize = 3;
pub const BAR_PARSE: usize = 5;
pub const UNMAP: usize = 6;
pub const DEDUP: usize = 7;
pub const BAR_DEDUP: usize = 8;
pub const ORDER: usize = 9;
pub const PEOPLE: usize = 10;
pub const USER_WRITE: usize = 11;
pub const CAMPAIGN: usize = 12;
pub const LAST_WRITE: usize = 13;
pub const BAR_END: usize = 14;
pub const RELEASE: usize = 15;
pub const BAR_ALL: usize = 16;
pub const MERGE: usize = 17;
pub const BAR_MERGE: usize = 18;
pub const PERSONS: usize = 19;
pub const RECLICK: usize = 20;

#[derive(Clone, Copy)]
struct Acc {
    first: f64,
    last: f64,
    busy: f64,
    cpu: f64,
    sys: f64,
    count: u32,
}

pub struct Trace {
    on: bool,
    base: Instant,
    acc: [Acc; NAMES.len()],
    cpu_mark: (f64, f64),
}

fn thread_cpu() -> (f64, f64) {
    let mut u: libc::rusage = unsafe { std::mem::zeroed() };
    unsafe { libc::getrusage(libc::RUSAGE_THREAD, &mut u) };
    let ms = |t: libc::timeval| t.tv_sec as f64 * 1e3 + t.tv_usec as f64 * 1e-3;
    (ms(u.ru_utime), ms(u.ru_stime))
}

impl Trace {
    pub fn new(on: bool, base: Instant) -> Trace {
        Trace {
            on,
            base,
            acc: [Acc {
                first: f64::MAX,
                last: 0.0,
                busy: 0.0,
                cpu: 0.0,
                sys: 0.0,
                count: 0,
            }; NAMES.len()],
            cpu_mark: if on { thread_cpu() } else { (0.0, 0.0) },
        }
    }

    #[inline(always)]
    pub fn now(&mut self) -> Option<Instant> {
        if self.on {
            self.cpu_mark = thread_cpu();
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
        let cpu = thread_cpu();
        let a = &mut self.acc[stage];
        a.cpu += cpu.0 - self.cpu_mark.0;
        a.sys += cpu.1 - self.cpu_mark.1;
        self.cpu_mark = cpu;
        let s = start.duration_since(self.base).as_secs_f64() * 1e3;
        let e = end.duration_since(self.base).as_secs_f64() * 1e3;
        a.first = a.first.min(s);
        a.last = a.last.max(e);
        a.busy += e - s;
        a.count += 1;
    }

    pub fn print(&self, who: &str) {
        if !self.on {
            return;
        }
        let mut text = String::new();
        for (stage, a) in self.acc.iter().enumerate() {
            if a.count > 0 {
                text.push_str(&format!(
                    "trace {who} {} {:.3} {:.3} {:.3} {} {:.3} {:.3}\n",
                    NAMES[stage], a.first, a.last, a.busy, a.count, a.cpu, a.sys
                ));
            }
        }
        eprint!("{text}");
    }
}

pub fn enabled() -> bool {
    std::env::var("SESSIONS_TRACE").is_ok_and(|v| v == "1")
}

pub fn collect(all: &Mutex<Vec<(usize, Trace)>>, id: usize, trace: Trace) {
    if trace.on {
        all.lock().unwrap().push((id, trace));
    }
}
