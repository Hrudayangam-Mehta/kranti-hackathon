use std::cmp::Ordering;

pub const EX: u64 = 1 << 63;
pub const LNK: u64 = 1 << 62;
pub const MAX_PACKED: usize = 10;
const LOW62: u64 = (1 << 62) - 1;
const PTR_MASK: u64 = (1 << 48) - 1;
const LEN_CAP: u64 = (1 << 14) - 1;
const K0: u64 = 0xa076_1d64_78bd_642f;
const K1: u64 = 0xe703_7ed1_a0b4_28db;
const K2: u64 = 0x8ebc_6af0_9c88_c6e3;

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

fn unpack(key: u64, out: &mut [u8; MAX_PACKED]) -> usize {
    let mut shift = 54i32;
    let mut n = 0;
    while shift >= 0 {
        let code = (key >> shift) & 63;
        if code == 0 {
            break;
        }
        out[n] = CHAR[code as usize];
        n += 1;
        shift -= 6;
    }
    n
}

#[inline(always)]
fn mum(a: u64, b: u64) -> u64 {
    let r = u128::from(a) * u128::from(b);
    (r as u64) ^ ((r >> 64) as u64)
}

#[inline(always)]
unsafe fn word(p: *const u8) -> u64 {
    (p as *const u64).read_unaligned()
}

#[inline(always)]
pub fn hash(bytes: &[u8]) -> u64 {
    hash_full(bytes) & 0xff
}

#[inline(always)]
fn hash_full(bytes: &[u8]) -> u64 {
    let n = bytes.len();
    let p = bytes.as_ptr();
    let mut seed = K0 ^ (n as u64).wrapping_mul(K2);
    let (a, b);
    unsafe {
        if n <= 16 {
            if n >= 8 {
                a = word(p);
                b = word(p.add(n - 8));
            } else if n >= 4 {
                a = u64::from((p as *const u32).read_unaligned());
                b = u64::from((p.add(n - 4) as *const u32).read_unaligned());
            } else if n > 0 {
                a = u64::from(*p) << 16 | u64::from(*p.add(n >> 1)) << 8 | u64::from(*p.add(n - 1));
                b = 0;
            } else {
                a = 0;
                b = 0;
            }
        } else {
            let mut i = 0;
            while i + 16 < n {
                seed = mum(word(p.add(i)) ^ K1, word(p.add(i + 8)) ^ seed);
                i += 16;
            }
            a = word(p.add(n - 16));
            b = word(p.add(n - 8));
        }
    }
    mum(K1 ^ n as u64, mum(a ^ K1, b ^ seed))
}

#[inline(always)]
pub fn ex_key(bytes: &[u8]) -> u64 {
    EX | (hash(bytes) & LOW62)
}

#[inline(always)]
pub fn make_ref(bytes: &[u8]) -> u64 {
    let p = bytes.as_ptr() as u64;
    if (bytes.len() as u64) < LEN_CAP && p >> 48 == 0 {
        p | (bytes.len() as u64) << 48
    } else {
        long_ref(bytes)
    }
}

#[cold]
#[inline(never)]
fn long_ref(bytes: &[u8]) -> u64 {
    let mut copy: Vec<u8> = Vec::with_capacity(bytes.len() + 8);
    copy.extend_from_slice(&(bytes.len() as u64).to_le_bytes());
    copy.extend_from_slice(bytes);
    let leaked: &'static mut [u8] = copy.leak();
    (leaked.as_ptr() as u64 + 8) | LEN_CAP << 48
}

#[inline(always)]
pub fn ref_ptr(r: u64) -> *const u8 {
    (r & PTR_MASK) as *const u8
}

#[inline(always)]
pub fn ref_bytes(r: u64) -> &'static [u8] {
    let p = ref_ptr(r);
    let len = (r >> 48) & LEN_CAP;
    if len == LEN_CAP {
        return long_bytes(p);
    }
    unsafe { std::slice::from_raw_parts(p, len as usize) }
}

#[cold]
#[inline(never)]
fn long_bytes(p: *const u8) -> &'static [u8] {
    unsafe {
        let len = (p.sub(8) as *const u64).read_unaligned() as usize;
        std::slice::from_raw_parts(p, len)
    }
}

#[inline(always)]
pub fn same_ref(a: u64, b: u64) -> bool {
    (a & !(EX | LNK)) == (b & !(EX | LNK)) || ref_bytes(a) == ref_bytes(b)
}

#[inline(always)]
pub fn id_of(bytes: &[u8]) -> u64 {
    match pack(bytes) {
        Some(key) => key,
        None => EX | make_ref(bytes),
    }
}

#[inline(always)]
pub fn key_of_id(id: u64) -> u64 {
    if id & EX == 0 {
        id
    } else {
        ex_key(ref_bytes(id))
    }
}

pub fn id_bytes(id: u64, out: &mut Vec<u8>) {
    if id & EX == 0 {
        let mut buf = [0u8; MAX_PACKED];
        let n = unpack(id, &mut buf);
        out.extend_from_slice(&buf[..n]);
    } else {
        out.extend_from_slice(ref_bytes(id));
    }
}

#[inline]
pub fn cmp_ids(a: u64, b: u64) -> Ordering {
    if (a | b) & EX == 0 {
        a.cmp(&b)
    } else {
        cmp_slow(a, b)
    }
}

#[cold]
#[inline(never)]
fn cmp_slow(a: u64, b: u64) -> Ordering {
    let (mut x, mut y) = ([0u8; MAX_PACKED], [0u8; MAX_PACKED]);
    let sa: &[u8] = if a & EX == 0 {
        let n = unpack(a, &mut x);
        &x[..n]
    } else {
        ref_bytes(a)
    };
    let sb: &[u8] = if b & EX == 0 {
        let n = unpack(b, &mut y);
        &y[..n]
    } else {
        ref_bytes(b)
    };
    sa.cmp(sb)
}

pub struct IdMap {
    mask: usize,
    keys: Vec<u64>,
    ids: Vec<u64>,
    values: Vec<u32>,
}

impl IdMap {
    pub fn new(entries: &[(&'static [u8], u32)]) -> IdMap {
        let size = (entries.len() * 2).next_power_of_two().max(16);
        let mut map = IdMap {
            mask: size - 1,
            keys: vec![u64::MAX; size],
            ids: vec![0; size],
            values: vec![0; size],
        };
        for &(bytes, value) in entries {
            let id = id_of(bytes);
            let key = key_of_id(id);
            let mut slot = map.slot(key);
            loop {
                let k = map.keys[slot];
                if k == u64::MAX {
                    map.keys[slot] = key;
                    map.ids[slot] = id;
                    map.values[slot] = value;
                    break;
                }
                if k == key && (key & EX == 0 || same_ref(map.ids[slot], id)) {
                    break;
                }
                slot = (slot + 1) & map.mask;
            }
        }
        map
    }

    #[inline(always)]
    fn slot(&self, key: u64) -> usize {
        (key.wrapping_mul(0x9e37_79b9_7f4a_7c15) >> 32) as usize & self.mask
    }

    #[inline(always)]
    pub fn get_packed(&self, key: u64) -> Option<u32> {
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

    #[cold]
    #[inline(never)]
    pub fn get_bytes(&self, bytes: &[u8]) -> Option<u32> {
        if let Some(key) = pack(bytes) {
            return self.get_packed(key);
        }
        let key = ex_key(bytes);
        let mut slot = self.slot(key);
        loop {
            let k = self.keys[slot];
            if k == key && ref_bytes(self.ids[slot]) == bytes {
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

    fn leak(bytes: &[u8]) -> &'static [u8] {
        bytes.to_vec().leak()
    }

    fn roundtrip(bytes: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        id_bytes(id_of(leak(bytes)), &mut out);
        out
    }

    #[test]
    fn order_and_roundtrip() {
        let samples: Vec<&[u8]> = vec![
            b"", b"0", b"9", b"A", b"Z", b"_", b"a", b"z", b"u1", b"U1", b"u10", b"u1 ", b" u1", b"u1\r",
            b"abcdefghij", b"abcdefghijk", b"zzzzzzzzzz", b"zzzzzzzzzzz", b"c_123", b"C_123", b"a-b", b"\xc3\xa9",
            b"u", b"u0", b"uz", b"t", b"\x00", b"\xff", b"user_id_a", b"\"", b"e3\r",
            b"ua73fd0bf12efc90bf96d5d32db51ae44", b"ua73fd0bf12efc90bf96d5d32db51ae45", b"ua73fd0bf12efc90bf96d5d32db51ae4",
        ];
        let ids: Vec<u64> = samples.iter().map(|s| id_of(leak(s))).collect();
        for (i, a) in samples.iter().enumerate() {
            assert_eq!(&roundtrip(a), a);
            for (j, b) in samples.iter().enumerate() {
                assert_eq!(cmp_ids(ids[i], ids[j]), a.cmp(b), "{a:?} {b:?}");
                let ka = key_of_id(ids[i]);
                let kb = key_of_id(ids[j]);
                if a == b {
                    assert_eq!(ka, kb);
                }
                if ka & EX == 0 && kb & EX == 0 {
                    assert_eq!(ka == kb, a == b);
                }
            }
        }
        assert_eq!(pack(b""), Some(0));
        assert!(pack(b"abcdefghij").unwrap() & EX == 0);
        assert!(id_of(leak(b"abcdefghijk")) & EX != 0);
    }

    #[test]
    fn long_refs() {
        let big: Vec<u8> = (0..40_000u32).map(|i| b'a' + (i % 26) as u8).collect();
        let big: &'static [u8] = big.leak();
        let r = make_ref(big);
        assert_eq!(ref_bytes(r), big);
        let id = id_of(big);
        assert_eq!(ref_bytes(id), big);
        let mut out = Vec::new();
        id_bytes(id, &mut out);
        assert_eq!(out, big);
        let other: &'static [u8] = big.to_vec().leak();
        assert!(same_ref(id, id_of(other)));
        assert_eq!(key_of_id(id), key_of_id(id_of(other)));
    }

    #[test]
    fn hash_reads_only_its_bytes() {
        let data: Vec<u8> = (0..200u32).map(|i| (i * 7 + 3) as u8).collect();
        for len in 0..64 {
            for start in [0usize, 1, 5, 17] {
                let a = hash(&data[start..start + len]);
                let mut copy = data[start..start + len].to_vec();
                assert_eq!(hash(&copy), a);
                if len > 0 {
                    copy[len - 1] ^= 1;
                    assert_ne!(hash(&copy), a);
                    copy[len - 1] ^= 1;
                    copy[0] ^= 0x80;
                    assert_ne!(hash(&copy), a);
                }
            }
        }
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
        let alphabet = b"09AZ_az -";
        let mut strings = Vec::new();
        for _ in 0..3000 {
            let len = (next() % 40) as usize;
            let s: Vec<u8> = (0..len).map(|_| alphabet[(next() % alphabet.len() as u64) as usize]).collect();
            strings.push(leak(&s));
        }
        for pair in strings.windows(2) {
            let (a, b) = (pair[0], pair[1]);
            assert_eq!(cmp_ids(id_of(a), id_of(b)), a.cmp(b));
            assert_eq!(roundtrip(a), a.to_vec());
        }
    }

    #[test]
    fn id_map() {
        let entries: Vec<(&'static [u8], u32)> = vec![
            (b"c_1", 0),
            (b"c_2", 1),
            (b"c_1", 7),
            (leak(b"a long campaign id with spaces"), 2),
            (leak(b"a long campaign id with spaces"), 9),
        ];
        let map = IdMap::new(&entries);
        assert_eq!(map.get_bytes(b"c_1"), Some(0));
        assert_eq!(map.get_bytes(b"c_2"), Some(1));
        assert_eq!(map.get_bytes(b"C_1"), None);
        assert_eq!(map.get_bytes(b"a long campaign id with spaces"), Some(2));
        assert_eq!(map.get_bytes(b"a long campaign id with spaces "), None);
        assert_eq!(map.get_packed(pack(b"c_2").unwrap()), Some(1));
    }
}
