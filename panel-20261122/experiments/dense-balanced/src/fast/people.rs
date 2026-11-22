use super::id::{Domain, Key};

const INDIRECT: u64 = 1 << 63;

pub struct People {
    small_shift: u32,
    small_mask: usize,
    small: &'static mut [[u64; 2]],
    wide_shift: u32,
    wide_mask: usize,
    wide: &'static mut [[Key; 2]],
    names: Vec<Key>,
    linked: usize,
    membership: Vec<u64>,
    membership_mask: usize,
}

struct Node {
    parent: u32,
    size: u32,
    least: u32,
    wide_name: u32,
}

#[inline(always)]
pub fn prefetch<T>(p: *const T) {
    #[cfg(target_arch = "x86_64")]
    unsafe {
        std::arch::x86_64::_mm_prefetch(p as *const i8, std::arch::x86_64::_MM_HINT_T0);
    }
}

fn find(nodes: &mut [Node], mut node: u32) -> u32 {
    while nodes[node as usize].parent != node {
        let parent = nodes[node as usize].parent;
        let grandparent = nodes[parent as usize].parent;
        nodes[node as usize].parent = grandparent;
        node = grandparent;
    }
    node
}

impl People {
    #[inline(always)]
    fn small_home(&self, key: Key) -> usize {
        (key.hash() >> self.small_shift) as usize
    }

    #[inline(always)]
    fn wide_home(&self, key: Key) -> usize {
        (key.hash() >> self.wide_shift) as usize
    }

    pub fn build(pairs: &[(Key, Key)], domain: &Domain) -> People {
        let short = pairs.iter().map(|&(a, b)| (a.hi == 0) as usize + (b.hi == 0) as usize).sum::<usize>();
        let long = pairs.len() * 2 - short;
        let small_size = (short + short / 2).next_power_of_two().max(64);
        let wide_size = (long + long / 2).next_power_of_two().max(64);
        let small_mem = super::sink::region(small_size * std::mem::size_of::<[u64; 2]>());
        let wide_mem = super::sink::region(wide_size * std::mem::size_of::<[Key; 2]>());
        let mut people = People {
            small_shift: 64 - small_size.trailing_zeros(),
            small_mask: small_size - 1,
            small: unsafe { std::slice::from_raw_parts_mut(small_mem as *mut [u64; 2], small_size) },
            wide_shift: 64 - wide_size.trailing_zeros(),
            wide_mask: wide_size - 1,
            wide: unsafe { std::slice::from_raw_parts_mut(wide_mem as *mut [Key; 2], wide_size) },
            names: Vec::new(),
            linked: 0,
            membership: vec![0],
            membership_mask: 63,
        };
        let mut keys: Vec<Key> = Vec::with_capacity(pairs.len() + 16);
        let mut nodes: Vec<Node> = Vec::with_capacity(pairs.len() + 16);
        for batch in pairs.chunks(16) {
            for &(a, b) in batch {
                prefetch(people.raw_slot_ptr(a));
                prefetch(people.raw_slot_ptr(b));
            }
            for &(a, b) in batch {
                let na = people.intern(a, &mut keys, &mut nodes);
                let nb = people.intern(b, &mut keys, &mut nodes);
                let mut ra = find(&mut nodes, na);
                let mut rb = find(&mut nodes, nb);
                if ra != rb {
                    if nodes[ra as usize].size < nodes[rb as usize].size {
                        std::mem::swap(&mut ra, &mut rb);
                    }
                    let ma = nodes[ra as usize].least;
                    let mb = nodes[rb as usize].least;
                    if domain.cmp(keys[mb as usize], keys[ma as usize]) == std::cmp::Ordering::Less {
                        nodes[ra as usize].least = mb;
                    }
                    nodes[rb as usize].parent = ra;
                    nodes[ra as usize].size += nodes[rb as usize].size;
                }
            }
        }
        for slot in people.small.iter_mut() {
            if slot[0] != 0 {
                let root = find(&mut nodes, slot[1] as u32) as usize;
                let key = keys[nodes[root].least as usize];
                slot[1] = if key.hi == 0 {
                    key.lo
                } else {
                    if nodes[root].wide_name == u32::MAX {
                        nodes[root].wide_name = people.names.len() as u32;
                        people.names.push(key);
                    }
                    INDIRECT | u64::from(nodes[root].wide_name)
                };
            }
        }
        for slot in people.wide.iter_mut() {
            if slot[0] != Key::default() {
                let root = find(&mut nodes, slot[1].lo as u32) as usize;
                slot[1] = keys[nodes[root].least as usize];
            }
        }
        let bits = keys.len().saturating_mul(8).clamp(64, 1 << 24).next_power_of_two();
        people.membership = vec![0; bits / 64];
        people.membership_mask = bits - 1;
        for key in &keys {
            let bit = key.hash() as usize & people.membership_mask;
            people.membership[bit >> 6] |= 1 << (bit & 63);
        }
        people.linked = keys.len();
        people
    }

    #[inline(always)]
    fn intern(&mut self, key: Key, keys: &mut Vec<Key>, nodes: &mut Vec<Node>) -> u32 {
        if key.hi == 0 {
            let mut pos = self.small_home(key);
            loop {
                let entry = &mut self.small[pos];
                if entry[0] == key.lo {
                    return entry[1] as u32;
                }
                if entry[0] == 0 {
                    let node = keys.len() as u32;
                    *entry = [key.lo, u64::from(node)];
                    keys.push(key);
                    nodes.push(Node { parent: node, size: 1, least: node, wide_name: u32::MAX });
                    return node;
                }
                pos = (pos + 1) & self.small_mask;
            }
        }
        let mut pos = self.wide_home(key);
        loop {
            let entry = &mut self.wide[pos];
            if entry[0] == key {
                return entry[1].lo as u32;
            }
            if entry[0] == Key::default() {
                let node = keys.len() as u32;
                entry[0] = key;
                entry[1] = Key { hi: 0, lo: u64::from(node) };
                keys.push(key);
                nodes.push(Node { parent: node, size: 1, least: node, wide_name: u32::MAX });
                return node;
            }
            pos = (pos + 1) & self.wide_mask;
        }
    }

    #[inline(always)]
    fn raw_slot_ptr(&self, key: Key) -> *const u8 {
        unsafe {
            if key.hi == 0 {
                self.small.as_ptr().add(self.small_home(key)) as *const u8
            } else {
                self.wide.as_ptr().add(self.wide_home(key)) as *const u8
            }
        }
    }

    #[inline(always)]
    fn possible_link(&self, key: Key) -> bool {
        let bit = key.hash() as usize & self.membership_mask;
        self.membership[bit >> 6] >> (bit & 63) & 1 != 0
    }

    #[inline(always)]
    pub fn slot_ptr(&self, key: Key) -> *const u8 {
        let bit = key.hash() as usize & self.membership_mask;
        let word = &self.membership[bit >> 6];
        if word >> (bit & 63) & 1 == 0 {
            word as *const u64 as *const u8
        } else {
            self.raw_slot_ptr(key)
        }
    }

    #[inline(always)]
    pub fn name_of(&self, key: Key) -> Key {
        if !self.possible_link(key) {
            return key;
        }
        if key.hi == 0 {
            let mut pos = self.small_home(key);
            loop {
                let entry = unsafe { self.small.get_unchecked(pos) };
                if entry[0] == key.lo {
                    return if entry[1] & INDIRECT == 0 {
                        Key { hi: 0, lo: entry[1] }
                    } else {
                        self.names[(entry[1] & !INDIRECT) as usize]
                    };
                }
                if entry[0] == 0 {
                    return key;
                }
                pos = (pos + 1) & self.small_mask;
            }
        }
        let mut pos = self.wide_home(key);
        loop {
            let entry = unsafe { self.wide.get_unchecked(pos) };
            if entry[0] == key {
                return entry[1];
            }
            if entry[0] == Key::default() {
                return key;
            }
            pos = (pos + 1) & self.wide_mask;
        }
    }

    pub fn linked(&self) -> usize {
        self.linked
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn membership_preserves_exact_identity() {
        let domain = Domain::with_prefix(b'u');
        let pairs: Vec<_> = (0..400).map(|i| {
            (domain.encode(format!("u{:04}", i * 2 + 1).as_bytes()),
             domain.encode(format!("u{:04}", i * 2).as_bytes()))
        }).collect();
        let mut people = People::build(&pairs, &domain);
        for &(a, b) in &pairs {
            assert!(people.possible_link(a));
            assert!(people.possible_link(b));
            assert_eq!(people.name_of(a), b);
            assert_eq!(people.name_of(b), b);
        }
        for i in 800..2400 {
            let key = domain.encode(format!("u{i:04}").as_bytes());
            assert_eq!(people.name_of(key), key);
        }
        people.membership.fill(u64::MAX);
        for i in 800..2400 {
            let key = domain.encode(format!("u{i:04}").as_bytes());
            assert!(people.possible_link(key));
            assert_eq!(people.name_of(key), key);
        }
        let empty = People::build(&[], &domain);
        for &(a, b) in &pairs {
            assert!(!empty.possible_link(a));
            assert_eq!(empty.name_of(a), a);
            assert_eq!(empty.name_of(b), b);
        }
    }

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
            (b"u0123456789abcdef0123456789abcdef", b"u0123"),
            (b"u0123", b"u01234"),
            (b"u0123456789abcdef0123456789abcdee", b"ufedcba9876543210fedcba9876543210"),
            (b"ufedcba9876543210fedcba9876543210", b"ug"),
        ];
        let d = Domain::with_prefix(b'u');
        let pairs: Vec<(Key, Key)> = raw.iter().map(|&(a, b)| (d.encode(a), d.encode(b))).collect();
        let people = People::build(&pairs, &d);
        let name = |id: &[u8]| {
            let mut out = Vec::new();
            d.bytes_of(people.name_of(d.encode(id)), &mut out);
            out
        };
        assert_eq!(name(b"u3"), b"U7");
        assert_eq!(name(b"u2"), b"U7");
        assert_eq!(name(b"u10"), b"u10");
        assert_eq!(name(b"x4"), b"long id with spaces");
        assert_eq!(name(b"q"), b" x");
        assert_eq!(name(b"u1"), b"u1");
        assert_eq!(name(b"u01234"), b"u0123");
        assert_eq!(name(b"u0123456789abcdef0123456789abcdef"), b"u0123");
        assert_eq!(name(b"ug"), b"u0123456789abcdef0123456789abcdee");
    }
}
