use std::io::Write;
use std::sync::atomic::{AtomicU64, Ordering};

static START: AtomicU64 = AtomicU64::new(0);
static START_CPU: AtomicU64 = AtomicU64::new(0);

pub fn now_ns() -> u64 {
    let mut ts = libc::timespec { tv_sec: 0, tv_nsec: 0 };
    unsafe { libc::clock_gettime(libc::CLOCK_MONOTONIC, &mut ts) };
    ts.tv_sec as u64 * 1_000_000_000 + ts.tv_nsec as u64
}

pub fn start() {
    START.store(now_ns(), Ordering::Relaxed);
    START_CPU.store(cpu_ms().to_bits(), Ordering::Relaxed);
}

pub fn ms() -> f64 {
    now_ns().saturating_sub(START.load(Ordering::Relaxed)) as f64 / 1e6
}

pub fn cpu_ms() -> f64 {
    let mut usage: libc::rusage = unsafe { std::mem::zeroed() };
    unsafe { libc::getrusage(libc::RUSAGE_SELF, &mut usage) };
    let us = |t: libc::timeval| t.tv_sec as f64 * 1e3 + t.tv_usec as f64 / 1e3;
    us(usage.ru_utime) + us(usage.ru_stime)
}

pub fn say(text: &str) {
    let _ = std::io::stderr().write_all(text.as_bytes());
}

pub fn lap(name: &str) {
    say(&format!("{name:<8} {:>8.1} ms cpu {:.1} ms\n", ms(), cpu_ms()));
}

pub fn exit_now(code: i32) -> ! {
    say(&format!(
        "start_ns {} cpu {:.1} ms\nexit     {:>8.1} ms cpu {:.1} ms\n",
        START.load(Ordering::Relaxed),
        f64::from_bits(START_CPU.load(Ordering::Relaxed)),
        ms(),
        cpu_ms()
    ));
    unsafe { libc::_exit(code) }
}
