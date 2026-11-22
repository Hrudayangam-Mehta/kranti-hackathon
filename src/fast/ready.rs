//! A one-shot publication latch for independently completed parse producers.
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Condvar, Mutex};

pub(super) struct Completion {
    arrived: AtomicUsize,
    goal: usize,
    lock: Mutex<()>,
    changed: Condvar,
}

impl Completion {
    pub(super) fn new(goal: usize) -> Self {
        assert!(goal > 0);
        Self { arrived: AtomicUsize::new(0), goal, lock: Mutex::new(()), changed: Condvar::new() }
    }

    pub(super) fn arrive(&self) {
        // AcqRel chains every producer's prior writes to the final count.
        let before = self.arrived.fetch_add(1, Ordering::AcqRel);
        debug_assert!(before < self.goal);
        if before + 1 == self.goal {
            // The shared mutex closes the check-to-sleep race with wait().
            let _guard = self.lock.lock().unwrap();
            self.changed.notify_all();
        }
    }

    pub(super) fn wait(&self) {
        if self.arrived.load(Ordering::Acquire) >= self.goal {
            return;
        }
        let mut guard = self.lock.lock().unwrap();
        while self.arrived.load(Ordering::Acquire) < self.goal {
            guard = self.changed.wait(guard).unwrap();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Barrier};

    #[test]
    fn completion_already_published_never_sleeps() {
        let ready = Completion::new(3);
        for _ in 0..3 { ready.arrive(); }
        for _ in 0..32 { ready.wait(); }
    }

    #[test]
    fn concurrent_completion_publishes_every_producer() {
        for round in 0..24 {
            let ready = Arc::new(Completion::new(8));
            let payloads: Arc<Vec<AtomicUsize>> = Arc::new((0..8).map(|_| AtomicUsize::new(0)).collect());
            std::thread::scope(|scope| {
                for id in 0..8 {
                    let ready = ready.clone();
                    let payloads = payloads.clone();
                    scope.spawn(move || {
                        for _ in 0..(id + round) % 5 { std::thread::yield_now(); }
                        payloads[id].store(id + 1, Ordering::Relaxed);
                        ready.arrive();
                        ready.wait();
                        for (i, p) in payloads.iter().enumerate() {
                            assert_eq!(p.load(Ordering::Relaxed), i + 1);
                        }
                    });
                }
            });
        }
    }

    #[test]
    fn notification_without_completion_cannot_release_waiters() {
        let ready = Completion::new(2);
        let start = Barrier::new(3);
        let finished = AtomicUsize::new(0);
        std::thread::scope(|scope| {
            for _ in 0..2 {
                scope.spawn(|| {
                    start.wait();
                    ready.wait();
                    finished.fetch_add(1, Ordering::Relaxed);
                });
            }
            start.wait();
            ready.arrive();
            for _ in 0..32 {
                ready.changed.notify_all();
                std::thread::yield_now();
            }
            assert_eq!(finished.load(Ordering::Relaxed), 0);
            ready.arrive();
        });
        assert_eq!(finished.load(Ordering::Relaxed), 2);
    }
}
