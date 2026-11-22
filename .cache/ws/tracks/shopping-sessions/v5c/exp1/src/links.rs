use rayon::prelude::*;

use crate::csv;
use crate::hash::{new_map, FastMap};

pub struct People<'a> {
    name_of_linked: FastMap<&'a [u8], &'a [u8]>,
}

impl<'a> People<'a> {
    pub fn from_link_files(files: &'a [Vec<u8>]) -> People<'a> {
        let pairs: Vec<(&[u8], &[u8])> = files
            .par_iter()
            .flat_map_iter(|file| {
                csv::rows(file).filter_map(|line| {
                    let [a, b] = csv::fields::<2>(line)?;
                    (!a.is_empty() && !b.is_empty()).then_some((a, b))
                })
            })
            .collect();
        People::from_pairs(&pairs)
    }

    pub fn from_pairs(pairs: &[(&'a [u8], &'a [u8])]) -> People<'a> {
        let mut index: FastMap<&[u8], u32> = new_map(pairs.len() * 2);
        let mut ids: Vec<&[u8]> = Vec::with_capacity(pairs.len() * 2);
        let mut parent: Vec<u32> = Vec::with_capacity(pairs.len() * 2);
        let mut intern = |id: &'a [u8], ids: &mut Vec<&'a [u8]>, parent: &mut Vec<u32>| -> u32 {
            *index.entry(id).or_insert_with(|| {
                ids.push(id);
                parent.push(parent.len() as u32);
                (ids.len() - 1) as u32
            })
        };
        for &(a, b) in pairs {
            let a = intern(a, &mut ids, &mut parent);
            let b = intern(b, &mut ids, &mut parent);
            let (root_a, root_b) = (find(&mut parent, a), find(&mut parent, b));
            if root_a != root_b {
                let (low, high) = if root_a < root_b {
                    (root_a, root_b)
                } else {
                    (root_b, root_a)
                };
                parent[high as usize] = low;
            }
        }
        let mut smallest: Vec<&[u8]> = ids.clone();
        for member in 0..ids.len() as u32 {
            let root = find(&mut parent, member) as usize;
            if ids[member as usize] < smallest[root] {
                smallest[root] = ids[member as usize];
            }
        }
        let mut name_of_linked = new_map(ids.len());
        for member in 0..ids.len() as u32 {
            let root = find(&mut parent, member) as usize;
            name_of_linked.insert(ids[member as usize], smallest[root]);
        }
        People { name_of_linked }
    }

    #[inline]
    pub fn name_of(&self, id: &'a [u8]) -> &'a [u8] {
        self.name_of_linked.get(id).copied().unwrap_or(id)
    }

    pub fn linked_ids(&self) -> usize {
        self.name_of_linked.len()
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transitive_names() {
        let pairs: Vec<(&[u8], &[u8])> = vec![
            (b"u3", b"u9"),
            (b"u9", b"u2"),
            (b"U7", b"u9"),
            (b"u10", b"u10"),
            (b"x5", b"x4"),
            (b"x3", b"x5"),
        ];
        let people = People::from_pairs(&pairs);
        assert_eq!(people.name_of(b"u3"), b"U7");
        assert_eq!(people.name_of(b"u2"), b"U7");
        assert_eq!(people.name_of(b"u10"), b"u10");
        assert_eq!(people.name_of(b"x4"), b"x3");
        assert_eq!(people.name_of(b"u1"), b"u1");
    }

    #[test]
    fn link_lines() {
        let file = b"user_id_a,user_id_b\nu1,u2,u3\nu1,\n,u3\nu1,u5\"\n\"u4\",\"u1\"\nu4,u1\nu6,u6\n\nu1\nuser_id_a,user_id_b\nu4,user_id_b\n\"A\tB\",user_id_a\n".to_vec();
        let files = vec![file];
        let people = People::from_link_files(&files);
        for id in [&b"u1"[..], b"u4", b"user_id_a", b"user_id_b", b"A\tB"] {
            assert_eq!(people.name_of(id), b"A\tB");
        }
        assert_eq!(people.name_of(b"u2"), b"u2");
        assert_eq!(people.name_of(b"u3"), b"u3");
        assert_eq!(people.name_of(b"u5"), b"u5");
        assert_eq!(people.name_of(b"u6"), b"u6");
    }

    #[test]
    fn star_names_smallest_member() {
        let files = vec![b"user_id_a,user_id_b\nu11bj6nfh,ud0dm7f0a\nu11bj6nfh,u100jiplm\n".to_vec()];
        let people = People::from_link_files(&files);
        for id in [&b"u11bj6nfh"[..], b"ud0dm7f0a", b"u100jiplm"] {
            assert_eq!(people.name_of(id), b"u100jiplm");
        }
    }
}
