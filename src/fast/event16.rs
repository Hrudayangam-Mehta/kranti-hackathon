//! Checked event-only packing. Person/click hashing and representations stay
//! independent. The containing P1 bucket supplies the omitted event hash bits.
use super::{id::{self, Key}, EventRec, INVALID};

const MUL: u64 = 0x9e37_79b9_7f4a_7c15;
const INVERSE: u64 = 0x83e1_9937_733d;
const SECOND_MASK: u32 = (1u32 << 21) - 1;
const INGEST_BOUND: i64 = 1i64 << 47;

const _: () = assert!(id::RAW_BITS == 48);
const _: () = assert!(MUL.wrapping_mul(INVERSE) & id::RAW_MASK == 1);

#[inline(always)]
fn ordinary(key: Key) -> bool {
    key.hi == 0 && key.lo != 0 && key.lo <= id::RAW_MASK
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(event: u64, user: u64, ts: u32, ingest: i64) -> EventRec {
        EventRec { event: Key { hi: 0, lo: event }, user: Key { hi: 0, lo: user }, ts, ingest, payload: 0 }
    }

    fn packed(layout: &Layout, bits: u32, rec: EventRec) -> EventSmall {
        let h = hash(rec.event);
        let p = (h >> (64 - bits)) as usize;
        let value = layout.pack(&rec, h).expect("record must fit");
        assert_eq!(layout.hash(&value, p), h);
        assert_eq!(layout.decode(&value, p), rec);
        if rec.ts == INVALID {
            assert_eq!(layout.winner(&value), None);
        } else {
            assert_eq!(layout.winner(&value), Some((rec.user, rec.ts)));
        }
        value
    }

    #[test]
    fn event_hash_inverse_and_partition_roundtrip_all_widths() {
        let mut state = 0x4d8a_d315_f071_bc29u64;
        for bits in 4..=14 {
            let layout = Layout::new(bits, 0).unwrap();
            for n in 0..4096 {
                state ^= state << 13;
                state ^= state >> 7;
                state ^= state << 17;
                let event = if n == 0 { id::RAW_MASK } else { (state & id::RAW_MASK).max(1) };
                let user = (state.rotate_left(23) & id::RAW_MASK).max(1);
                packed(&layout, bits, record(event, user, 604_800_000, 604_800_000));
            }
            packed(&layout, bits, record(1, id::RAW_MASK, 0, 0));
        }
        for key in [Key { hi: 1, lo: 7 }, Key { hi: id::EXTENDED_SHORT, lo: 9 },
            Key { hi: id::ODD, lo: 11 }, Key { hi: 0, lo: id::RAW_MASK + 1 }, Key::default()] {
            assert_eq!(hash(key), key.hash());
        }
    }

    #[test]
    fn delta_signed_edges_and_reserved_second_are_checked() {
        for bits in 4..=14 {
            for cws in [-86_400_123i64, 0, 1_750_000_000_123] {
                let layout = Layout::new(bits, cws).unwrap();
                for seconds in [1u32, 65_535, 65_536, 65_537, 604_801, SECOND_MASK - 1] {
                    let ts = seconds * 1000 - layout.anchor_remainder;
                    let event_ms = cws + i64::from(ts);
                    for delta in [-layout.delta_bound, -1, 0, 1, layout.delta_bound - 1] {
                        packed(&layout, bits, record(id::RAW_MASK, id::RAW_MASK, ts, event_ms + delta * 1000));
                    }
                    for delta in [-layout.delta_bound - 1, layout.delta_bound] {
                        let rec = record(1, 1, ts, event_ms + delta * 1000);
                        assert!(layout.pack(&rec, hash(rec.event)).is_none());
                    }
                }
                for seconds in [SECOND_MASK, SECOND_MASK + 1] {
                    let ts = seconds * 1000 - layout.anchor_remainder;
                    let rec = record(1, 1, ts, cws + i64::from(ts));
                    assert!(layout.pack(&rec, hash(rec.event)).is_none());
                }
            }
        }
    }

    #[test]
    fn fractional_manifest_anchor_preserves_absolute_seconds_and_negative_epochs() {
        for cws in [-2_001i64, -1_001, -999, -1, 0, 1, 123, 999, 1_835_020_800_123] {
            let layout = Layout::new(10, cws).unwrap();
            let absolute_event = (cws.div_euclid(1000) + 604_801) * 1000;
            let ts = u32::try_from(absolute_event - cws).unwrap();
            let rec = record(0x1234_5678_9abc, id::RAW_MASK, ts, absolute_event - 5000);
            packed(&layout, 10, rec);
            if cws.rem_euclid(1000) != 0 {
                assert_ne!(rec.ts % 1000, 0, "absolute F1 can have a fractional relative timestamp");
            }
            let fractional_event = EventRec { ts: rec.ts + 1, ..rec };
            assert!(layout.pack(&fractional_event, hash(rec.event)).is_none());
            let fractional_ingest = EventRec { ingest: rec.ingest + 1, ..rec };
            assert!(layout.pack(&fractional_ingest, hash(rec.event)).is_none());
        }
    }

    #[test]
    fn invalid_records_preserve_signed_absolute_ingest_and_never_emit() {
        for bits in 4..=14 {
            let layout = Layout::new(bits, -1_001).unwrap();
            for seconds in [-INGEST_BOUND, -1, 0, 1, INGEST_BOUND - 1] {
                let rec = EventRec { event: Key { hi: 0, lo: id::RAW_MASK }, user: Key::default(),
                    ts: INVALID, ingest: seconds * 1000, payload: 0 };
                packed(&layout, bits, rec);
            }
            for ingest in [(-INGEST_BOUND - 1) * 1000, INGEST_BOUND * 1000,
                i64::MIN, i64::MAX, -1001, 1001] {
                let rec = EventRec { event: Key { hi: 0, lo: 1 }, user: Key::default(), ts: INVALID, ingest, payload: 0 };
                assert!(layout.pack(&rec, hash(rec.event)).is_none());
            }
        }
    }

    #[test]
    fn user_payload_precision_and_range_failures_keep_event_routing() {
        let layout = Layout::new(4, 0).unwrap();
        let base = record(0x1234_5678_9abc, id::RAW_MASK, 604_800_000, 604_800_000);
        assert!(layout.pack(&base, hash(base.event)).is_some());
        for rec in [
            EventRec { user: Key { hi: id::EXTENDED_SHORT, lo: 9 }, ..base },
            EventRec { user: Key { hi: 0, lo: id::RAW_MASK + 1 }, ..base },
            EventRec { user: Key::default(), ..base },
            EventRec { payload: 1, ..base },
            EventRec { payload: 255 << 24, ..base },
            EventRec { ts: base.ts + 1, ..base },
            EventRec { ingest: base.ingest + 1, ..base },
            EventRec { ingest: base.ingest - (layout.delta_bound + 1) * 1000, ..base },
            EventRec { ts: INVALID, ingest: -1001, user: Key::default(), ..base },
        ] {
            assert_eq!(hash(rec.event), hash(base.event));
            assert!(layout.pack(&rec, hash(rec.event)).is_none());
        }
        let wide = EventRec { event: Key { hi: id::ODD, lo: 7 }, ..base };
        assert!(layout.pack(&wide, hash(wide.event)).is_none());
    }

    #[test]
    fn impossible_context_arithmetic_and_unsupported_widths_fall_back() {
        for bits in [0, 1, 3, 15, 32, 48, 64, u32::MAX] {
            assert!(Layout::new(bits, 0).is_none());
        }
        let cws = i64::MAX - 1000;
        let layout = Layout::new(10, cws).unwrap();
        let ts = 2000 - layout.anchor_remainder;
        let rec = record(1, 1, ts, 0);
        assert!(layout.pack(&rec, hash(rec.event)).is_none(), "absolute event addition must be checked");
        let layout = Layout::new(10, i64::MIN).unwrap();
        let ts = 1000 - layout.anchor_remainder;
        let rec = record(1, 1, ts, i64::MAX);
        assert!(layout.pack(&rec, hash(rec.event)).is_none(), "ingest minus event must be checked");
    }
}

/// Use this same function for every event lane, including rows that cannot
/// pack. It intentionally does not replace Key::hash for people or clicks.
#[inline(always)]
pub(super) fn hash(key: Key) -> u64 {
    if ordinary(key) {
        (key.lo.wrapping_mul(MUL) & id::RAW_MASK) << 16
    } else {
        key.hash()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(C)]
pub struct EventSmall {
    words: [u64; 2],
}

const _: () = assert!(std::mem::size_of::<EventSmall>() == 16);

#[derive(Clone, Copy, Debug)]
pub(super) struct Layout {
    remainder_bits: u32,
    remainder_mask: u64,
    delta_shift: u32,
    delta_bound: i64,
    cws: i64,
    anchor_remainder: u32,
}

impl Layout {
    pub(super) fn new(bits: u32, cws: i64) -> Option<Self> {
        if !(4..=14).contains(&bits) {
            return None;
        }
        let remainder_bits = 48 - bits;
        Some(Self {
            remainder_bits,
            remainder_mask: (1u64 << remainder_bits) - 1,
            delta_shift: 53 - bits,
            delta_bound: 1i64 << (10 + bits),
            cws,
            anchor_remainder: cws.rem_euclid(1000) as u32,
        })
    }

    #[inline(always)]
    pub(super) fn pack(&self, rec: &EventRec, event_hash: u64) -> Option<EventSmall> {
        if !ordinary(rec.event) {
            return None;
        }
        debug_assert_eq!(event_hash, hash(rec.event));
        let (user, seconds, delta) = if rec.ts == INVALID {
            // Invalid winners still carry their exact ordering timestamp.
            if rec.ingest % 1000 != 0 {
                return None;
            }
            let seconds = rec.ingest / 1000;
            if seconds < -INGEST_BOUND || seconds >= INGEST_BOUND {
                return None;
            }
            ((seconds as u64) & id::RAW_MASK, SECOND_MASK, 0i64)
        } else {
            if rec.payload != 0 || !ordinary(rec.user) {
                return None;
            }
            // Absolute whole seconds can have fractional relative timestamps
            // when a manifest's cws anchor has a millisecond remainder.
            let adjusted = u64::from(rec.ts) + u64::from(self.anchor_remainder);
            if adjusted % 1000 != 0 {
                return None;
            }
            let seconds = adjusted / 1000;
            if seconds >= u64::from(SECOND_MASK) {
                return None;
            }
            let event_ms = self.cws.checked_add(i64::from(rec.ts))?;
            let delta_ms = rec.ingest.checked_sub(event_ms)?;
            if delta_ms % 1000 != 0 {
                return None;
            }
            let delta = delta_ms / 1000;
            if delta < -self.delta_bound || delta >= self.delta_bound {
                return None;
            }
            (rec.user.lo, seconds as u32, delta)
        };
        // The full user/invalid-ingest field has a constant extraction mask.
        // Only the upper five second bits share the hash/delta word.
        let lo = user | (u64::from(seconds & 0xffff) << 48);
        let hi = ((event_hash >> 16) & self.remainder_mask)
            | (u64::from(seconds >> 16) << self.remainder_bits)
            | ((delta as u64) << self.delta_shift);
        Some(EventSmall { words: [lo, hi] })
    }

    /// Recover the common event routing hash without inverse-ID decoding.
    #[inline(always)]
    pub(super) fn hash(&self, rec: &EventSmall, partition: usize) -> u64 {
        debug_assert!((partition as u64) < (1u64 << (48 - self.remainder_bits)));
        (((partition as u64) << self.remainder_bits)
            | (rec.words[1] & self.remainder_mask)) << 16
    }

    #[inline(always)]
    fn user_bits(&self, rec: &EventSmall) -> u64 {
        rec.words[0] & id::RAW_MASK
    }

    #[inline(always)]
    fn seconds(&self, rec: &EventSmall) -> u32 {
        (rec.words[0] >> 48) as u32
            | (((rec.words[1] >> self.remainder_bits) as u32 & 31) << 16)
    }

    /// Singleton winners need neither their event ID nor ingest timestamp.
    #[inline(always)]
    pub(super) fn winner(&self, rec: &EventSmall) -> Option<(Key, u32)> {
        let seconds = self.seconds(rec);
        if seconds == SECOND_MASK {
            return None;
        }
        // pack proved seconds*1000 == original_ts + anchor_remainder.
        let ts = seconds * 1000 - self.anchor_remainder;
        Some((Key { hi: 0, lo: self.user_bits(rec) }, ts))
    }

    /// Expand only possible duplicates, before any source blocks are recycled.
    #[inline(always)]
    pub(super) fn decode(&self, rec: &EventSmall, partition: usize) -> EventRec {
        let event = Key {
            hi: 0,
            lo: (self.hash(rec, partition) >> 16).wrapping_mul(INVERSE) & id::RAW_MASK,
        };
        let user = self.user_bits(rec);
        let seconds = self.seconds(rec);
        if seconds == SECOND_MASK {
            let ingest_seconds = ((user << 16) as i64) >> 16;
            return EventRec { event, user: Key::default(), ingest: ingest_seconds * 1000, ts: INVALID, payload: 0 };
        }
        let ts = seconds * 1000 - self.anchor_remainder;
        let delta = (rec.words[1] as i64) >> self.delta_shift;
        // pack checked both sums in the original signed millisecond domain.
        let event_ms = self.cws + i64::from(ts);
        EventRec { event, user: Key { hi: 0, lo: user }, ingest: event_ms + delta * 1000, ts, payload: 0 }
    }
}
