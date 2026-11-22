use super::id::{Domain, Key};

pub struct People {
    shift: u32,
    mask: usize,
    slots: &'static mut [[Key; 2]],
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

impl People {
    #[inline(always)]
    fn home(&self, key: Key) -> usize {
        (key.hash() >> self.shift) as usize
    }

    pub fn build(pairs: &[(Key, Key)], domain: &Domain) -> People {
        let size = (pairs.len() * 3).next_power_of_two().max(64);
        let memory = super::sink::region(size * std::mem::size_of::<[Key; 2]>());
        let mut people = People {
            shift: 64 - size.trailing_zeros(),
            mask: size - 1,
            slots: unsafe { std::slice::from_raw_parts_mut(memory as *mut [Key; 2], size) },
            linked: 0,
        };
        // Only root entries carry live component minima. Original interned
        // identities remain immutable in slots[][0], separate from this state.
        let mut root_min: Vec<Key> = Vec::with_capacity(pairs.len() + 16);
        let mut parent: Vec<u32> = Vec::with_capacity(pairs.len() + 16);
        const BATCH: usize = 16;
        for batch in pairs.chunks(BATCH) {
            for &(a, b) in batch {
                prefetch(&people.slots[people.home(a)]);
                prefetch(&people.slots[people.home(b)]);
            }
            for &(a, b) in batch {
                let na = people.intern(a, &mut root_min, &mut parent);
                let nb = people.intern(b, &mut root_min, &mut parent);
                let ra = find(&mut parent, na);
                let rb = find(&mut parent, nb);
                if ra != rb {
                    let (low, high) = if ra < rb { (ra, rb) } else { (rb, ra) };
                    // Both entries are authoritative roots before this union;
                    // afterwards only the surviving low root is consulted.
                    if domain.cmp(root_min[high as usize], root_min[low as usize])
                        == std::cmp::Ordering::Less
                    {
                        root_min[low as usize] = root_min[high as usize];
                    }
                    parent[high as usize] = low;
                }
            }
        }
        let nodes = root_min.len();
        for slot in people.slots.iter_mut() {
            if slot[0] != Key::default() {
                let root = find(&mut parent, slot[1].lo as u32) as usize;
                slot[1] = root_min[root];
            }
        }
        people.linked = nodes;
        people
    }

    #[inline(always)]
    fn intern(&mut self, key: Key, root_min: &mut Vec<Key>, parent: &mut Vec<u32>) -> u32 {
        let mut slot = self.home(key);
        loop {
            let entry = &mut self.slots[slot];
            if entry[0] == key {
                return entry[1].lo as u32;
            }
            if entry[0] == Key::default() {
                let node = root_min.len() as u32;
                entry[0] = key;
                entry[1] = Key { hi: 0, lo: u64::from(node) };
                root_min.push(key);
                parent.push(node);
                return node;
            }
            slot = (slot + 1) & self.mask;
        }
    }

    #[inline(always)]
    pub fn slot_ptr(&self, key: Key) -> *const [Key; 2] {
        unsafe { self.slots.as_ptr().add(self.home(key)) }
    }

    #[inline(always)]
    pub fn name_of(&self, key: Key) -> Key {
        self.resolve(key).0
    }

    /// Membership in the parsed link graph is distinct from having a different
    /// canonical name: a component's smallest ID still has aliases. Self links
    /// conservatively count as membership, too.
    #[inline(always)]
    pub fn resolve(&self, key: Key) -> (Key, bool) {
        let mut slot = self.home(key);
        loop {
            let entry = unsafe { self.slots.get_unchecked(slot) };
            if entry[0] == key {
                return (entry[1], true);
            }
            if entry[0] == Key::default() {
                return (key, false);
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
    use std::collections::{BTreeMap, BTreeSet, VecDeque};

    type RawPair = (Vec<u8>, Vec<u8>);

    // This control never uses Key ordering, union-find roots or production
    // component state. It traverses the graph of original byte strings.
    fn graph_oracle(pairs: &[RawPair]) -> BTreeMap<Vec<u8>, Vec<u8>> {
        let names: BTreeSet<Vec<u8>> = pairs.iter().flat_map(|(a, b)| [a.clone(), b.clone()]).collect();
        let names: Vec<_> = names.into_iter().collect();
        let indices: BTreeMap<_, _> = names.iter().cloned().enumerate().map(|(i, name)| (name, i)).collect();
        let mut adjacent = vec![Vec::new(); names.len()];
        for (a, b) in pairs {
            let a = indices[a];
            let b = indices[b];
            adjacent[a].push(b);
            adjacent[b].push(a);
        }
        let mut visited = vec![false; names.len()];
        let mut expected = BTreeMap::new();
        for first in 0..names.len() {
            if visited[first] { continue; }
            let mut queue = VecDeque::from([first]);
            let mut component = Vec::new();
            let mut minimum = names[first].clone();
            visited[first] = true;
            while let Some(node) = queue.pop_front() {
                component.push(node);
                if names[node].as_slice() < minimum.as_slice() {
                    minimum.clone_from(&names[node]);
                }
                for &next in &adjacent[node] {
                    if !visited[next] {
                        visited[next] = true;
                        queue.push_back(next);
                    }
                }
            }
            for node in component {
                expected.insert(names[node].clone(), minimum.clone());
            }
        }
        expected
    }

    fn assert_graph(pairs: &[RawPair], domain: &Domain) {
        let expected = graph_oracle(pairs);
        let encoded: Vec<_> = pairs.iter().map(|(a, b)| (domain.encode(a), domain.encode(b))).collect();
        let people = People::build(&encoded, domain);
        assert_eq!(people.linked(), expected.len());
        for (name, minimum) in &expected {
            let key = domain.encode(name);
            assert_ne!(key, Key::default());
            let (resolved, linked) = people.resolve(key);
            assert!(linked, "graph member must remain linked: {name:?}");
            assert_eq!(people.name_of(key), resolved);
            let mut actual = Vec::new();
            domain.bytes_of(resolved, &mut actual);
            assert_eq!(&actual, minimum, "BFS byte minimum for {name:?}");
            assert_eq!(resolved, domain.encode(minimum));
        }
        // Original lookup keys must survive updates to their numeric roots'
        // minimum values; otherwise repeated interning can silently lose a key.
        let mut originals = BTreeSet::new();
        for slot in people.slots.iter().filter(|slot| slot[0] != Key::default()) {
            let mut name = Vec::new();
            let mut minimum = Vec::new();
            domain.bytes_of(slot[0], &mut name);
            domain.bytes_of(slot[1], &mut minimum);
            assert_eq!(expected.get(&name), Some(&minimum));
            assert!(originals.insert(name));
        }
        assert_eq!(originals, expected.keys().cloned().collect::<BTreeSet<_>>());
        for name in [b"Absent-Raw-Graph-Vertex".as_slice(), b"uNOT_PRESENT", b"\xff-not-a-vertex"] {
            assert!(!expected.contains_key(name));
            let key = domain.encode(name);
            assert_eq!(people.resolve(key), (key, false));
        }
    }

    fn ordered_variants(pairs: &[RawPair]) -> Vec<Vec<RawPair>> {
        let mut reversed = pairs.to_vec();
        reversed.reverse();
        let swapped = pairs.iter().map(|(a, b)| (b.clone(), a.clone())).collect();
        let mut rotated = pairs.to_vec();
        if !rotated.is_empty() {
            let shift = rotated.len() / 3;
            rotated.rotate_left(shift);
        }
        vec![pairs.to_vec(), reversed, swapped, rotated]
    }

    #[test]
    fn online_minimum_keeps_original_lookup_keys_after_repeated_root_changes() {
        let edges: &[(&[u8], &[u8])] = &[
            (b"uzz", b"uyy"),
            (b"uww", b"uvv"),
            (b"uzz", b"uww"),
            (b"u99", b"u88"),
            (b"uww", b"u99"),
            (b"uzz", b"u00"),
            (b"u00", b"u0"),
            (b"u9", b"u000000001"),
            (b"uyy", b"u000000001"),
            (b"u0", b"U7"),
            (b"U7", b" leading minimum"),
            (b"uzz", b"uyy"),
            (b"uvv", b" leading minimum"),
        ];
        let pairs: Vec<_> = edges.iter().map(|(a, b)| (a.to_vec(), b.to_vec())).collect();
        let domain = Domain::with_prefix(b'u');
        for (end, minimum) in [(1, b"uyy".as_slice()), (3, b"uvv"), (5, b"u88"),
            (7, b"u0"), (10, b"U7"), (13, b" leading minimum")] {
            let prefix = &pairs[..end];
            assert_eq!(graph_oracle(prefix).get(b"uzz".as_slice()).map(Vec::as_slice), Some(minimum));
            assert_graph(prefix, &domain);
        }
    }

    #[test]
    fn online_minimum_matches_bfs_across_tags_cycles_and_edge_orders() {
        let components: &[&[&[u8]]] = &[
            &[b"u~~~~~~~~", b"u000000001", b"u9"],
            &[b"u00", b"u00000000000000010000000000000000", b"u000000000"],
            &[b"u12345678", b"u0123456789abcdef0123456789abcdef", b"uzz"],
            &[b"u\xff\xff\xff\xff\xff\xff\xff\xff", b"v-alias", b"u\0suffix"],
            &[b" leading space", b"Upper", b"\xffopaque", b"\0root"],
            &[b"self-only"],
        ];
        let mut pairs = Vec::new();
        for names in components {
            for i in 0..names.len() {
                pairs.push((names[i].to_vec(), names[(i + 1) % names.len()].to_vec()));
                pairs.push((names[i].to_vec(), names[i].to_vec()));
            }
            pairs.push((names[0].to_vec(), names[names.len() - 1].to_vec()));
        }
        let domain = Domain::with_prefix(b'u');
        assert_eq!(domain.encode(b"u~~~~~~~~").hi, 0);
        assert_eq!(domain.encode(b"u000000001").hi, super::super::id::EXTENDED_SHORT);
        assert_eq!(domain.encode(b"u00000000000000010000000000000000").hi, 1);
        assert_eq!(domain.encode(b"u\0suffix").hi, super::super::id::ODD);
        for variant in ordered_variants(&pairs) {
            assert_graph(&variant, &domain);
        }
        assert_graph(&pairs, &Domain::bare());
    }

    #[test]
    fn online_minimum_handles_descending_numeric_chains_and_shared_roots() {
        let names: Vec<Vec<u8>> = (0..1024).map(|i| match i % 4 {
            0 => format!("u{i:08x}").into_bytes(),
            1 => format!("u{i:09x}").into_bytes(),
            2 => format!("u123456789abcdef0{i:016x}").into_bytes(),
            _ => format!("Opaque-{i}").into_bytes(),
        }).collect();
        // Assign every numeric node before connecting them in descending
        // numeric order, so the final scan must resolve a long parent chain.
        let mut pairs: Vec<_> = names.iter().map(|name| (name.clone(), name.clone())).collect();
        for i in (1..names.len()).rev() {
            pairs.push((names[i].clone(), names[i - 1].clone()));
        }
        for i in (0..names.len()).step_by(17) {
            pairs.push((names[i].clone(), names[(i + 503) % names.len()].clone()));
            pairs.push((names[i].clone(), names[0].clone()));
        }
        pairs.push((names[1023].clone(), b" late byte minimum".to_vec()));
        pairs.push((names[0].clone(), b" late byte minimum".to_vec()));
        pairs.push((b"Separate-self-root".to_vec(), b"Separate-self-root".to_vec()));
        let domain = Domain::with_prefix(b'u');
        assert_graph(&pairs, &domain);
        pairs.reverse();
        assert_graph(&pairs, &domain);
    }

    #[test]
    fn online_minimum_matches_bfs_for_seeded_disconnected_graphs_and_late_bridges() {
        let names: Vec<Vec<u8>> = (0..96).map(|i| match i % 4 {
            0 => format!("u{i:08x}").into_bytes(),
            1 => format!("u{i:09x}").into_bytes(),
            2 => format!("uabcdef0123456789{i:016x}").into_bytes(),
            _ => format!("opaque graph vertex {i}").into_bytes(),
        }).collect();
        let mut state = 0x243f_6a88_85a3_08d3u64;
        let mut pairs = Vec::new();
        for _ in 0..240 {
            state = state.wrapping_mul(0x5851_f42d_4c95_7f2d).wrapping_add(1);
            let group = (state >> 32) as usize % 8;
            let a = group * 12 + (state >> 8) as usize % 12;
            let b = group * 12 + (state >> 48) as usize % 12;
            pairs.push((names[a].clone(), names[b].clone()));
        }
        // Bridge only selected groups; the remaining components must retain
        // their own minima and all self-link memberships independently.
        pairs.extend([(names[0].clone(), names[36].clone()),
            (names[12].clone(), names[84].clone()), (names[47].clone(), names[48].clone())]);
        for name in &names { pairs.push((name.clone(), name.clone())); }
        let domain = Domain::with_prefix(b'u');
        for variant in ordered_variants(&pairs) { assert_graph(&variant, &domain); }
    }

    #[test]
    fn online_minimum_preserves_empty_graph_self_links_and_duplicate_membership() {
        let domain = Domain::with_prefix(b'u');
        assert_graph(&[], &domain);
        let names: [&[u8]; 4] = [b"u0", b"u000000001", b"u0123456789abcdef0123456789abcdef", b"self opaque"];
        let mut pairs = Vec::new();
        for name in names {
            for _ in 0..5 { pairs.push((name.to_vec(), name.to_vec())); }
        }
        assert_graph(&pairs, &domain);
        pairs.extend([(names[1].to_vec(), names[0].to_vec()), (names[0].to_vec(), names[1].to_vec())]);
        assert_graph(&pairs, &domain);
    }

    #[test]
    fn resolve_distinguishes_unlinked_canonical_roots_and_self_links() {
        let domain = Domain::with_prefix(b'u');
        let key = |name: &[u8]| domain.encode(name);
        let pairs = [
            (key(b"alias-z"), key(b"alias-m")),
            (key(b"alias-m"), key(b"0-link-only-root")),
            (key(b"self"), key(b"self")),
        ];
        let people = People::build(&pairs, &domain);
        let root = key(b"0-link-only-root");
        assert_eq!(people.resolve(root), (root, true));
        assert_eq!(people.resolve(key(b"alias-z")), (root, true));
        assert_eq!(people.resolve(key(b"alias-m")), (root, true));
        assert_eq!(people.resolve(key(b"self")), (key(b"self"), true));
        assert_eq!(people.resolve(key(b"absent")), (key(b"absent"), false));
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
