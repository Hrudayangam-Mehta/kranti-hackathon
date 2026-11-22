use super::keys;

pub struct People {
    shift: u32,
    mask: usize,
    slots: &'static mut [[u64; 2]],
    linked: usize,
    pub info: Vec<u64>,
    pub decoder: Option<super::ident::Decoder>,
}

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

    pub fn build(pairs: &[(u64, u64)]) -> People {
        let size = (pairs.len() * 3).next_power_of_two().max(64);
        let memory = super::sink::map_anonymous(size * 16);
        let mut people = People {
            shift: 64 - size.trailing_zeros(),
            mask: size - 1,
            slots: unsafe { std::slice::from_raw_parts_mut(memory as *mut [u64; 2], size) },
            linked: 0,
            info: Vec::new(),
            decoder: None,
        };
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
        for slot in people.slots.iter_mut() {
            if slot[0] != 0 {
                let root = find(&mut parent, slot[1] as u32) as usize;
                slot[1] = smallest[root];
            }
        }
        people.linked = nodes;
        people
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
    pub fn info_ptr(&self, g: u64) -> *const u64 {
        self.info.as_ptr().wrapping_add(g as usize)
    }

    #[inline(always)]
    pub fn name_of(&self, key: u64) -> u64 {
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
