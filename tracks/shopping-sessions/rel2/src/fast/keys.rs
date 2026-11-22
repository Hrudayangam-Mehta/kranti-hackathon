use std::cmp::Ordering;
use std::sync::{Mutex, OnceLock};

use crate::hash::{new_map, FastMap};

pub const EXOTIC: u64 = 1 << 63;
const SHARD_BITS: u32 = 6;
const SHARDS: usize = 1 << SHARD_BITS;
pub const MAX_PACKED: usize = 10;

const fn code_table() -> [u8; 256] {
    let mut table = [0u8; 256];
    let mut code = 1u8;
    let mut byte = 0usize;
    while byte < 256 {
        let b = byte as u8;
        if b.is_ascii_digit() || b.is_ascii_uppercase() || b == b'_' || b.is_ascii_lowercase() {
            table[byte] = code;
            code += 1;
        }
        byte += 1;
    }
    table
}

const fn char_table() -> [u8; 64] {
    let codes = code_table();
    let mut table = [0u8; 64];
    let mut byte = 0usize;
    while byte < 256 {
        if codes[byte] != 0 {
            table[codes[byte] as usize] = byte as u8;
        }
        byte += 1;
    }
    table
}

pub static CODE: [u8; 256] = code_table();
static CHAR: [u8; 64] = char_table();

#[inline(always)]
pub fn pack(bytes: &[u8]) -> Option<u64> {
    if bytes.len() > MAX_PACKED {
        return None;
    }
    let mut key = 0u64;
    let mut ok = 1u8;
    for (i, &byte) in bytes.iter().enumerate() {
        let code = CODE[byte as usize];
        ok &= (code != 0) as u8;
        key |= u64::from(code) << (54 - 6 * i);
    }
    (ok != 0).then_some(key)
}

#[inline(always)]
pub fn packed_len(key: u64) -> usize {
    if key == 0 {
        0
    } else {
        10 - (key.trailing_zeros() / 6) as usize
    }
}

#[inline(always)]
pub unsafe fn unpack_raw(key: u64, dst: *mut u8) {
    for i in 0..MAX_PACKED {
        *dst.add(i) = CHAR[((key >> (54 - 6 * i)) & 63) as usize];
    }
}

pub fn unpack(key: u64, out: &mut Vec<u8>) {
    let mut shift = 54i32;
    while shift >= 0 {
        let code = (key >> shift) & 63;
        if code == 0 {
            break;
        }
        out.push(CHAR[code as usize]);
        shift -= 6;
    }
}

struct Shard {
    index: FastMap<Box<[u8]>, u32>,
    items: Vec<Box<[u8]>>,
}

fn shards() -> &'static [Mutex<Shard>] {
    static TABLE: OnceLock<Vec<Mutex<Shard>>> = OnceLock::new();
    TABLE.get_or_init(|| {
        (0..SHARDS)
            .map(|_| {
                Mutex::new(Shard {
                    index: new_map(0),
                    items: Vec::new(),
                })
            })
            .collect()
    })
}

fn shard_of(bytes: &[u8]) -> usize {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for &b in bytes {
        h = (h ^ u64::from(b)).wrapping_mul(0x100_0000_01b3);
    }
    (h >> (64 - SHARD_BITS)) as usize
}

#[cold]
#[inline(never)]
pub fn intern_exotic(bytes: &[u8]) -> u64 {
    let s = shard_of(bytes);
    let mut shard = shards()[s].lock().unwrap();
    if let Some(&i) = shard.index.get(bytes) {
        return EXOTIC | (s as u64) << 32 | u64::from(i);
    }
    let i = shard.items.len() as u32;
    let owned: Box<[u8]> = bytes.into();
    shard.items.push(owned.clone());
    shard.index.insert(owned, i);
    EXOTIC | (s as u64) << 32 | u64::from(i)
}

#[cold]
#[inline(never)]
pub fn lookup_exotic(bytes: &[u8]) -> Option<u64> {
    let s = shard_of(bytes);
    let shard = shards()[s].lock().unwrap();
    shard
        .index
        .get(bytes)
        .map(|&i| EXOTIC | (s as u64) << 32 | u64::from(i))
}

#[inline(always)]
pub fn intern(bytes: &[u8]) -> u64 {
    match pack(bytes) {
        Some(key) => key,
        None => intern_exotic(bytes),
    }
}

#[inline(always)]
pub fn lookup(bytes: &[u8]) -> Option<u64> {
    match pack(bytes) {
        Some(key) => Some(key),
        None => lookup_exotic(bytes),
    }
}

pub fn bytes_of(key: u64, out: &mut Vec<u8>) {
    if key & EXOTIC == 0 {
        unpack(key, out);
    } else {
        let s = ((key >> 32) & (SHARDS as u64 - 1)) as usize;
        let shard = shards()[s].lock().unwrap();
        out.extend_from_slice(&shard.items[(key & 0xffff_ffff) as usize]);
    }
}

#[inline]
pub fn cmp(a: u64, b: u64) -> Ordering {
    if (a | b) & EXOTIC == 0 {
        a.cmp(&b)
    } else {
        cmp_slow(a, b)
    }
}

#[cold]
#[inline(never)]
fn cmp_slow(a: u64, b: u64) -> Ordering {
    let mut x = Vec::new();
    let mut y = Vec::new();
    bytes_of(a, &mut x);
    bytes_of(b, &mut y);
    x.cmp(&y)
}

pub fn exotic_count() -> usize {
    shards().iter().map(|s| s.lock().unwrap().items.len()).sum()
}

pub struct SmallMap {
    mask: usize,
    keys: Vec<u64>,
    values: Vec<u32>,
}

impl SmallMap {
    pub fn new(entries: &[(u64, u32)]) -> SmallMap {
        let size = (entries.len() * 2).next_power_of_two().max(16);
        let mut map = SmallMap {
            mask: size - 1,
            keys: vec![u64::MAX; size],
            values: vec![0; size],
        };
        for &(key, value) in entries {
            let mut slot = map.slot(key);
            while map.keys[slot] != u64::MAX && map.keys[slot] != key {
                slot = (slot + 1) & map.mask;
            }
            if map.keys[slot] == u64::MAX {
                map.keys[slot] = key;
                map.values[slot] = value;
            }
        }
        map
    }

    #[inline(always)]
    fn slot(&self, key: u64) -> usize {
        (key.wrapping_mul(0x9e37_79b9_7f4a_7c15) >> 32) as usize & self.mask
    }

    #[inline(always)]
    pub fn get(&self, key: u64) -> Option<u32> {
        let mut slot = self.slot(key);
        loop {
            let k = self.keys[slot];
            if k == key {
                return Some(self.values[slot]);
            }
            if k == u64::MAX {
                return None;
            }
            slot = (slot + 1) & self.mask;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip(bytes: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        bytes_of(intern(bytes), &mut out);
        out
    }

    #[test]
    fn order_and_roundtrip() {
        let samples: Vec<&[u8]> = vec![
            b"", b"0", b"9", b"A", b"Z", b"_", b"a", b"z", b"u1", b"U1", b"u10", b"u1 ", b" u1", b"u1\r",
            b"abcdefghij", b"abcdefghijk", b"zzzzzzzzzz", b"zzzzzzzzzzz", b"c_123", b"C_123", b"a-b", b"\xc3\xa9",
            b"u", b"u0", b"uz", b"t", b"\x00", b"\xff", b"user_id_a", b"\"", b"e3\r",
        ];
        for a in &samples {
            assert_eq!(&roundtrip(a), a);
            for b in &samples {
                assert_eq!(cmp(intern(a), intern(b)), a.cmp(b), "{a:?} {b:?}");
                assert_eq!(intern(a) == intern(b), a == b);
            }
        }
        assert_eq!(pack(b""), Some(0));
        assert!(pack(b"abcdefghij").unwrap() & EXOTIC == 0);
        assert!(intern(b"abcdefghijk") & EXOTIC != 0);
        assert_eq!(lookup(b"never seen anywhere"), None);
        assert_eq!(lookup(b"a-b"), Some(intern(b"a-b")));
    }

    #[test]
    fn random_order() {
        let mut state = 12345u64;
        let mut next = || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        let alphabet = b"09AZ_az ";
        let mut strings = Vec::new();
        for _ in 0..3000 {
            let len = (next() % 13) as usize;
            let s: Vec<u8> = (0..len).map(|_| alphabet[(next() % alphabet.len() as u64) as usize]).collect();
            strings.push(s);
        }
        for pair in strings.windows(2) {
            let (a, b) = (&pair[0], &pair[1]);
            assert_eq!(cmp(intern(a), intern(b)), a.cmp(b));
            assert_eq!(roundtrip(a), *a);
        }
    }

    #[test]
    fn raw_unpack_matches() {
        let mut state = 777u64;
        let mut next = || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        let alphabet = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
        for _ in 0..20000 {
            let len = (next() % 11) as usize;
            let s: Vec<u8> = (0..len).map(|_| alphabet[(next() % alphabet.len() as u64) as usize]).collect();
            let key = pack(&s).unwrap();
            assert_eq!(packed_len(key), s.len());
            let mut buf = [0xaau8; 16];
            unsafe { unpack_raw(key, buf.as_mut_ptr()) };
            assert_eq!(&buf[..len], &s[..]);
        }
    }

    #[test]
    fn small_map() {
        let map = SmallMap::new(&[(intern(b"c_1"), 0), (intern(b"c_2"), 1), (intern(b"c_1"), 7)]);
        assert_eq!(map.get(intern(b"c_1")), Some(0));
        assert_eq!(map.get(intern(b"c_2")), Some(1));
        assert_eq!(map.get(intern(b"C_1")), None);
    }
}
