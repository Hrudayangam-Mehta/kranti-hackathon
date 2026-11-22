use super::{part_of, id::Key};

#[derive(Clone, Copy)]
#[repr(C)]
pub struct Run {
    pub root: Key,
    pub plain_first: u32,
    pub plain_len: u32,
    pub paid_first: u32,
    pub paid_len: u32,
}

impl Run {
    pub fn len(self) -> usize {
        self.plain_len as usize + self.paid_len as usize
    }

    pub fn plain_range(self) -> std::ops::Range<usize> {
        self.plain_first as usize..self.plain_first as usize + self.plain_len as usize
    }

    pub fn paid_range(self) -> std::ops::Range<usize> {
        self.paid_first as usize..self.paid_first as usize + self.paid_len as usize
    }
}

const _: () = assert!(std::mem::size_of::<Run>() == 32);

#[derive(Clone, Copy, Default)]
pub struct Reference {
    pub owner: u32,
    pub index: u32,
}

/// One immutable store per worker. Headers keep offsets, never pointers into
/// growing vectors. Plain values retain exact relative u32 milliseconds;
/// nonzero payloads retain the original timestamp/payload u64 without rounding.
pub struct Store {
    pub routes: Vec<Vec<Run>>,
    pub plain: Vec<u32>,
    pub paid: Vec<u64>,
    pub aliases: usize,
    pub direct_users: usize,
    pub direct_events: usize,
    bits: u32,
}

fn offset(n: usize) -> u32 {
    u32::try_from(n).expect("alias store exceeds addressable row count")
}

impl Store {
    pub fn new(bits: u32) -> Self {
        Self {
            routes: (0..1usize << bits).map(|_| Vec::new()).collect(),
            plain: Vec::new(), paid: Vec::new(), aliases: 0,
            direct_users: 0, direct_events: 0, bits,
        }
    }

    // Reserve once per raw partition; every assigned scalar is then written by
    // the counting scatter before this worker publishes the store.
    pub fn reserve_rows(&mut self, plain: usize, paid: usize) -> (usize, usize) {
        let first_plain = self.plain.len();
        let first_paid = self.paid.len();
        let end_plain = first_plain.checked_add(plain).expect("alias row count overflow");
        let end_paid = first_paid.checked_add(paid).expect("alias row count overflow");
        offset(end_plain);
        offset(end_paid);
        self.plain.resize(end_plain, 0);
        self.paid.resize(end_paid, 0);
        (first_plain, first_paid)
    }

    pub fn add_run(&mut self, root: Key, plain_first: usize, plain_len: usize, paid_first: usize, paid_len: usize) {
        debug_assert!(plain_first + plain_len <= self.plain.len());
        debug_assert!(paid_first + paid_len <= self.paid.len());
        self.routes[part_of(root, self.bits)].push(Run {
            root,
            plain_first: offset(plain_first), plain_len: offset(plain_len),
            paid_first: offset(paid_first), paid_len: offset(paid_len),
        });
        self.aliases += 1;
    }

    #[cfg(test)]
    pub fn put_raw(&mut self, root: Key, events: &[u64]) {
        let plain_len = events.iter().filter(|&&v| v as u32 == 0).count();
        let paid_len = events.len() - plain_len;
        let (first_plain, first_paid) = self.reserve_rows(plain_len, paid_len);
        self.add_run(root, first_plain, plain_len, first_paid, paid_len);
        let (mut p, mut q) = (first_plain, first_paid);
        for &value in events {
            if value as u32 == 0 {
                self.plain[p] = (value >> 32) as u32;
                p += 1;
            } else {
                self.paid[q] = value;
                q += 1;
            }
        }
    }

    pub fn work(&self, p: usize) -> usize {
        self.routes[p].iter().map(|r| r.len()).sum()
    }
}
