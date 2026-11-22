use std::cmp::Ordering;

use super::keys;
use crate::csv;

pub const ODD: u64 = u64::MAX;
// hi=0 stores the original zero-free suffix, right-zero-padded, big-endian.
// The full 64-bit low word is significant; no narrow person/event codec applies.
pub const RAW_MAX: usize = 8;
pub const EXTENDED_SHORT: u64 = u64::MAX - 1;
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
    if n <= RAW_MAX {
        if rest.contains(&0) {
            return None;
        }
        let mut bytes = [0u8; RAW_MAX];
        bytes[..n].copy_from_slice(rest);
        return Some(u64::from_be_bytes(bytes));
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
pub fn short_key(lo: u64, len: usize) -> Key {
    Key { hi: if len <= RAW_MAX { 0 } else { EXTENDED_SHORT }, lo }
}

#[inline(always)]
pub fn reserved_high(hi: u64) -> bool {
    hi == 0 || hi == EXTENDED_SHORT || hi == ODD
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
fn extended_rank(lo: u64) -> u64 {
    lo - lo % 36
}

#[inline(always)]
pub fn short_len(lo: u64) -> usize {
    // Every real byte is nonzero. The final real byte can have at most seven
    // trailing zero bits, so division by eight counts only padding bytes.
    RAW_MAX - (lo.trailing_zeros() / 8) as usize
}

#[inline]
fn extended_prefix8(lo: u64) -> u64 {
    let rank = extended_rank(lo) / POW36[4];
    let mut bytes = [0u8; RAW_MAX];
    for (k, quad) in [rank / POW36[4], rank % POW36[4]].into_iter().enumerate() {
        let a = PAIRS[(quad / 1296) as usize];
        let b = PAIRS[(quad % 1296) as usize];
        bytes[4 * k..4 * k + 4].copy_from_slice(&[a[0], a[1], b[0], b[1]]);
    }
    u64::from_be_bytes(bytes)
}

#[inline]
fn hex_prefix8(hi: u64) -> u64 {
    let mut bytes = [0u8; RAW_MAX];
    for (i, byte) in bytes.iter_mut().enumerate() {
        *byte = CHARS[((hi >> (60 - 4 * i)) & 15) as usize];
    }
    u64::from_be_bytes(bytes)
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
        if self.plen == 1 && (self.prefix == 0 || bytes.first() != Some(&self.prefix)) {
            return None;
        }
        let rest = &bytes[self.plen.min(bytes.len())..];
        if rest.len() == LONG_LEN {
            let (hi, lo) = long_scalar(rest)?;
            return (!reserved_high(hi)).then_some(Key { hi, lo });
        }
        short_scalar(rest).map(|lo| short_key(lo, rest.len()))
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
            out.extend_from_slice(&key.lo.to_be_bytes()[..n]);
        } else if key.hi == EXTENDED_SHORT {
            let n = (key.lo % 36) as usize;
            let rank = extended_rank(key.lo);
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
        match (a.hi, b.hi) {
            (0, 0) | (EXTENDED_SHORT, EXTENDED_SHORT) => a.lo.cmp(&b.lo),
            (0, EXTENDED_SHORT) => {
                if a.lo <= extended_prefix8(b.lo) {
                    Ordering::Less
                } else {
                    Ordering::Greater
                }
            }
            (EXTENDED_SHORT, 0) => {
                if b.lo <= extended_prefix8(a.lo) {
                    Ordering::Greater
                } else {
                    Ordering::Less
                }
            }
            (0, _) => {
                if a.lo <= hex_prefix8(b.hi) { Ordering::Less } else { Ordering::Greater }
            }
            (_, 0) => {
                if b.lo <= hex_prefix8(a.hi) { Ordering::Greater } else { Ordering::Less }
            }
            (EXTENDED_SHORT, _) => {
                if extended_rank(a.lo) <= long_rank12(b.hi) { Ordering::Less } else { Ordering::Greater }
            }
            (_, EXTENDED_SHORT) => {
                if extended_rank(b.lo) <= long_rank12(a.hi) { Ordering::Greater } else { Ordering::Less }
            }
            _ => (a.hi, a.lo).cmp(&(b.hi, b.lo)),
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
        assert_eq!(d.exact(b"u0"), Some(Key { hi: 0, lo: u64::from_be_bytes(*b"0\0\0\0\0\0\0\0") }));
        assert_eq!(d.exact(b"u1"), Some(Key { hi: 0, lo: u64::from_be_bytes(*b"1\0\0\0\0\0\0\0") }));
        assert!(d.exact(b"u").is_none());
        assert!(d.exact(b"x1").is_none());
        assert!(d.exact(b"u000000000000").is_none());
        assert!(d.exact(b"u00000000000").is_some());
        assert!(d.exact(b"u0000000000000000ffffffffffffffff").is_none());
        assert!(d.exact(b"uffffffffffffffff0000000000000000").is_none());
        assert!(d.exact(b"ufffffffffffffffe0000000000000000").is_none());
        assert!(d.exact(b"ufffffffffffffffd0000000000000000").is_some());
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
    fn raw8_exhaustive_two_byte_order_and_prefix_roundtrip() {
        let domain = Domain::bare();
        let mut previous = 0u64;
        for first in 1..=u8::MAX {
            let one = [first];
            let key = domain.exact(&one).unwrap();
            assert_eq!(key.hi, 0);
            assert!(key.lo > previous);
            assert_eq!(short_len(key.lo), 1);
            assert_eq!(roundtrip(&domain, &one), one);
            previous = key.lo;
            for second in 1..=u8::MAX {
                let pair = [first, second];
                let key = domain.exact(&pair).unwrap();
                assert_eq!(key.hi, 0);
                assert!(key.lo > previous);
                assert_eq!(short_len(key.lo), 2);
                assert_eq!(roundtrip(&domain, &pair), pair);
                previous = key.lo;
            }
        }
        for len in 1..=RAW_MAX {
            for position in 0..len {
                for byte in 0..=u8::MAX {
                    let mut text = vec![0x80; len];
                    text[position] = byte;
                    let key = domain.exact(&text);
                    assert_eq!(key.is_some(), byte != 0);
                    if let Some(key) = key {
                        assert_eq!(key.hi, 0);
                        assert_ne!(key, Key::default());
                        assert_eq!(short_len(key.lo), len);
                        assert_eq!(roundtrip(&domain, &text), text);
                    }
                }
            }
        }
    }

    #[test]
    fn raw8_nul_and_reserved_tags_use_exact_fallback() {
        for domain in [Domain::bare(), Domain::with_prefix(b'u'), Domain::with_prefix(0)] {
            for suffix in [b"".as_slice(), b"\0", b"x\0", b"\0x", b"ab\0defgh", b"012345678\0"] {
                let mut text = Vec::new();
                if domain.plen == 1 { text.push(domain.prefix); }
                text.extend_from_slice(suffix);
                assert!(domain.exact(&text).is_none());
                assert_eq!(domain.encode(&text).hi, ODD);
                assert_eq!(roundtrip(&domain, &text), text);
            }
            if domain.plen == 1 && domain.prefix == 0 {
                for suffix in [b"abc".as_slice(), b"012345678", b"0123456789abcdef0123456789abcdef"] {
                    let mut text = vec![0];
                    text.extend_from_slice(suffix);
                    assert!(domain.exact(&text).is_none());
                    assert_eq!(roundtrip(&domain, &text), text);
                }
            }
        }
        let domain = Domain::with_prefix(b'u');
        for hi in [0, EXTENDED_SHORT, ODD] {
            for lo in [0, 1, u64::MAX] {
                let text = format!("u{hi:016x}{lo:016x}");
                assert!(domain.exact(text.as_bytes()).is_none());
                assert_eq!(domain.encode(text.as_bytes()).hi, ODD);
                assert_eq!(roundtrip(&domain, text.as_bytes()), text.as_bytes());
            }
        }
        for len in 1..=SHORT_MAX {
            let mut text = vec![b'u'];
            text.extend(std::iter::repeat_n(b'0', len));
            let key = domain.exact(&text).unwrap();
            assert_eq!(key.hi, if len <= RAW_MAX { 0 } else { EXTENDED_SHORT });
            assert_eq!(roundtrip(&domain, &text), text);
        }
    }

    #[test]
    fn raw8_mixed_prefix_comparisons_match_original_bytes() {
        for domain in [Domain::bare(), Domain::with_prefix(b'u')] {
            let check = |left: &[u8], right: &[u8]| {
                let mut a = Vec::new();
                let mut b = Vec::new();
                if domain.plen == 1 { a.push(domain.prefix); b.push(domain.prefix); }
                a.extend_from_slice(left);
                b.extend_from_slice(right);
                let ka = domain.encode(&a);
                let kb = domain.encode(&b);
                assert_eq!(domain.cmp(ka, kb), a.cmp(&b), "{a:?} {b:?}");
                assert_eq!(domain.cmp(kb, ka), b.cmp(&a), "{b:?} {a:?}");
                assert_eq!(ka == kb, a == b);
            };
            for len in 1..=RAW_MAX {
                for position in 0..len {
                    for byte in 1..=u8::MAX {
                        let mut raw = vec![b'0'; len];
                        raw[position] = byte;
                        for digit in [b'0', b'9', b'a', b'f', b'z'] {
                            for extended_len in 9..=SHORT_MAX {
                                let mut extended = vec![b'0'; extended_len];
                                extended[position] = digit;
                                extended[extended_len - 1] = b'1';
                                check(&raw, &extended);
                            }
                            if digit <= b'f' {
                                let mut hex = [b'0'; LONG_LEN];
                                hex[position] = digit;
                                hex[15] = b'1';
                                hex[31] = b'f';
                                check(&raw, &hex);
                            }
                        }
                    }
                }
            }
            for (a, b) in [
                (b"zzzzzzzz".as_slice(), b"zzzzzzzzz".as_slice()),
                (b"00000001", b"000000001"),
                (b"01234567", b"01234567000"),
                (b"\xff\xff\xff\xff\xff\xff\xff\xff", b"fffffffffffffffd0000000000000000"),
                (b"abc", b"abc\0"),
            ] {
                check(a, b);
            }
        }
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
