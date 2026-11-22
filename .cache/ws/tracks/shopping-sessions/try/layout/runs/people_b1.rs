use super::keys;

pub struct People {
    shift: u32,
    mask: usize,
    slots: &'static mut [[u64; 2]],
    filter: &'static mut [u64],
    filter_shift: u32,
    linked: usize,
}

const FILTER_MUL: u64 = 0xd6e8_feb8_6659_fd93;

#[inline(always)]
pub fn prefetch<T>(p: *const T) {
    #[cfg(target_arch = "x86_64")]
    unsafe {
        std::arch::x86_64::_mm_prefetch(p as *const i8, std::arch::x86_64::_MM_HINT_T0);
    }
}

fn find(parent: &mut [u32], mut node: u32) -> u32 {
    while parent[node as usize] != node {
        let grandparent = parent[parent[node as usize] as usize];
        parent[node as usize] = grandparent;
        node = grandparent;
    }
    node
}

impl People {
    #[inline(always)]
    fn home(&self, key: u64) -> usize {
        (key.wrapping_mul(0x9e37_79b9_7f4a_7c15) >> self.shift) as usize
    }

    fn with_capacity(size: usize, words: usize) -> People {
        let memory = super::sink::map_anonymous(size * 16);
        let filter = super::sink::map_anonymous(words * 8);
        People {
            shift: 64 - size.trailing_zeros(),
            mask: size - 1,
            slots: unsafe { std::slice::from_raw_parts_mut(memory as *mut [u64; 2], size) },
            filter: unsafe { std::slice::from_raw_parts_mut(filter as *mut u64, words) },
            filter_shift: 64 - words.trailing_zeros(),
            linked: 0,
        }
    }

    #[inline(always)]
    fn filter_bits(&self, key: u64) -> (usize, u64) {
        let h = key.wrapping_mul(FILTER_MUL);
        let s = self.filter_shift;
        let bits = 1u64 << ((h >> (s - 6)) & 63) | 1u64 << ((h >> (s - 12)) & 63) | 1u64 << ((h >> (s - 18)) & 63);
        ((h >> s) as usize, bits)
    }

    #[inline(always)]
    pub fn maybe(&self, key: u64) -> bool {
        let (word, bits) = self.filter_bits(key);
        unsafe { *self.filter.get_unchecked(word) & bits == bits }
    }

    pub fn build(pairs: &[(u64, u64)]) -> People {
        let size = (pairs.len() * 3).next_power_of_two().max(64);
        let mut people = People::with_capacity(size, 1);
        let mut node_key: Vec<u64> = Vec::with_capacity(pairs.len() + 16);
        let mut parent: Vec<u32> = Vec::with_capacity(pairs.len() + 16);
        const BATCH: usize = 16;
        for batch in pairs.chunks(BATCH) {
            for &(a, b) in batch {
                prefetch(&people.slots[people.home(a)]);
                prefetch(&people.slots[people.home(b)]);
            }
            for &(a, b) in batch {
                let na = people.intern(a, &mut node_key, &mut parent);
                let nb = people.intern(b, &mut node_key, &mut parent);
                let ra = find(&mut parent, na);
                let rb = find(&mut parent, nb);
                if ra != rb {
                    let (low, high) = if ra < rb { (ra, rb) } else { (rb, ra) };
                    parent[high as usize] = low;
                }
            }
        }
        let nodes = node_key.len();
        let mut smallest = node_key.clone();
        for node in 0..nodes {
            let root = find(&mut parent, node as u32) as usize;
            if keys::cmp(node_key[node], smallest[root]) == std::cmp::Ordering::Less {
                smallest[root] = node_key[node];
            }
        }
        let mut renamed = 0usize;
        for node in 0..nodes {
            let root = find(&mut parent, node as u32) as usize;
            renamed += usize::from(smallest[root] != node_key[node]);
        }
        let size = (renamed * 2).next_power_of_two().max(64);
        let words = (renamed / 8).next_power_of_two().max(64);
        let mut named = People::with_capacity(size, words);
        for node in 0..nodes {
            let root = find(&mut parent, node as u32) as usize;
            let (key, name) = (node_key[node], smallest[root]);
            if key != name {
                let mut slot = named.home(key);
                while named.slots[slot][0] != 0 {
                    slot = (slot + 1) & named.mask;
                }
                named.slots[slot] = [key, name];
                let (word, bits) = named.filter_bits(key);
                named.filter[word] |= bits;
            }
        }
        named.linked = nodes;
        named
    }

    #[inline(always)]
    fn intern(&mut self, key: u64, node_key: &mut Vec<u64>, parent: &mut Vec<u32>) -> u32 {
        let mut slot = self.home(key);
        loop {
            let entry = &mut self.slots[slot];
            if entry[0] == key {
                return entry[1] as u32;
            }
            if entry[0] == 0 {
                let node = node_key.len() as u32;
                entry[0] = key;
                entry[1] = u64::from(node);
                node_key.push(key);
                parent.push(node);
                return node;
            }
            slot = (slot + 1) & self.mask;
        }
    }

    #[inline(always)]
    pub fn slot_ptr(&self, key: u64) -> *const [u64; 2] {
        unsafe { self.slots.as_ptr().add(self.home(key)) }
    }

    #[inline(always)]
    pub fn name_of(&self, key: u64) -> u64 {
        if !self.maybe(key) {
            return key;
        }
        self.probe(key)
    }

    #[inline(always)]
    pub fn probe(&self, key: u64) -> u64 {
        let mut slot = self.home(key);
        loop {
            let entry = unsafe { self.slots.get_unchecked(slot) };
            if entry[0] == key {
                return entry[1];
            }
            if entry[0] == 0 {
                return key;
            }
            slot = (slot + 1) & self.mask;
        }
    }

    pub fn linked(&self) -> usize {
        self.linked
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fast::keys::intern;

    #[test]
    fn names() {
        let raw: Vec<(&[u8], &[u8])> = vec![
            (b"u3", b"u9"),
            (b"u9", b"u2"),
            (b"U7", b"u9"),
            (b"u10", b"u10"),
            (b"x5", b"x4"),
            (b"x3", b"x5"),
            (b"long id with spaces", b"x4"),
            (b" x", b"q"),
        ];
        let pairs: Vec<(u64, u64)> = raw.iter().map(|&(a, b)| (intern(a), intern(b))).collect();
        let people = People::build(&pairs);
        let name = |id: &[u8]| {
            let mut out = Vec::new();
            keys::bytes_of(people.name_of(intern(id)), &mut out);
            out
        };
        assert_eq!(name(b"u3"), b"U7");
        assert_eq!(name(b"u2"), b"U7");
        assert_eq!(name(b"u10"), b"u10");
        assert_eq!(name(b"x4"), b"long id with spaces");
        assert_eq!(name(b"q"), b" x");
        assert_eq!(name(b"u1"), b"u1");
    }
}
