use std::marker::PhantomData;
use std::ptr;

const REGION: usize = 64 << 20;

pub struct Arena {
    next: *mut u8,
    end: *mut u8,
    regions: Vec<(*mut u8, usize)>,
    spare: Vec<*mut u8>,
    piece: usize,
}

unsafe impl Send for Arena {}

pub fn map_anonymous(bytes: usize) -> *mut u8 {
    unsafe {
        let p = libc::mmap(
            ptr::null_mut(),
            bytes,
            libc::PROT_READ | libc::PROT_WRITE,
            libc::MAP_PRIVATE | libc::MAP_ANONYMOUS | libc::MAP_NORESERVE,
            -1,
            0,
        );
        if p == libc::MAP_FAILED {
            eprintln!("error: out of memory mapping {bytes} bytes");
            libc::_exit(1);
        }
        libc::madvise(p, bytes, libc::MADV_HUGEPAGE);
        p as *mut u8
    }
}

impl Arena {
    pub fn new() -> Arena {
        Arena {
            next: ptr::null_mut(),
            end: ptr::null_mut(),
            regions: Vec::new(),
            spare: Vec::new(),
            piece: 0,
        }
    }

    pub fn recycle(&mut self, start: *mut u8, bytes: usize, piece: usize) {
        if piece == 0 || !piece.is_multiple_of(64) || !(start as usize).is_multiple_of(64) {
            return;
        }
        if self.piece != piece {
            self.spare.clear();
            self.piece = piece;
        }
        let mut at = 0;
        while at + piece <= bytes {
            self.spare.push(unsafe { start.add(at) });
            at += piece;
        }
    }

    pub fn release(&mut self) {
        for &(p, len) in &self.regions {
            unsafe { libc::munmap(p as *mut libc::c_void, len) };
        }
        self.regions.clear();
        self.spare = Vec::new();
        self.piece = 0;
        self.next = ptr::null_mut();
        self.end = ptr::null_mut();
    }

    #[inline]
    pub fn alloc(&mut self, bytes: usize) -> *mut u8 {
        let bytes = (bytes + 63) & !63;
        if bytes == self.piece {
            if let Some(p) = self.spare.pop() {
                return p;
            }
        }
        if (self.end as usize) - (self.next as usize) < bytes {
            let size = REGION.max(bytes);
            self.next = map_anonymous(size);
            self.end = unsafe { self.next.add(size) };
            self.regions.push((self.next, size));
        }
        let p = self.next;
        self.next = unsafe { self.next.add(bytes) };
        p
    }
}

const STAGE: usize = 128;

#[repr(C, align(64))]
#[derive(Clone, Copy)]
struct Line([u8; STAGE]);

pub struct Sink<T: Copy> {
    cur: Vec<*mut T>,
    end: Vec<*mut T>,
    full: Vec<Vec<*mut T>>,
    block: usize,
    stage: Vec<Line>,
    staged: Vec<u8>,
    per_stage: usize,
    lines: usize,
    _marker: PhantomData<T>,
}

unsafe impl<T: Copy> Send for Sink<T> {}
unsafe impl<T: Copy> Sync for Sink<T> {}

impl<T: Copy> Sink<T> {
    const PER_LINE: usize = STAGE / std::mem::size_of::<T>();
    const STREAM: bool = STAGE.is_multiple_of(std::mem::size_of::<T>()) && std::mem::size_of::<T>() <= 64;

    pub fn new(parts: usize, block: usize) -> Sink<T> {
        let block = block.div_ceil(Self::PER_LINE.max(1)) * Self::PER_LINE.max(1);
        let lines = if parts > 2048 { 1 } else { STAGE / 64 };
        Sink {
            per_stage: lines * 64 / std::mem::size_of::<T>(),
            lines,
            cur: vec![ptr::null_mut(); parts],
            end: vec![ptr::null_mut(); parts],
            full: (0..parts).map(|_| Vec::new()).collect(),
            block,
            stage: if Self::STREAM {
                vec![Line([0; STAGE]); parts]
            } else {
                Vec::new()
            },
            staged: if Self::STREAM { vec![0; parts] } else { Vec::new() },
            _marker: PhantomData,
        }
    }

    #[inline(always)]
    pub fn push(&mut self, arena: &mut Arena, part: usize, value: T) {
        unsafe {
            if Self::STREAM {
                let n = *self.staged.get_unchecked(part) as usize;
                let line = self.stage.as_mut_ptr().add(part) as *mut T;
                line.add(n).write(value);
                if n + 1 == self.per_stage {
                    *self.staged.get_unchecked_mut(part) = 0;
                    if *self.cur.get_unchecked(part) == *self.end.get_unchecked(part) {
                        self.refill(arena, part);
                    }
                    let cur = self.cur.get_unchecked_mut(part);
                    for k in 0..self.lines {
                        stream_line((line as *const u8).add(64 * k), (*cur as *mut u8).add(64 * k));
                    }
                    *cur = cur.add(self.per_stage);
                } else {
                    *self.staged.get_unchecked_mut(part) = (n + 1) as u8;
                }
                return;
            }
            let cur = *self.cur.get_unchecked(part);
            if cur == *self.end.get_unchecked(part) {
                self.refill(arena, part);
            }
            let cur = self.cur.get_unchecked_mut(part);
            cur.write(value);
            *cur = cur.add(1);
        }
    }

    pub fn finish(&mut self, arena: &mut Arena) {
        if Self::STREAM {
            for part in 0..self.cur.len() {
                let n = self.staged[part] as usize;
                for i in 0..n {
                    let value = unsafe { (self.stage.as_ptr().add(part) as *const T).add(i).read() };
                    if self.cur[part] == self.end[part] {
                        self.refill(arena, part);
                    }
                    unsafe {
                        self.cur[part].write(value);
                        self.cur[part] = self.cur[part].add(1);
                    }
                }
                self.staged[part] = 0;
            }
            fence();
        }
    }

    #[cold]
    #[inline(never)]
    fn refill(&mut self, arena: &mut Arena, part: usize) {
        let start = arena.alloc(self.block * std::mem::size_of::<T>()) as *mut T;
        if !self.cur[part].is_null() {
            let old = unsafe { self.end[part].sub(self.block) };
            self.full[part].push(old);
        }
        self.cur[part] = start;
        self.end[part] = unsafe { start.add(self.block) };
    }

    pub fn len(&self, part: usize) -> usize {
        let partial = if self.cur[part].is_null() {
            0
        } else {
            self.block - (self.end[part] as usize - self.cur[part] as usize) / std::mem::size_of::<T>()
        };
        self.full[part].len() * self.block + partial
    }

    pub fn block_bytes(&self) -> usize {
        self.block * std::mem::size_of::<T>()
    }

    pub fn blocks(&self, part: usize) -> impl Iterator<Item = *mut u8> + '_ {
        let block = self.block;
        let current = (!self.cur[part].is_null()).then(|| unsafe { self.end[part].sub(block) as *mut u8 });
        self.full[part].iter().map(|&p| p as *mut u8).chain(current)
    }

    pub fn slices(&self, part: usize) -> impl Iterator<Item = &[T]> + '_ {
        let block = self.block;
        let full = self.full[part]
            .iter()
            .map(move |&p| unsafe { std::slice::from_raw_parts(p as *const T, block) });
        let partial = (!self.cur[part].is_null()).then(|| unsafe {
            let start = self.end[part].sub(block);
            std::slice::from_raw_parts(start as *const T, self.cur[part].offset_from(start) as usize)
        });
        full.chain(partial)
    }
}

#[inline(always)]
unsafe fn stream_line(src: *const u8, dst: *mut u8) {
    #[cfg(target_arch = "x86_64")]
    {
        use std::arch::x86_64::*;
        for k in 0..4 {
            let v = _mm_load_si128(src.add(16 * k) as *const __m128i);
            _mm_stream_si128(dst.add(16 * k) as *mut __m128i, v);
        }
    }
    #[cfg(not(target_arch = "x86_64"))]
    std::ptr::copy_nonoverlapping(src, dst, 64);
}

fn fence() {
    #[cfg(target_arch = "x86_64")]
    unsafe {
        std::arch::x86_64::_mm_sfence();
    }
}
