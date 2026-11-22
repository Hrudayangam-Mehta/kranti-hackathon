use std::collections::HashMap;
use std::hash::{BuildHasherDefault, Hasher};

const MULTIPLIER: u64 = 0x9e37_79b9_7f4a_7c15;

#[derive(Default, Clone, Copy)]
pub struct FastHasher {
    state: u64,
}

impl FastHasher {
    #[inline]
    fn add(&mut self, word: u64) {
        self.state = (self.state.rotate_left(26) ^ word).wrapping_mul(MULTIPLIER);
    }
}

impl Hasher for FastHasher {
    #[inline]
    fn write(&mut self, bytes: &[u8]) {
        let mut words = bytes.chunks_exact(8);
        for word in &mut words {
            self.add(u64::from_le_bytes(word.try_into().unwrap()));
        }
        let rest = words.remainder();
        if !rest.is_empty() {
            let mut last = [0u8; 8];
            last[..rest.len()].copy_from_slice(rest);
            self.add(u64::from_le_bytes(last));
        }
    }

    #[inline]
    fn write_u8(&mut self, value: u8) {
        self.add(u64::from(value));
    }

    #[inline]
    fn write_usize(&mut self, value: usize) {
        self.add(value as u64);
    }

    #[inline]
    fn finish(&self) -> u64 {
        let mut h = self.state;
        h ^= h >> 33;
        h = h.wrapping_mul(0xff51_afd7_ed55_8ccd);
        h ^= h >> 33;
        h = h.wrapping_mul(0xc4ce_b9fe_1a85_ec53);
        h ^ (h >> 33)
    }
}

pub type FastMap<K, V> = HashMap<K, V, BuildHasherDefault<FastHasher>>;

pub fn new_map<K, V>(capacity: usize) -> FastMap<K, V> {
    FastMap::with_capacity_and_hasher(capacity, Default::default())
}

#[inline]
pub fn bucket_of(key: &[u8], bits: u32) -> usize {
    if bits == 0 {
        return 0;
    }
    let mut hasher = FastHasher::default();
    hasher.write(key);
    (hasher.finish() >> (64 - bits)) as usize
}
