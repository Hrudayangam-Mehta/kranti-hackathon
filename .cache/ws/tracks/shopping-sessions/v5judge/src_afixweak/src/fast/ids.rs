use std::cmp::Ordering;

use super::sink::{self, Arena, Sink};

pub type Key = [u64; 2];

pub const SHORT_MAX: usize = 11;
const LEN_SHIFT: u32 = 56;
const LONG_TAG: u64 = 0xff << LEN_SHIFT;
const PTR_MASK: u64 = (1 << 48) - 1;
const ID_SHIFT: u32 = 24;
const ID_FIELD: u64 = 0xffff_ffff << ID_SHIFT;
const P0: u64 = 0xa076_1d64_78bd_642f;
const P1: u64 = 0xe703_7ed1_a0b4_28db;
const P2: u64 = 0x8ebc_6af0_9c88_c6e3;
const P3: u64 = 0x5899_65cc_7537_4cc3;
const BYTES_CHUNK: usize = 4 << 20;

const fn mask_table() -> [(u64, u64); SHORT_MAX + 1] {
    let mut table = [(0u64, 0u64); SHORT_MAX + 1];
    let mut len = 0;
    while len <= SHORT_MAX {
        let a = if len >= 8 { u64::MAX } else { (1u64 << (8 * len)) - 1 };
        let b = if len > 8 { (1u64 << (8 * (len - 8))) - 1 } else { 0 };
        table[len] = (a, b);
        len += 1;
    }
    table
}

static MASKS: [(u64, u64); SHORT_MAX + 1] = mask_table();

#[inline(always)]
fn mum(a: u64, b: u64) -> u64 {
    let r = u128::from(a) * u128::from(b);
    (r as u64) ^ ((r >> 64) as u64)
}

#[inline(always)]
pub fn is_long(k: &Key) -> bool {
    k[1] >> LEN_SHIFT == 0xff
}

#[inline(always)]
pub fn short_hash(k: &Key) -> u64 {
    mum(k[0] ^ P0, k[1] ^ P1)
}

#[inline(always)]
pub fn hash_of(k: &Key) -> u64 {
    if is_long(k) {
        k[0]
    } else {
        short_hash(k)
    }
}

#[inline]
pub fn long_hash(s: &[u8]) -> u64 {
    let mut h = P2 ^ (s.len() as u64).wrapping_mul(P3);
    let mut words = s.chunks_exact(8);
    for w in &mut words {
        h = mum(h ^ u64::from_le_bytes(w.try_into().unwrap()), P1);
    }
    let rest = words.remainder();
    let mut last = [0u8; 8];
    last[..rest.len()].copy_from_slice(rest);
    mum(h ^ u64::from_le_bytes(last), P0) & 0xff
}

#[inline(always)]
pub unsafe fn field_hash(p: *const u8, len: usize) -> u64 {
    let mut h = P2 ^ (len as u64).wrapping_mul(P3);
    let mut at = 0;
    while at + 8 <= len {
        h = mum(h ^ (p.add(at) as *const u64).read_unaligned(), P1);
        at += 8;
    }
    let rest = len - at;
    let last = if rest == 0 { 0 } else { (p.add(at) as *const u64).read_unaligned() & (u64::MAX >> (64 - 8 * rest)) };
    mum(h ^ last, P0) & 0xff
}

#[inline(always)]
pub unsafe fn short_key(p: *const u8, len: usize) -> Key {
    let (ma, mb) = *MASKS.get_unchecked(len);
    let a = (p as *const u64).read_unaligned() & ma;
    let b = (p.add(8) as *const u64).read_unaligned() & mb;
    [a, b | (len as u64) << LEN_SHIFT]
}

pub fn short_key_of(s: &[u8]) -> Key {
    let mut buf = [0u8; 16];
    buf[..s.len()].copy_from_slice(s);
    unsafe { short_key(buf.as_ptr(), s.len()) }
}

#[inline(always)]
unsafe fn entry_bytes(p: u64) -> &'static [u8] {
    let inline_len = ((p >> 48) & 0xff) as usize;
    let p = (p & PTR_MASK) as *const u8;
    if inline_len != 0 {
        return std::slice::from_raw_parts(p, inline_len);
    }
    let len = (p as *const u32).read() as usize;
    std::slice::from_raw_parts(p.add(8), len)
}

#[inline(always)]
unsafe fn entry_aux(p: u64) -> u32 {
    (((p & PTR_MASK) as *const u8).add(4) as *const u32).read()
}

pub fn with_bytes<R>(k: &Key, f: impl FnOnce(&[u8]) -> R) -> R {
    if is_long(k) {
        f(unsafe { entry_bytes(k[1]) })
    } else {
        let len = (k[1] >> LEN_SHIFT) as usize;
        let mut buf = [0u8; 16];
        buf[..8].copy_from_slice(&k[0].to_le_bytes());
        buf[8..].copy_from_slice(&(k[1] & !(ID_FIELD | LONG_TAG)).to_le_bytes());
        f(&buf[..len])
    }
}

pub fn write_bytes(k: &Key, out: &mut Vec<u8>) {
    with_bytes(k, |s| out.extend_from_slice(s));
}

pub fn cmp(x: &Key, y: &Key) -> Ordering {
    if !is_long(x) && !is_long(y) {
        let a = (x[0].swap_bytes(), (x[1] & 0xff_ffff).swap_bytes(), x[1] >> LEN_SHIFT);
        let b = (y[0].swap_bytes(), (y[1] & 0xff_ffff).swap_bytes(), y[1] >> LEN_SHIFT);
        return a.cmp(&b);
    }
    with_bytes(x, |a| with_bytes(y, |b| a.cmp(b)))
}

#[inline(always)]
pub fn same(x: &Key, y: &Key) -> bool {
    x == y || (x[0] == y[0] && is_long(x) && is_long(y) && same_long(x, y))
}

#[cold]
#[inline(never)]
fn same_long(x: &Key, y: &Key) -> bool {
    unsafe { entry_bytes(x[1]) == entry_bytes(y[1]) }
}

pub struct Bytes {
    next: *mut u8,
    end: *mut u8,
}

unsafe impl Send for Bytes {}

impl Bytes {
    pub fn new() -> Bytes {
        Bytes {
            next: std::ptr::null_mut(),
            end: std::ptr::null_mut(),
        }
    }

    #[inline]
    pub fn put(&mut self, s: &[u8], aux: u32) -> u64 {
        let chunks = s.len().div_ceil(16);
        let need = 8 + 16 * chunks;
        if (self.end as usize) - (self.next as usize) < need {
            self.refill(need);
        }
        let p = self.next;
        unsafe {
            (p as *mut u32).write(s.len() as u32);
            (p.add(4) as *mut u32).write(aux);
            for k in 0..chunks {
                let v = (s.as_ptr().add(16 * k) as *const [u8; 16]).read_unaligned();
                (p.add(8 + 16 * k) as *mut [u8; 16]).write_unaligned(v);
            }
            self.next = p.add(need);
        }
        p as u64
    }

    #[cold]
    #[inline(never)]
    fn refill(&mut self, need: usize) {
        let size = BYTES_CHUNK.max(need);
        self.next = sink::region(size);
        self.end = unsafe { self.next.add(size) };
    }
}

impl Default for Bytes {
    fn default() -> Self {
        Bytes::new()
    }
}

#[inline]
pub unsafe fn long_key(s: &[u8], bytes: &mut Bytes) -> Key {
    let h = field_hash(s.as_ptr(), s.len());
    [h, bytes.put(s, 0) | LONG_TAG]
}

#[cfg(test)]
pub unsafe fn field_key(p: *const u8, len: usize, bytes: &mut Bytes) -> Key {
    if len <= SHORT_MAX {
        short_key(p, len)
    } else {
        long_key(std::slice::from_raw_parts(p, len), bytes)
    }
}

#[inline(always)]
pub unsafe fn mapped_key(p: *const u8, len: usize, lo: usize, hi: usize, bytes: &mut Bytes) -> Key {
    if len <= SHORT_MAX {
        short_key(p, len)
    } else if len < 256 && (lo..hi).contains(&(p as usize)) {
        [field_hash(p, len), p as u64 | (len as u64) << 48 | LONG_TAG]
    } else {
        long_key(std::slice::from_raw_parts(p, len), bytes)
    }
}

#[inline(always)]
pub fn prefetch<T>(p: *const T) {
    #[cfg(target_arch = "x86_64")]
    unsafe {
        std::arch::x86_64::_mm_prefetch(p as *const i8, std::arch::x86_64::_MM_HINT_T0);
    }
}

pub struct Exported {
    pub key: Key,
    pub hash: u64,
    pub local: u32,
}

#[inline(always)]
pub fn exported(e: &Key) -> Exported {
    if is_long(e) {
        Exported {
            key: *e,
            hash: e[0],
            local: unsafe { entry_aux(e[1]) },
        }
    } else {
        let key = [e[0], e[1] & !ID_FIELD];
        Exported {
            key,
            hash: short_hash(&key),
            local: ((e[1] & ID_FIELD) >> ID_SHIFT) as u32,
        }
    }
}

type Wide = [u64; 8];
const WIDE_INLINE: usize = 48;

pub struct Interner {
    slots: *mut Key,
    mask: usize,
    limit: u32,
    filled: u32,
    wide: *mut Wide,
    wmask: usize,
    wlimit: u32,
    wfilled: u32,
    count: u32,
    qshift: u32,
    pub export: Sink<Key>,
    pub keys: Option<Vec<Key>>,
}

unsafe impl Send for Interner {}

fn table<T>(size: usize) -> *mut T {
    sink::huge_region(size * std::mem::size_of::<T>()) as *mut T
}

#[inline(always)]
unsafe fn wide_same(w: &Wide, p: *const u8, len: usize) -> bool {
    if len > WIDE_INLINE {
        return entry_bytes(w[2]) == std::slice::from_raw_parts(p, len);
    }
    let inline = (w as *const Wide as *const u8).add(16);
    let mut at = 0;
    while at < len {
        let a = (p.add(at) as *const u128).read_unaligned();
        let b = (inline.add(at) as *const u128).read_unaligned();
        let rest = len - at;
        let keep = if rest >= 16 { u128::MAX } else { (1u128 << (8 * rest)) - 1 };
        if (a ^ b) & keep != 0 {
            return false;
        }
        at += 16;
    }
    true
}

impl Interner {
    pub fn new(size: usize, qbits: u32, block: usize, keep_keys: bool) -> Interner {
        let size = size.next_power_of_two().max(1 << 10);
        let wsize = (size / 8).max(1 << 10);
        Interner {
            slots: table(size),
            mask: size - 1,
            limit: (size / 10 * 7) as u32,
            filled: 0,
            wide: table(wsize),
            wmask: wsize - 1,
            wlimit: (wsize / 10 * 7) as u32,
            wfilled: 0,
            count: 0,
            qshift: 64 - qbits,
            export: Sink::new(1 << qbits, block),
            keys: keep_keys.then(Vec::new),
        }
    }

    pub fn count(&self) -> u32 {
        self.count
    }

    #[inline(always)]
    pub fn prefetch(&self, h: u64) {
        prefetch(unsafe { self.slots.add(h as usize & self.mask) });
    }

    #[inline(always)]
    pub fn prefetch_long(&self, h: u64) {
        prefetch(unsafe { self.wide.add(h as usize & self.wmask) });
    }

    #[inline(always)]
    pub fn short(&mut self, k: Key, h: u64, arena: &mut Arena) -> u32 {
        let mut i = h as usize & self.mask;
        loop {
            let s = unsafe { *self.slots.add(i) };
            if s[0] == k[0] && s[1] & !ID_FIELD == k[1] {
                return ((s[1] & ID_FIELD) >> ID_SHIFT) as u32;
            }
            if s[1] == 0 {
                let id = self.count;
                let value = [k[0], k[1] | u64::from(id) << ID_SHIFT];
                unsafe { *self.slots.add(i) = value };
                self.added(h, value, k, arena);
                self.filled += 1;
                if self.filled >= self.limit {
                    self.grow();
                }
                return id;
            }
            i = (i + 1) & self.mask;
        }
    }

    #[inline(always)]
    pub unsafe fn long(&mut self, p: *const u8, len: usize, h: u64, arena: &mut Arena, bytes: &mut Bytes) -> u32 {
        let mut i = h as usize & self.wmask;
        loop {
            let w = &*self.wide.add(i);
            if w[0] == h && w[1] as u32 as usize == len && wide_same(w, p, len) {
                return (w[1] >> 32) as u32;
            }
            if w[1] == 0 {
                let id = self.count;
                let s = std::slice::from_raw_parts(p, len);
                let entry = bytes.put(s, id);
                let w = &mut *self.wide.add(i);
                w[0] = h;
                w[1] = len as u64 | u64::from(id) << 32;
                if len <= WIDE_INLINE {
                    std::ptr::copy_nonoverlapping(p, (w as *mut Wide as *mut u8).add(16), len);
                } else {
                    w[2] = entry;
                }
                let value = [h, entry | LONG_TAG];
                self.added(h, value, value, arena);
                self.wfilled += 1;
                if self.wfilled >= self.wlimit {
                    self.grow_wide();
                }
                return id;
            }
            i = (i + 1) & self.wmask;
        }
    }

    #[inline(always)]
    pub unsafe fn field(&mut self, p: *const u8, len: usize, arena: &mut Arena, bytes: &mut Bytes) -> u32 {
        if len <= SHORT_MAX {
            let k = short_key(p, len);
            self.short(k, short_hash(&k), arena)
        } else {
            self.long(p, len, field_hash(p, len), arena, bytes)
        }
    }

    #[inline(always)]
    fn added(&mut self, h: u64, value: Key, key: Key, arena: &mut Arena) {
        self.count += 1;
        self.export.push(arena, (h >> self.qshift) as usize, value);
        if let Some(keys) = self.keys.as_mut() {
            keys.push(key);
        }
    }

    #[cold]
    #[inline(never)]
    fn grow(&mut self) {
        let old = self.mask + 1;
        let size = old * 2;
        let slots: *mut Key = table(size);
        let mask = size - 1;
        for i in 0..old {
            let s = unsafe { *self.slots.add(i) };
            if s[1] == 0 {
                continue;
            }
            let h = short_hash(&[s[0], s[1] & !ID_FIELD]);
            let mut j = h as usize & mask;
            while unsafe { (*slots.add(j))[1] } != 0 {
                j = (j + 1) & mask;
            }
            unsafe { *slots.add(j) = s };
        }
        unsafe { libc::munmap(self.slots as *mut libc::c_void, old * std::mem::size_of::<Key>()) };
        self.slots = slots;
        self.mask = mask;
        self.limit = (size / 10 * 7) as u32;
    }

    #[cold]
    #[inline(never)]
    fn grow_wide(&mut self) {
        let old = self.wmask + 1;
        let size = old * 2;
        let wide: *mut Wide = table(size);
        let mask = size - 1;
        for i in 0..old {
            let w = unsafe { *self.wide.add(i) };
            if w[1] == 0 {
                continue;
            }
            let mut j = w[0] as usize & mask;
            while unsafe { (*wide.add(j))[1] } != 0 {
                j = (j + 1) & mask;
            }
            unsafe { *wide.add(j) = w };
        }
        unsafe { libc::munmap(self.wide as *mut libc::c_void, old * std::mem::size_of::<Wide>()) };
        self.wide = wide;
        self.wmask = mask;
        self.wlimit = (size / 10 * 7) as u32;
    }

    pub fn release(&mut self) {
        unsafe {
            libc::munmap(self.slots as *mut libc::c_void, (self.mask + 1) * std::mem::size_of::<Key>());
            libc::munmap(self.wide as *mut libc::c_void, (self.wmask + 1) * std::mem::size_of::<Wide>());
        }
        self.slots = std::ptr::null_mut();
        self.wide = std::ptr::null_mut();
    }
}

pub struct Table {
    slots: Vec<Key>,
    values: Vec<u32>,
    mask: usize,
}

impl Table {
    pub fn new() -> Table {
        Table {
            slots: Vec::new(),
            values: Vec::new(),
            mask: 0,
        }
    }

    pub fn reset(&mut self, entries: usize) {
        let size = (entries * 2).next_power_of_two().max(16);
        self.slots.clear();
        self.slots.resize(size, [0, 0]);
        self.values.clear();
        self.values.resize(size, 0);
        self.mask = size - 1;
    }

    #[inline(always)]
    pub fn find_or_insert(&mut self, key: &Key, h: u64, next: u32) -> (u32, bool) {
        let mut i = h as usize & self.mask;
        loop {
            let s = unsafe { self.slots.get_unchecked(i) };
            if s[1] == 0 {
                self.slots[i] = *key;
                self.values[i] = next;
                return (next, true);
            }
            if same(s, key) {
                return (self.values[i], false);
            }
            i = (i + 1) & self.mask;
        }
    }
}

impl Default for Table {
    fn default() -> Self {
        Table::new()
    }
}

pub struct KeyMap {
    slots: Vec<Key>,
    values: Vec<u32>,
    long: Vec<&'static [u8]>,
    mask: usize,
}

impl KeyMap {
    pub fn new(entries: &[(&'static [u8], u32)]) -> KeyMap {
        let size = (entries.len() * 2).next_power_of_two().max(16);
        let mut map = KeyMap {
            slots: vec![[0, 0]; size],
            values: vec![0; size],
            long: Vec::new(),
            mask: size - 1,
        };
        for &(id, value) in entries {
            if id.is_empty() {
                continue;
            }
            if map.get(id).is_some() {
                continue;
            }
            let (key, h) = if id.len() <= SHORT_MAX {
                let k = short_key_of(id);
                (k, short_hash(&k))
            } else {
                map.long.push(id);
                ([long_hash(id), (map.long.len() - 1) as u64 | LONG_TAG], long_hash(id))
            };
            let mut i = h as usize & map.mask;
            while map.slots[i][1] != 0 {
                i = (i + 1) & map.mask;
            }
            map.slots[i] = key;
            map.values[i] = value;
        }
        map
    }

    pub fn get(&self, id: &[u8]) -> Option<u32> {
        if id.is_empty() {
            return None;
        }
        if id.len() <= SHORT_MAX {
            let k = short_key_of(id);
            self.get_short(&k)
        } else {
            self.get_long(id)
        }
    }

    #[inline(always)]
    pub unsafe fn get_field(&self, p: *const u8, len: usize) -> Option<u32> {
        if len == 0 {
            return None;
        }
        if len <= SHORT_MAX {
            let k = short_key(p, len);
            self.get_short(&k)
        } else {
            self.get_long(std::slice::from_raw_parts(p, len))
        }
    }

    #[inline(always)]
    fn get_short(&self, k: &Key) -> Option<u32> {
        let mut i = short_hash(k) as usize & self.mask;
        loop {
            let s = unsafe { self.slots.get_unchecked(i) };
            if s == k {
                return Some(self.values[i]);
            }
            if s[1] == 0 {
                return None;
            }
            i = (i + 1) & self.mask;
        }
    }

    #[cold]
    #[inline(never)]
    fn get_long(&self, id: &[u8]) -> Option<u32> {
        let h = long_hash(id);
        let mut i = h as usize & self.mask;
        loop {
            let s = &self.slots[i];
            if s[1] == 0 {
                return None;
            }
            if s[0] == h && is_long(s) && self.long[(s[1] & PTR_MASK) as usize] == id {
                return Some(self.values[i]);
            }
            i = (i + 1) & self.mask;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(s: &[u8], bytes: &mut Bytes) -> Key {
        let mut buf = s.to_vec();
        buf.resize(s.len() + 16, 0);
        unsafe { field_key(buf.as_ptr(), s.len(), bytes) }
    }

    #[test]
    fn keys_order_and_bytes() {
        let mut bytes = Bytes::new();
        let samples: Vec<&[u8]> = vec![
            b"a", b"ab", b"ab\0", b"ab\x01", b"abcdefgh", b"abcdefghi", b"abcdefghijk", b"abcdefghijkl",
            b"abcdefghijk\0", b"u1", b"U1", b" u1", b"u1 ", b"u1\r", b"\xff", b"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff",
            b"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff", b"ef376137f899ba8d80f3df1e87ce0fc50",
            b"ef376137f899ba8d80f3df1e87ce0fc51", b"e", b"\0", b"\0\0",
        ];
        let keys: Vec<Key> = samples.iter().map(|s| key(s, &mut bytes)).collect();
        for (i, a) in samples.iter().enumerate() {
            let mut out = Vec::new();
            write_bytes(&keys[i], &mut out);
            assert_eq!(&out, a);
            for (j, b) in samples.iter().enumerate() {
                assert_eq!(cmp(&keys[i], &keys[j]), a.cmp(b), "{a:?} {b:?}");
                assert_eq!(same(&keys[i], &keys[j]), a == b);
                let again = key(b, &mut bytes);
                assert_eq!(same(&keys[i], &again), a == b);
                assert_eq!(hash_of(&keys[j]), hash_of(&again));
            }
        }
    }

    #[test]
    fn interner_and_maps() {
        sink::reserve(64 << 20);
        let mut arena = Arena::new();
        let mut bytes = Bytes::new();
        let mut it = Interner::new(16, 4, 16, true);
        let mut state = 99u64;
        let mut next = || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        let mut strings: Vec<Vec<u8>> = Vec::new();
        for _ in 0..5000 {
            let len = 1 + (next() % 40) as usize;
            strings.push((0..len).map(|_| b"ab\0 Z"[(next() % 5) as usize]).collect());
        }
        let mut seen: std::collections::HashMap<Vec<u8>, u32> = std::collections::HashMap::new();
        for s in strings.iter().chain(strings.iter()) {
            let mut buf = s.clone();
            buf.resize(s.len() + 16, 0);
            let id = unsafe { it.field(buf.as_ptr(), s.len(), &mut arena, &mut bytes) };
            let expected = *seen.entry(s.clone()).or_insert(id);
            assert_eq!(id, expected);
        }
        assert_eq!(it.count() as usize, seen.len());
        let keys = it.keys.as_ref().unwrap();
        for (s, &id) in &seen {
            let mut out = Vec::new();
            write_bytes(&keys[id as usize], &mut out);
            assert_eq!(&out, s);
        }
        let mut total = 0;
        it.export.finish(&mut arena);
        for q in 0..16 {
            for slice in it.export.slices(q) {
                for e in slice {
                    let x = exported(e);
                    assert!(same(&x.key, &keys[x.local as usize]));
                    assert_eq!(x.hash >> 60, q as u64);
                    total += 1;
                }
            }
        }
        assert_eq!(total, seen.len());
        let leaked: Vec<&'static [u8]> = strings.iter().take(300).map(|s| &*Box::leak(s.clone().into_boxed_slice())).collect();
        let entries: Vec<(&'static [u8], u32)> = leaked.iter().enumerate().map(|(i, s)| (*s, i as u32)).collect();
        let map = KeyMap::new(&entries);
        for (i, s) in leaked.iter().enumerate() {
            let first = leaked.iter().position(|t| t == s).unwrap();
            assert_eq!(map.get(s), Some(first as u32), "{i}");
        }
        assert_eq!(map.get(b"not there at all, long enough"), None);
        assert_eq!(map.get(b"zz"), None);
    }
}
