use std::sync::atomic::AtomicU32;

use super::ids::{self, Bytes, Interner, Key};
use super::sink::{Arena, Sink};

pub struct LinkSpace {
    pub export: Sink<Key>,
    pub names: Vec<u32>,
    pub l2g: Vec<AtomicU32>,
    pub lines: usize,
}

fn find(parent: &mut [u32], mut node: u32) -> u32 {
    while parent[node as usize] != node {
        let grandparent = parent[parent[node as usize] as usize];
        parent[node as usize] = grandparent;
        node = grandparent;
    }
    node
}

pub fn names(pairs: &[(u32, u32)], keys: &[Key]) -> Vec<u32> {
    let nodes = keys.len();
    let mut parent: Vec<u32> = (0..nodes as u32).collect();
    for &(a, b) in pairs {
        let ra = find(&mut parent, a);
        let rb = find(&mut parent, b);
        if ra != rb {
            let (low, high) = if ra < rb { (ra, rb) } else { (rb, ra) };
            parent[high as usize] = low;
        }
    }
    let mut best: Vec<u32> = (0..nodes as u32).collect();
    for node in 0..nodes {
        let root = find(&mut parent, node as u32) as usize;
        if ids::cmp(&keys[node], &keys[best[root] as usize]) == std::cmp::Ordering::Less {
            best[root] = node as u32;
        }
    }
    (0..nodes).map(|node| best[find(&mut parent, node as u32) as usize]).collect()
}

pub fn finish(mut interner: Interner, pairs: &[(u32, u32)], arena: &mut Arena) -> LinkSpace {
    let keys = interner.keys.take().unwrap_or_default();
    let names = names(pairs, &keys);
    interner.export.finish(arena);
    interner.release();
    let count = interner.count() as usize;
    LinkSpace {
        export: interner.export,
        names,
        l2g: (0..count).map(|_| AtomicU32::new(0)).collect(),
        lines: pairs.len(),
    }
}

pub fn intern_pair(interner: &mut Interner, a: &[u8], b: &[u8], arena: &mut Arena, bytes: &mut Bytes) -> (u32, u32) {
    unsafe {
        (
            interner.field(a.as_ptr(), a.len(), arena, bytes),
            interner.field(b.as_ptr(), b.len(), arena, bytes),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_are_smallest() {
        super::super::sink::reserve(64 << 20);
        let raw: Vec<(&[u8], &[u8])> = vec![
            (b"u3", b"u9"),
            (b"u9", b"u2"),
            (b"U7", b"u9"),
            (b"u10", b"u10"),
            (b"x5", b"x4"),
            (b"x3", b"x5"),
            (b"long id with spaces", b"x4"),
            (b" x", b"q"),
            (b"ef376137f899ba8d80f3df1e87ce0fc50", b"zz"),
            (b"ef376137f899ba8d80f3df1e87ce0fc4", b"zz"),
        ];
        let mut arena = Arena::new();
        let mut bytes = Bytes::new();
        let mut interner = Interner::new(16, 4, 16, true);
        let mut pairs = Vec::new();
        for (a, b) in &raw {
            let mut pa = a.to_vec();
            pa.resize(a.len() + 16, 0);
            let mut pb = b.to_vec();
            pb.resize(b.len() + 16, 0);
            pairs.push(intern_pair(&mut interner, &pa[..a.len()], &pb[..b.len()], &mut arena, &mut bytes));
        }
        let keys = interner.keys.clone().unwrap();
        let names = names(&pairs, &keys);
        let name = |id: &[u8]| {
            let local = (0..keys.len()).find(|&i| ids::with_bytes(&keys[i], |s| s == id)).unwrap();
            let mut out = Vec::new();
            ids::write_bytes(&keys[names[local] as usize], &mut out);
            out
        };
        assert_eq!(name(b"u3"), b"U7");
        assert_eq!(name(b"u2"), b"U7");
        assert_eq!(name(b"u10"), b"u10");
        assert_eq!(name(b"x4"), b"long id with spaces");
        assert_eq!(name(b"q"), b" x");
        assert_eq!(name(b"zz"), b"ef376137f899ba8d80f3df1e87ce0fc4");
    }
}
