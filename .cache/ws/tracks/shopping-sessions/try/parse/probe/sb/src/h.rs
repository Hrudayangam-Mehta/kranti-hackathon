// Faithful copy of the event-line handler of src/fast/mod.rs (kept in sync by hand) for isolated timing.
use crate::fast::keys::{self, SmallMap};
use crate::fast::scan::{Kernel, Lines};
use crate::fast::sink::{Arena, Sink};
use crate::fast::ts::Calendar;
use crate::time::DAY_MS;

pub const INVALID: u32 = u32::MAX;
const H1: u64 = 0x9e37_79b9_7f4a_7c15;

#[derive(Clone, Copy)]
#[repr(C)]
pub struct EventRec {
    event: u64,
    user: u64,
    ingest: i64,
    ts: u32,
    payload: u32,
}

pub struct Ctx {
    pub calendar: Calendar,
    pub ws: i64,
    pub we: i64,
    pub cws: i64,
    pub products: SmallMap,
    pub unknown: u32,
    pub p1_bits: u32,
    pub mode: u32,
}

#[inline(always)]
fn part_of(key: u64, mult: u64, bits: u32) -> usize {
    (key.wrapping_mul(mult) >> (64 - bits)) as usize
}

#[inline(always)]
unsafe fn intern_k<K: Kernel>(field: &[u8]) -> u64 {
    match K::pack(field.as_ptr(), field.len()) {
        Some(key) => key,
        None => keys::intern_exotic(field),
    }
}

#[inline(always)]
unsafe fn lookup_k<K: Kernel>(field: &[u8]) -> Option<u64> {
    match K::pack(field.as_ptr(), field.len()) {
        Some(key) => Some(key),
        None => keys::lookup_exotic(field),
    }
}

const KIND_VIEW_CART: u32 = 0;
const KIND_PURCHASE: u32 = 1;

/// 0 for `view`/`cart`, 1 for `purchase`, 2 for anything else, without a branch on the bytes.
/// Reads 8 bytes at the field start (the scanner guarantees 16 readable bytes past it).
#[inline(always)]
unsafe fn event_kind(kind: &[u8]) -> u32 {
    let n = kind.len();
    let w = (kind.as_ptr() as *const u64).read_unaligned();
    let low = w & 0xffff_ffff;
    let view_cart = (n == 4) & ((low == u64::from(u32::from_le_bytes(*b"view"))) | (low == u64::from(u32::from_le_bytes(*b"cart"))));
    let purchase = (n == 8) & (w == u64::from_le_bytes(*b"purchase"));
    2 - 2 * u32::from(view_cart) - u32::from(purchase)
}

pub struct EventLines<'a, K> {
    pub ctx: &'a Ctx,
    pub arena: &'a mut Arena,
    pub sink: &'a mut Sink<EventRec>,
    pub copies: usize,
    pub acc: u64,
    pub kernel: std::marker::PhantomData<K>,
}

impl<K: Kernel> Lines<7> for EventLines<'_, K> {
    #[inline(always)]
    fn line(&mut self, f: &[&[u8]; 7]) {
        let ctx = self.ctx;
        let event_id = f[0];
        if event_id.is_empty() {
            return;
        }
        self.copies += 1;
        unsafe {
            let user = f[1];
            let event = if ctx.mode & 32 != 0 { event_id.len() as u64 ^ *event_id.as_ptr() as u64 } else { intern_k::<K>(event_id) };
            let ingest = if ctx.mode & 8 != 0 { Some(ctx.ws + f[3].len() as i64) } else { ctx.calendar.parse(f[3]) };
            let mut rec = EventRec { event, user: 0, ingest: ingest.unwrap_or(i64::MAX), ts: INVALID, payload: 0 };
            if let Some(ingest) = ingest {
                let product = f[5];
                if !user.is_empty() && !product.is_empty() {
                    let tt = if ctx.mode & 16 != 0 { Some(ctx.ws + f[2].len() as i64) } else { ctx.calendar.parse(f[2]) };
                    if let Some(t) = tt {
                        if ctx.ws <= t && t < ctx.we && ingest.saturating_sub(t) <= DAY_MS {
                            let kind = f[4];
                            let price = if ctx.mode & 64 != 0 {
                                match event_kind(kind) {
                                    KIND_VIEW_CART => Some(0),
                                    KIND_PURCHASE => crate::parse_price(f[6]),
                                    _ => None,
                                }
                            } else {
                                match kind {
                                    b"view" | b"cart" => Some(0),
                                    b"purchase" => crate::parse_price(f[6]),
                                    _ => None,
                                }
                            };
                            if let Some(price) = price {
                                let category = if price > 0 {
                                    lookup_k::<K>(product).and_then(|k| ctx.products.get(k)).unwrap_or(ctx.unknown)
                                } else {
                                    0
                                };
                                rec.user = if ctx.mode & 32 != 0 { user.len() as u64 } else { intern_k::<K>(user) };
                                rec.ts = (t - ctx.cws) as u32;
                                rec.payload = price | category << 24;
                            }
                        }
                    }
                }
            }
            if ctx.mode & 1 != 0 {
                self.acc = self.acc.wrapping_add(rec.user ^ rec.event ^ rec.ingest as u64 ^ ((rec.ts as u64) << 32) ^ rec.payload as u64);
                return;
            }
            self.sink.push(self.arena, part_of(event, H1, ctx.p1_bits), rec);
        }
    }
}
