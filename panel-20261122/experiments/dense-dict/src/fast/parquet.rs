use std::fs::{self, File, Permissions};
use std::io::Write;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use crate::input::Result;

const PAGE_ROWS: usize = 1 << 16;

#[derive(Clone, Copy, PartialEq)]
pub enum Kind {
    Str,
    OptStr,
    Date,
    I32,
    I64,
}

pub struct Column<'a> {
    pub name: &'a str,
    pub kind: Kind,
    pub fill: &'a (dyn Fn(usize, usize, &mut Vec<u8>, &mut Vec<u8>) + Sync),
    pub dictionary: Option<&'a Dictionary>,
}

pub struct Dictionary {
    pub values: Vec<u8>,
    pub count: u32,
    pub indices: Vec<u32>,
}

struct Thrift {
    out: Vec<u8>,
    last: Vec<i16>,
}

impl Thrift {
    fn new() -> Thrift {
        Thrift {
            out: Vec::with_capacity(4096),
            last: vec![0],
        }
    }

    fn varint(&mut self, mut v: u64) {
        while v >= 0x80 {
            self.out.push(v as u8 | 0x80);
            v >>= 7;
        }
        self.out.push(v as u8);
    }

    fn field(&mut self, id: i16, ty: u8) {
        let last = self.last.last_mut().unwrap();
        let delta = id - *last;
        *last = id;
        if delta > 0 && delta <= 15 {
            self.out.push((delta as u8) << 4 | ty);
        } else {
            self.out.push(ty);
            let z = ((i32::from(id) << 1) ^ (i32::from(id) >> 31)) as u32;
            self.varint(u64::from(z));
        }
    }

    fn i32(&mut self, id: i16, v: i32) {
        self.field(id, 5);
        self.varint(u64::from(((v << 1) ^ (v >> 31)) as u32));
    }

    fn i64(&mut self, id: i16, v: i64) {
        self.field(id, 6);
        self.varint(((v << 1) ^ (v >> 63)) as u64);
    }

    fn binary(&mut self, id: i16, b: &[u8]) {
        self.field(id, 8);
        self.varint(b.len() as u64);
        self.out.extend_from_slice(b);
    }

    fn begin(&mut self, id: i16) {
        self.field(id, 12);
        self.last.push(0);
    }

    fn open(&mut self) {
        self.last.push(0);
    }

    fn end(&mut self) {
        self.out.push(0);
        self.last.pop();
    }

    fn list(&mut self, id: i16, elem: u8, n: usize) {
        self.field(id, 9);
        if n < 15 {
            self.out.push((n as u8) << 4 | elem);
        } else {
            self.out.push(0xf0 | elem);
            self.varint(n as u64);
        }
    }

    fn list_i32(&mut self, v: i32) {
        self.varint(u64::from(((v << 1) ^ (v >> 31)) as u32));
    }

    fn list_binary(&mut self, b: &[u8]) {
        self.varint(b.len() as u64);
        self.out.extend_from_slice(b);
    }
}

struct Chunk {
    offset: usize,
    data_offset: usize,
    dictionary: bool,
    size: usize,
    values: usize,
}

fn physical(kind: Kind) -> i32 {
    match kind {
        Kind::Str | Kind::OptStr => 6,
        Kind::Date | Kind::I32 => 1,
        Kind::I64 => 2,
    }
}

fn bit_pack(defs: &[u8], out: &mut Vec<u8>) {
    for run in defs.chunks(8 * 1024) {
        let groups = run.len().div_ceil(8);
        let mut header = Thrift::new();
        header.varint(((groups as u64) << 1) | 1);
        out.extend_from_slice(&header.out);
        for group in run.chunks(8) {
            let mut byte = 0u8;
            for (i, &d) in group.iter().enumerate() {
                byte |= (d & 1) << i;
            }
            out.push(byte);
        }
    }
}

fn dictionary_indices(indices: &[u32], count: u32, out: &mut Vec<u8>) {
    let bits = (u32::BITS - (count - 1).leading_zeros()).max(1);
    let bytes = bits.div_ceil(8) as usize;
    out.push(bits as u8);
    let mut at = 0;
    while at < indices.len() {
        let value = indices[at];
        let mut end = at + 1;
        while end < indices.len() && indices[end] == value {
            end += 1;
        }
        let mut run = ((end - at) as u64) << 1;
        while run >= 0x80 {
            out.push(run as u8 | 0x80);
            run >>= 7;
        }
        out.push(run as u8);
        out.extend_from_slice(&value.to_le_bytes()[..bytes]);
        at = end;
    }
}

pub fn encode(columns: &[Column], rows: usize) -> Vec<u8> {
    let mut file: Vec<u8> = Vec::with_capacity(rows * 48 + 4096);
    file.extend_from_slice(b"PAR1");
    let mut chunks: Vec<Chunk> = Vec::with_capacity(columns.len());
    let mut values: Vec<u8> = Vec::new();
    let mut defs: Vec<u8> = Vec::new();
    let mut levels: Vec<u8> = Vec::new();
    if rows > 0 {
        for column in columns {
            let offset = file.len();
            if let Some(dictionary) = column.dictionary {
                assert!(column.kind == Kind::Str && dictionary.count > 0);
                assert_eq!(dictionary.indices.len(), rows);
                let mut header = Thrift::new();
                header.i32(1, 2);
                header.i32(2, dictionary.values.len() as i32);
                header.i32(3, dictionary.values.len() as i32);
                header.begin(7);
                header.i32(1, dictionary.count as i32);
                header.i32(2, 0);
                header.end();
                header.out.push(0);
                file.extend_from_slice(&header.out);
                file.extend_from_slice(&dictionary.values);
            }
            let data_offset = file.len();
            let mut start = 0;
            while start < rows {
                let end = (start + PAGE_ROWS).min(rows);
                values.clear();
                defs.clear();
                if let Some(dictionary) = column.dictionary {
                    dictionary_indices(&dictionary.indices[start..end], dictionary.count, &mut values);
                } else {
                    (column.fill)(start, end, &mut values, &mut defs);
                }
                levels.clear();
                if column.kind == Kind::OptStr {
                    let mut packed = Vec::with_capacity(defs.len() / 8 + 16);
                    bit_pack(&defs, &mut packed);
                    levels.extend_from_slice(&(packed.len() as u32).to_le_bytes());
                    levels.extend_from_slice(&packed);
                }
                let size = levels.len() + values.len();
                let mut header = Thrift::new();
                header.i32(1, 0);
                header.i32(2, size as i32);
                header.i32(3, size as i32);
                header.begin(5);
                header.i32(1, (end - start) as i32);
                header.i32(2, if column.dictionary.is_some() { 8 } else { 0 });
                header.i32(3, 3);
                header.i32(4, 3);
                header.end();
                header.out.push(0);
                file.extend_from_slice(&header.out);
                file.extend_from_slice(&levels);
                file.extend_from_slice(&values);
                start = end;
            }
            chunks.push(Chunk {
                offset,
                data_offset,
                dictionary: column.dictionary.is_some(),
                size: file.len() - offset,
                values: rows,
            });
        }
    }
    let mut meta = Thrift::new();
    meta.i32(1, 1);
    meta.list(2, 12, columns.len() + 1);
    meta.open();
    meta.binary(4, b"schema");
    meta.i32(5, columns.len() as i32);
    meta.end();
    for column in columns {
        meta.open();
        meta.i32(1, physical(column.kind));
        meta.i32(3, i32::from(column.kind == Kind::OptStr));
        meta.binary(4, column.name.as_bytes());
        match column.kind {
            Kind::Str | Kind::OptStr => {
                meta.i32(6, 0);
                meta.begin(10);
                meta.begin(1);
                meta.end();
                meta.end();
            }
            Kind::Date => {
                meta.i32(6, 6);
                meta.begin(10);
                meta.begin(6);
                meta.end();
                meta.end();
            }
            Kind::I32 | Kind::I64 => {}
        }
        meta.end();
    }
    meta.i64(3, rows as i64);
    if rows > 0 {
        let total: usize = chunks.iter().map(|c| c.size).sum();
        meta.list(4, 12, 1);
        meta.open();
        meta.list(1, 12, columns.len());
        for (column, chunk) in columns.iter().zip(&chunks) {
            meta.open();
            meta.i64(2, chunk.offset as i64);
            meta.begin(3);
            meta.i32(1, physical(column.kind));
            meta.list(2, 5, if chunk.dictionary { 3 } else { 2 });
            meta.list_i32(0);
            meta.list_i32(3);
            if chunk.dictionary {
                meta.list_i32(8);
            }
            meta.list(3, 8, 1);
            meta.list_binary(column.name.as_bytes());
            meta.i32(4, 0);
            meta.i64(5, chunk.values as i64);
            meta.i64(6, chunk.size as i64);
            meta.i64(7, chunk.size as i64);
            meta.i64(9, chunk.data_offset as i64);
            if chunk.dictionary {
                meta.i64(11, chunk.offset as i64);
            }
            meta.end();
            meta.end();
        }
        meta.i64(2, total as i64);
        meta.i64(3, rows as i64);
        meta.end();
    } else {
        meta.list(4, 12, 0);
    }
    meta.binary(6, b"sessions");
    meta.out.push(0);
    file.extend_from_slice(&meta.out);
    file.extend_from_slice(&(meta.out.len() as u32).to_le_bytes());
    file.extend_from_slice(b"PAR1");
    file
}

pub fn write(path: &Path, columns: &[Column], rows: usize) -> Result<()> {
    let bytes = encode(columns, rows);
    let mut file = File::create(path).map_err(|e| format!("{}: {e}", path.display()))?;
    file.write_all(&bytes)?;
    let _ = fs::set_permissions(path, Permissions::from_mode(0o666));
    Ok(())
}

#[inline]
pub fn put_i32(out: &mut Vec<u8>, v: i32) {
    out.extend_from_slice(&v.to_le_bytes());
}

#[inline]
pub fn put_i64(out: &mut Vec<u8>, v: i64) {
    out.extend_from_slice(&v.to_le_bytes());
}

#[inline]
pub fn put_str(out: &mut Vec<u8>, s: &[u8]) {
    out.extend_from_slice(&(s.len() as u32).to_le_bytes());
    out.extend_from_slice(s);
}
