use super::keys::{self, EX, LNK};

pub struct People {
    shift: u32,
    mask: usize,
    slots: &'static mut [[u64; 2]],
    ids: &'static mut [u64],
    linked: usize,
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

#[inline(always)]
pub fn name_key(id: u64) -> u64 {
    if id & EX == 0 {
        id
    } else {
        id | LNK
    }
}

impl People {
    #[inline(always)]
    fn home(&self, key: u64) -> usize {
        (key.wrapping_mul(0x9e37_79b9_7f4a_7c15) >> self.shift) as usize
    }

    pub fn build(pairs: &[[u64; 4]]) -> People {
        let size = (pairs.len() * 3).next_power_of_two().max(64);
        let memory = super::sink::region(size * 24);
        let mut people = People {
            shift: 64 - size.trailing_zeros(),
            mask: size - 1,
            slots: unsafe { std::slice::from_raw_parts_mut(memory as *mut [u64; 2], size) },
            ids: unsafe { std::slice::from_raw_parts_mut(memory.add(size * 16) as *mut u64, size) },
            linked: 0,
        };
        let mut node_id: Vec<u64> = Vec::with_capacity(pairs.len() + 16);
        let mut parent: Vec<u32> = Vec::with_capacity(pairs.len() + 16);
        const BATCH: usize = 16;
        for batch in pairs.chunks(BATCH) {
            for &[ka, _, kb, _] in batch {
                prefetch(&people.slots[people.home(ka)]);
                prefetch(&people.slots[people.home(kb)]);
            }
            for &[ka, ia, kb, ib] in batch {
                let na = people.intern(ka, ia, &mut node_id, &mut parent);
                let nb = people.intern(kb, ib, &mut node_id, &mut parent);
                let ra = find(&mut parent, na);
                let rb = find(&mut parent, nb);
                if ra != rb {
                    let (low, high) = if ra < rb { (ra, rb) } else { (rb, ra) };
                    parent[high as usize] = low;
                }
            }
        }
        let nodes = node_id.len();
        let mut smallest = node_id.clone();
        for node in 0..nodes {
            let root = find(&mut parent, node as u32) as usize;
            if keys::cmp_ids(node_id[node], smallest[root]) == std::cmp::Ordering::Less {
                smallest[root] = node_id[node];
            }
        }
        for slot in people.slots.iter_mut() {
            if slot[0] != 0 {
                let root = find(&mut parent, slot[1] as u32) as usize;
                slot[1] = name_key(smallest[root]);
            }
        }
        people.linked = nodes;
        people
    }

    #[inline(always)]
    fn intern(&mut self, key: u64, id: u64, node_id: &mut Vec<u64>, parent: &mut Vec<u32>) -> u32 {
        let mut slot = self.home(key);
        loop {
            let entry = &mut self.slots[slot];
            if entry[0] == key && (key & EX == 0 || keys::same_ref(self.ids[slot], id)) {
                return entry[1] as u32;
            }
            if entry[0] == 0 {
                let node = node_id.len() as u32;
                entry[0] = key;
                entry[1] = u64::from(node);
                self.ids[slot] = id;
                node_id.push(id);
                parent.push(node);
                return node;
            }
            slot = (slot + 1) & self.mask;
        }
    }

    #[inline(always)]
    pub fn prefetch_key(&self, key: u64) {
        let home = self.home(key);
        unsafe {
            prefetch(self.slots.as_ptr().add(home));
            if key & EX != 0 {
                prefetch(self.ids.as_ptr().add(home));
            }
        }
    }

    #[cfg(test)]
    pub fn get(&self, key: u64, id: u64) -> Option<u64> {
        let mut slot = self.home(key);
        loop {
            let entry = unsafe { self.slots.get_unchecked(slot) };
            if entry[0] == key && (key & EX == 0 || keys::same_ref(unsafe { *self.ids.get_unchecked(slot) }, id)) {
                return Some(entry[1]);
            }
            if entry[0] == 0 {
                return None;
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

    #[inline(always)]
    pub fn slot_of(&self, key: u64) -> usize {
        let mut slot = self.home(key);
        loop {
            let k = unsafe { self.slots.get_unchecked(slot) }[0];
            if k == key || k == 0 {
                return slot;
            }
            slot = (slot + 1) & self.mask;
        }
    }

    #[inline(always)]
    pub fn at(&self, slot: usize) -> [u64; 2] {
        unsafe { *self.slots.get_unchecked(slot) }
    }

    #[inline(always)]
    pub fn id_at(&self, slot: usize) -> u64 {
        unsafe { *self.ids.get_unchecked(slot) }
    }

    #[inline(always)]
    pub fn resolve(&self, slot: usize, key: u64, id: u64) -> Option<u64> {
        let entry = self.at(slot);
        if entry[0] == 0 {
            None
        } else if key & EX == 0 || keys::same_ref(self.id_at(slot), id) {
            Some(entry[1])
        } else {
            self.get_after(slot, key, id)
        }
    }

    #[cold]
    #[inline(never)]
    fn get_after(&self, slot: usize, key: u64, id: u64) -> Option<u64> {
        let mut slot = (slot + 1) & self.mask;
        loop {
            let entry = self.at(slot);
            if entry[0] == key && keys::same_ref(self.id_at(slot), id) {
                return Some(entry[1]);
            }
            if entry[0] == 0 {
                return None;
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
    use crate::fast::keys::{id_of, key_of_id};

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
            (b"ua73fd0bf12efc90bf96d5d32db51ae44", b"ub73fd0bf12efc90bf96d5d32db51ae44"),
            (b"ub73fd0bf12efc90bf96d5d32db51ae44", b"uc73fd0bf12efc90bf96d5d32db51ae44"),
        ];
        let id = |s: &[u8]| id_of(s.to_vec().leak());
        let pairs: Vec<[u64; 4]> = raw
            .iter()
            .map(|&(a, b)| {
                let (ia, ib) = (id(a), id(b));
                [key_of_id(ia), ia, key_of_id(ib), ib]
            })
            .collect();
        let people = People::build(&pairs);
        let name = |s: &[u8]| {
            let i = id(s);
            let person = people.get(key_of_id(i), i).unwrap_or(i);
            let mut out = Vec::new();
            keys::id_bytes(person & !LNK, &mut out);
            out
        };
        assert_eq!(name(b"u3"), b"U7");
        assert_eq!(name(b"u2"), b"U7");
        assert_eq!(name(b"u10"), b"u10");
        assert_eq!(name(b"x4"), b"long id with spaces");
        assert_eq!(name(b"q"), b" x");
        assert_eq!(name(b"u1"), b"u1");
        assert_eq!(name(b"uc73fd0bf12efc90bf96d5d32db51ae44"), b"ua73fd0bf12efc90bf96d5d32db51ae44");
        assert_eq!(name(b"ud73fd0bf12efc90bf96d5d32db51ae44"), b"ud73fd0bf12efc90bf96d5d32db51ae44");
        for s in [&b"u3"[..], b"u1", b"ub73fd0bf12efc90bf96d5d32db51ae44", b"ud73fd0bf12efc90bf96d5d32db51ae44", b"q"] {
            let i = id(s);
            let k = key_of_id(i);
            assert_eq!(people.resolve(people.slot_of(k), k, i), people.get(k, i));
        }
    }
}
