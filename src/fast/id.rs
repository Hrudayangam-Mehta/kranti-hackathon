use std::cmp::Ordering;

use super::keys;
use crate::csv;

pub const ODD: u64 = u64::MAX;
pub const SHORT_MAX: usize = 11;
pub const LONG_LEN: usize = 32;

const fn powers() -> [u64; 13] {
    let mut out = [1u64; 13];
    let mut i = 1;
    while i < 13 {
        out[i] = out[i - 1] * 36;
        i += 1;
    }
    out
}

pub const POW36: [u64; 13] = powers();

const fn digit_values() -> [u8; 256] {
    let mut table = [0xffu8; 256];
    let mut b = 0usize;
    while b < 256 {
        let c = b as u8;
        if c.is_ascii_digit() {
            table[b] = c - b'0';
        } else if c.is_ascii_lowercase() {
            table[b] = c - b'a' + 10;
        }
        b += 1;
    }
    table
}

static DIGIT: [u8; 256] = digit_values();
static CHARS: &[u8; 36] = b"0123456789abcdefghijklmnopqrstuvwxyz";

const fn pair_chars() -> [[u8; 2]; 1296] {
    let mut out = [[0u8; 2]; 1296];
    let mut i = 0;
    while i < 1296 {
        out[i] = [CHARS_C[i / 36], CHARS_C[i % 36]];
        i += 1;
    }
    out
}

const CHARS_C: [u8; 36] = *b"0123456789abcdefghijklmnopqrstuvwxyz";
static PAIRS: [[u8; 2]; 1296] = pair_chars();

#[derive(Clone, Copy, PartialEq, Eq, Default, Debug)]
#[repr(C)]
pub struct Key {
    pub hi: u64,
    pub lo: u64,
}

impl Key {
    #[inline(always)]
    pub fn hash(self) -> u64 {
        (self.lo ^ self.hi.wrapping_mul(0xc2b2_ae3d_27d4_eb4f)).wrapping_mul(0x9e37_79b9_7f4a_7c15)
    }

}

#[inline(always)]
pub fn short_scalar(rest: &[u8]) -> Option<u64> {
    let n = rest.len();
    if n == 0 || n > SHORT_MAX {
        return None;
    }
    let mut rank = 0u64;
    let mut bad = 0u8;
    for (i, &b) in rest.iter().enumerate() {
        let d = DIGIT[b as usize];
        bad |= d;
        rank += u64::from(d & 63) * POW36[11 - i];
    }
    (bad & 0xc0 == 0).then_some(rank + n as u64)
}

#[inline(always)]
pub fn long_scalar(rest: &[u8]) -> Option<(u64, u64)> {
    if rest.len() != LONG_LEN {
        return None;
    }
    let mut words = [0u64; 2];
    let mut bad = 0u8;
    for (i, &b) in rest.iter().enumerate() {
        let d = DIGIT[b as usize];
        bad |= d | (d >> 4).wrapping_mul(0x40);
        words[i / 16] = words[i / 16] << 4 | u64::from(d & 15);
    }
    (bad & 0xc0 == 0).then_some((words[0], words[1]))
}

#[inline(always)]
pub fn short_rank(lo: u64) -> u64 {
    lo - lo % 36
}

#[inline(always)]
pub fn short_len(lo: u64) -> usize {
    (lo % 36) as usize
}

fn long_rank12(hi: u64) -> u64 {
    let mut rank = 0u64;
    for i in 0..12 {
        rank += ((hi >> (60 - 4 * i)) & 15) * POW36[11 - i];
    }
    rank
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Domain {
    pub prefix: u8,
    pub plen: usize,
}

impl Domain {
    pub const fn bare() -> Domain {
        Domain { prefix: 0, plen: 0 }
    }

    pub const fn with_prefix(prefix: u8) -> Domain {
        Domain { prefix, plen: 1 }
    }

    #[cfg(test)]
    pub fn exact(&self, bytes: &[u8]) -> Option<Key> {
        if self.plen == 1 && bytes.first() != Some(&self.prefix) {
            return None;
        }
        let rest = &bytes[self.plen.min(bytes.len())..];
        if rest.len() == LONG_LEN {
            let (hi, lo) = long_scalar(rest)?;
            return (hi != 0 && hi != ODD).then_some(Key { hi, lo });
        }
        short_scalar(rest).map(|lo| Key { hi: 0, lo })
    }

    #[cold]
    #[inline(never)]
    pub fn odd(&self, bytes: &[u8]) -> Key {
        Key {
            hi: ODD,
            lo: keys::intern_exotic(bytes),
        }
    }

    #[cfg(test)]
    pub fn encode(&self, bytes: &[u8]) -> Key {
        match self.exact(bytes) {
            Some(key) => key,
            None => self.odd(bytes),
        }
    }

    #[cfg(test)]
    pub fn lookup(&self, bytes: &[u8]) -> Option<Key> {
        match self.exact(bytes) {
            Some(key) => Some(key),
            None => keys::lookup_exotic(bytes).map(|lo| Key { hi: ODD, lo }),
        }
    }

    pub fn bytes_of(&self, key: Key, out: &mut Vec<u8>) {
        if key.hi == ODD {
            keys::bytes_of(key.lo, out);
            return;
        }
        if self.plen == 1 {
            out.push(self.prefix);
        }
        if key.hi == 0 {
            let n = short_len(key.lo);
            let rank = short_rank(key.lo);
            let top = rank / POW36[8];
            let mid = (rank / POW36[4]) % POW36[4];
            let low = rank % POW36[4];
            let mut buf = [0u8; 12];
            for (k, q) in [top, mid, low].into_iter().enumerate() {
                let a = PAIRS[(q / 1296) as usize];
                let b = PAIRS[(q % 1296) as usize];
                buf[4 * k..4 * k + 4].copy_from_slice(&[a[0], a[1], b[0], b[1]]);
            }
            out.extend_from_slice(&buf[..n]);
        } else {
            for word in [key.hi, key.lo] {
                for i in 0..16 {
                    out.push(CHARS[((word >> (60 - 4 * i)) & 15) as usize]);
                }
            }
        }
    }

    #[inline]
    pub fn cmp(&self, a: Key, b: Key) -> Ordering {
        if a.hi == 0 && b.hi == 0 {
            return a.lo.cmp(&b.lo);
        }
        self.cmp_wide(a, b)
    }

    #[cold]
    #[inline(never)]
    fn cmp_wide(&self, a: Key, b: Key) -> Ordering {
        if a.hi == ODD || b.hi == ODD {
            let mut x = Vec::new();
            let mut y = Vec::new();
            self.bytes_of(a, &mut x);
            self.bytes_of(b, &mut y);
            return x.cmp(&y);
        }
        match (a.hi == 0, b.hi == 0) {
            (false, false) => (a.hi, a.lo).cmp(&(b.hi, b.lo)),
            (true, false) => {
                if short_rank(a.lo) <= long_rank12(b.hi) {
                    Ordering::Less
                } else {
                    Ordering::Greater
                }
            }
            (false, true) => {
                if short_rank(b.lo) <= long_rank12(a.hi) {
                    Ordering::Greater
                } else {
                    Ordering::Less
                }
            }
            (true, true) => a.lo.cmp(&b.lo),
        }
    }
}

pub fn detect<const N: usize>(files: &[&[u8]], columns: &[usize]) -> Domain {
    let mut counts = [0u32; 256];
    let mut total = 0u32;
    let mut lines = 0usize;
    for file in files.iter().filter(|f| !f.is_empty()).take(64) {
        for line in csv::rows(file).take(32) {
            lines += 1;
            if let Some(fields) = csv::fields::<N>(line) {
                for &c in columns {
                    if let Some(&b) = fields[c].first() {
                        counts[b as usize] += 1;
                        total += 1;
                    }
                }
            }
            if lines >= 128 {
                break;
            }
        }
        if lines >= 128 {
            break;
        }
    }
    let (best, count) = counts.iter().enumerate().max_by_key(|&(b, &c)| (c, usize::MAX - b)).unwrap();
    let prefixed = Domain::with_prefix(best as u8);
    if total > 0 && count * 2 >= total {
        prefixed
    } else {
        Domain::bare()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn domains() -> Vec<Domain> {
        vec![Domain::with_prefix(b'u'), Domain::bare(), Domain::with_prefix(b'k'), Domain::with_prefix(b'"')]
    }

    fn roundtrip(d: &Domain, s: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        d.bytes_of(d.encode(s), &mut out);
        out
    }

    fn samples() -> Vec<Vec<u8>> {
        let mut out: Vec<Vec<u8>> = Vec::new();
        let fixed: Vec<&[u8]> = vec![
            b"", b"u", b"u0", b"u00", b"u000", b"u1", b"u01", b"u10", b"u100", b"uz", b"uzz", b"u0z", b"uz0",
            b"U1", b"u1 ", b" u1", b"u\"1", b"u-1", b"u_1", b"uA", b"u1\r", b"x1", b"k1", b"e1", b"0", b"00", b"1",
            b"zzzzzzzzzzz", b"zzzzzzzzzzzz", b"u00000000000", b"u0000000000", b"uzzzzzzzzzzz", b"uzzzzzzzzzz",
            b"u62wbf0hq", b"u846whf46", b"uutm24zu", b"u02423c3d84ab053af78764ce49f23b5c",
            b"u02423c3d84ab053af78764ce49f23b5", b"u02423c3d84ab053af78764ce49f23b5c0",
            b"u00000000000000000000000000000000", b"u0000000000000000ffffffffffffffff",
            b"u0000000000000001ffffffffffffffff", b"uffffffffffffffff0000000000000000",
            b"ufffffffffffffffe0000000000000000", b"uFFFFFFFFFFFFFFFE0000000000000000",
            b"u02423C3D84AB053AF78764CE49F23B5C", b"u02423c3d84ab053af78764ce49f23b5g",
            b"u0242", b"u02423c3d84a", b"u02423c3d84b", b"u02423c3d84", b"u02423c3d84ab", b"u02423c3d84ab0",
            b"u02423c3d84ab053af78764ce49f23b5cu", b"\xc3\xa9", b"u\xff", b"\x00", b"uaaaaaaaaaaa",
            b"02423c3d84ab053af78764ce49f23b5c", b"12423c3d84ab053af78764ce49f23b5c",
        ];
        for s in fixed {
            out.push(s.to_vec());
        }
        let mut state = 0x9e37_79b9_7f4a_7c15u64;
        let mut next = move || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        let alpha = b"0123456789abcdefghijklmnopqrstuvwxyzA _\"";
        for i in 0..6000 {
            let mut s = Vec::new();
            if next() % 8 != 0 {
                s.push(if next() % 6 == 0 { b'x' } else { b'u' });
            }
            let (len, set): (usize, &[u8]) = match i % 4 {
                0 => ((next() % 13) as usize, &alpha[..36]),
                1 => (31 + (next() % 3) as usize, &alpha[..16]),
                2 => ((next() % 14) as usize, &alpha[..]),
                _ => (32, if next() % 5 == 0 { &alpha[..] } else { &alpha[..16] }),
            };
            for _ in 0..len {
                let r = next();
                let c = if r % 5 == 0 { set[0] } else { set[(r >> 8) as usize % set.len()] };
                s.push(c);
            }
            out.push(s.clone());
            if !s.is_empty() && next() % 3 == 0 {
                let mut t = s.clone();
                t.truncate((next() as usize) % s.len());
                out.push(t);
                let mut t = s.clone();
                let at = (next() as usize) % s.len();
                t[at] = alpha[(next() as usize) % 36];
                out.push(t);
            }
        }
        out
    }

    #[test]
    fn exact_order_and_roundtrip() {
        let all = samples();
        for d in domains() {
            let keys: Vec<Key> = all.iter().map(|s| d.encode(s)).collect();
            for (s, k) in all.iter().zip(&keys) {
                assert_eq!(&roundtrip(&d, s), s, "{d:?} {:?}", String::from_utf8_lossy(s));
                assert!(*k != Key::default());
                assert_eq!(d.lookup(s), Some(*k));
            }
            for i in 0..all.len() {
                let j = (i * 7919 + 13) % all.len();
                for (x, y) in [(i, j), (i, (i + 1) % all.len())] {
                    let (a, b) = (&all[x], &all[y]);
                    assert_eq!(d.cmp(keys[x], keys[y]), a.cmp(b), "{d:?} {:?} {:?}", String::from_utf8_lossy(a), String::from_utf8_lossy(b));
                    assert_eq!(keys[x] == keys[y], a == b);
                }
            }
            let n = 400.min(all.len());
            for x in 0..n {
                for y in 0..n {
                    assert_eq!(d.cmp(keys[x], keys[y]), all[x].cmp(&all[y]));
                    assert_eq!(keys[x] == keys[y], all[x] == all[y]);
                }
            }
            let mut order: Vec<usize> = (0..all.len()).collect();
            order.sort_by(|&x, &y| d.cmp(keys[x], keys[y]));
            for w in order.windows(2) {
                assert!(all[w[0]] <= all[w[1]]);
            }
        }
    }

    #[test]
    fn classes() {
        let d = Domain::with_prefix(b'u');
        assert_eq!(d.exact(b"u0"), Some(Key { hi: 0, lo: 1 }));
        assert_eq!(d.exact(b"u1"), Some(Key { hi: 0, lo: POW36[11] + 1 }));
        assert!(d.exact(b"u").is_none());
        assert!(d.exact(b"x1").is_none());
        assert!(d.exact(b"u000000000000").is_none());
        assert!(d.exact(b"u00000000000").is_some());
        assert!(d.exact(b"u0000000000000000ffffffffffffffff").is_none());
        assert!(d.exact(b"uffffffffffffffff0000000000000000").is_none());
        assert!(d.exact(b"ufffffffffffffffe0000000000000000").is_some());
        assert_eq!(
            d.exact(b"u0123456789abcdef0123456789abcdef"),
            Some(Key { hi: 0x0123_4567_89ab_cdef, lo: 0x0123_4567_89ab_cdef })
        );
        assert!(d.exact(b"u0123456789abcdef0123456789abcdeF").is_none());
        assert!(d.exact(b"u0123456789abcdef0123456789abcdeg").is_none());
        let bare = Domain::bare();
        assert!(bare.exact(b"").is_none());
        assert!(bare.exact(b"abc").is_some());
    }

    #[test]
    fn detection() {
        let mut file = b"event_id,user_id\n".to_vec();
        for i in 0..300 {
            file.extend_from_slice(format!("e{i},u{i}\n").as_bytes());
        }
        assert_eq!(detect::<2>(&[&file], &[0]), Domain::with_prefix(b'e'));
        assert_eq!(detect::<2>(&[&file], &[1]), Domain::with_prefix(b'u'));
        assert_eq!(detect::<2>(&[&file], &[0, 1]), Domain::with_prefix(b'e'));
        let empty: Vec<&[u8]> = vec![b"a,b\n"];
        assert_eq!(detect::<2>(&empty, &[0]), Domain::bare());
    }
}
