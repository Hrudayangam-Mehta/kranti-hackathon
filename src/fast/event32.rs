//! Exact middle event lane. One complete Key and one ordinary Raw48 key fit
//! beside the unchanged timestamp/payload and a checked ingestion delta.
use super::{event16, id::{self, Key}, EventRec, INVALID};

const DELTA_BOUND: i64 = 1 << 14;
const DELTA_MASK: u64 = (1 << 15) - 1;
const INGEST_BOUND: i64 = 1 << 47;
const MODE: u64 = 1 << 63;

const _: () = assert!(id::RAW_BITS == 48);

#[inline(always)]
fn ordinary(key: Key) -> bool {
    key.hi == 0 && key.lo != 0 && key.lo <= id::RAW_MASK
}

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct EventMid {
    full: Key,
    lo: u64,
    meta: u64,
}

const _: () = assert!(std::mem::size_of::<EventMid>() == 32);

impl EventMid {
    #[inline(always)]
    pub(super) fn pack(rec: &EventRec, cws: i64) -> Option<Self> {
        if rec.ts == INVALID {
            // A rejected earliest copy still controls deduplication. Its user
            // and payload are irrelevant, but its full event ID and exact
            // ingestion order must survive in any lane.
            if rec.ingest % 1000 != 0 {
                return None;
            }
            let seconds = rec.ingest / 1000;
            if seconds < -INGEST_BOUND || seconds >= INGEST_BOUND {
                return None;
            }
            return Some(Self {
                full: rec.event,
                lo: (seconds as u64) & id::RAW_MASK,
                meta: u64::from(INVALID),
            });
        }
        let (full, short, mode) = if ordinary(rec.user) {
            (rec.event, rec.user.lo, 0)
        } else if ordinary(rec.event) {
            (rec.user, rec.event.lo, MODE)
        } else {
            return None;
        };
        if rec.ingest % 1000 != 0 {
            return None;
        }
        let event_ms = cws.checked_add(i64::from(rec.ts))?;
        // Euclidean floor is necessary for a negative fractional event time.
        let event_seconds = event_ms.div_euclid(1000);
        let delta = (rec.ingest / 1000).checked_sub(event_seconds)?;
        if delta < -DELTA_BOUND || delta >= DELTA_BOUND {
            return None;
        }
        Some(Self {
            full,
            lo: short | (((delta as u64) & DELTA_MASK) << 48) | mode,
            meta: u64::from(rec.ts) | (u64::from(rec.payload) << 32),
        })
    }

    #[inline(always)]
    fn ts(&self) -> u32 {
        self.meta as u32
    }

    #[inline(always)]
    fn event(&self) -> Key {
        // Invalid rows interpret the whole lower word as signed ingestion;
        // never treat it as a valid-row key/mode bit field.
        if self.ts() == INVALID || self.lo & MODE == 0 {
            self.full
        } else {
            Key { hi: 0, lo: self.lo & id::RAW_MASK }
        }
    }

    #[inline(always)]
    fn user(&self) -> Key {
        if self.lo & MODE == 0 {
            Key { hi: 0, lo: self.lo & id::RAW_MASK }
        } else {
            self.full
        }
    }

    #[inline(always)]
    pub(super) fn hash(&self) -> u64 {
        event16::hash(self.event())
    }

    #[inline(always)]
    pub(super) fn winner(&self) -> Option<(Key, u32, u32)> {
        let ts = self.ts();
        if ts == INVALID {
            None
        } else {
            Some((self.user(), ts, (self.meta >> 32) as u32))
        }
    }

    #[inline(always)]
    pub(super) fn decode(&self, cws: i64) -> EventRec {
        let event = self.event();
        let ts = self.ts();
        if ts == INVALID {
            let seconds = ((self.lo << 16) as i64) >> 16;
            return EventRec { event, user: Key::default(), ingest: seconds * 1000, ts, payload: 0 };
        }
        // Shift mode out, then sign-extend the fifteen-bit field from bit62.
        let delta = ((self.lo << 1) as i64) >> 49;
        // pack checked this addition and the exact representable result.
        let event_seconds = (cws + i64::from(ts)).div_euclid(1000);
        EventRec {
            event, user: self.user(), ingest: (event_seconds + delta) * 1000,
            ts, payload: (self.meta >> 32) as u32,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use id::Domain;

    fn roundtrip(rec: EventRec, cws: i64) -> EventMid {
        let mid = EventMid::pack(&rec, cws).expect("exact middle record must fit");
        assert_eq!(mid.decode(cws), rec);
        assert_eq!(mid.hash(), event16::hash(rec.event));
        assert_eq!(mid.winner(), if rec.ts == INVALID { None } else { Some((rec.user, rec.ts, rec.payload)) });
        mid
    }

    #[test]
    fn both_modes_preserve_exact_keys_payloads_and_full_timestamp_range() {
        let events = Domain::with_prefix(b'e');
        let users = Domain::with_prefix(b'u');
        let event_keys: Vec<_> = [b"e0".as_slice(), b"e00", b"e~~~~~~~~", b"e000000001",
            b"e0123456789abcdef0123456789abcdef", b"e\0opaque"].iter().map(|s| events.encode(s)).collect();
        let user_keys: Vec<_> = [b"u0".as_slice(), b"u00", b"u~~~~~~~~", b"u000000001",
            b"u0123456789abcdef0123456789abcdef", b"u\0opaque"].iter().map(|s| users.encode(s)).collect();
        let mut modes = [0, 0];
        for &event in &event_keys {
            for &user in &user_keys {
                for cws in [-1_000_001i64, -1, 0, 123, 1_835_020_800_123] {
                    for ts in [0u32, 1, 999, 1000, 604_800_123, u32::MAX - 1] {
                        let ingest = (cws + i64::from(ts)).div_euclid(1000) * 1000;
                        let rec = EventRec { event, user, ts, ingest, payload: u32::MAX };
                        if ordinary(event) || ordinary(user) {
                            let mid = roundtrip(rec, cws);
                            let mode = (mid.lo >> 63) as usize;
                            assert_eq!(mode, usize::from(!ordinary(user)));
                            modes[mode] += 1;
                        } else {
                            assert!(EventMid::pack(&rec, cws).is_none());
                        }
                    }
                }
            }
        }
        assert!(modes[0] > 0 && modes[1] > 0);
    }

    #[test]
    fn signed_delta_edges_use_floor_for_negative_fractional_events() {
        for cws in [-1001i64, -999, -1, 0, 1, 999, 1001] {
            for ts in [0u32, 1, 999, 1000, 604_800_123] {
                let floor = (cws + i64::from(ts)).div_euclid(1000);
                for user in [Key { hi: 0, lo: id::RAW_MASK }, Key { hi: id::EXTENDED_SHORT, lo: 17 }] {
                    for delta in [-DELTA_BOUND, -1, 0, 1, DELTA_BOUND - 1] {
                        roundtrip(EventRec { event: Key { hi: 0, lo: 1 }, user, ts,
                            ingest: (floor + delta) * 1000, payload: 37 }, cws);
                    }
                    for delta in [-DELTA_BOUND - 1, DELTA_BOUND] {
                        let rec = EventRec { event: Key { hi: 0, lo: 1 }, user, ts,
                            ingest: (floor + delta) * 1000, payload: 37 };
                        assert!(EventMid::pack(&rec, cws).is_none());
                    }
                }
            }
        }
        let rec = EventRec { event: Key { hi: 0, lo: 1 }, user: Key { hi: 0, lo: 2 },
            ts: 0, ingest: -1000, payload: 1 };
        let mid = roundtrip(rec, -1);
        assert_eq!((mid.lo >> 48) & DELTA_MASK, 0, "-1ms floors to -1 second, not zero");
    }

    #[test]
    fn invalid_wide_and_short_events_keep_signed_absolute_ingestion() {
        let domain = Domain::with_prefix(b'e');
        for bytes in [b"e1".as_slice(), b"e000000001", b"e0123456789abcdef0123456789abcdef", b"E odd"] {
            let event = domain.encode(bytes);
            for seconds in [-INGEST_BOUND, -1, 0, 1, INGEST_BOUND - 1] {
                let rec = EventRec { event, user: Key::default(), ts: INVALID, ingest: seconds * 1000, payload: 0 };
                roundtrip(rec, i64::MAX);
            }
            for ingest in [(-INGEST_BOUND - 1) * 1000, INGEST_BOUND * 1000, -1001, 1, i64::MIN, i64::MAX] {
                let rec = EventRec { event, user: Key::default(), ts: INVALID, ingest, payload: 0 };
                assert!(EventMid::pack(&rec, 0).is_none());
            }
        }
    }

    #[test]
    fn both_wide_fractional_ingestion_and_unrepresentable_short_values_fall_back() {
        let base = EventRec { event: Key { hi: 0, lo: 1 }, user: Key { hi: 0, lo: 2 },
            ts: 1, ingest: 0, payload: u32::MAX };
        for rec in [
            EventRec { event: Key { hi: 7, lo: 1 }, user: Key { hi: 8, lo: 2 }, ..base },
            EventRec { event: Key { hi: 0, lo: id::RAW_MASK + 1 }, user: Key { hi: 0, lo: id::RAW_MASK + 2 }, ..base },
            EventRec { event: Key::default(), user: Key::default(), ..base },
            EventRec { ingest: 1, ..base },
            EventRec { ingest: -1, ..base },
        ] {
            assert!(EventMid::pack(&rec, 0).is_none());
        }
        // One complete Key is exact even outside the ordinary subset.
        roundtrip(EventRec { user: Key { hi: 0, lo: id::RAW_MASK + 1 }, ..base }, 0);
        roundtrip(EventRec { event: Key { hi: 0, lo: id::RAW_MASK + 1 }, ..base }, 0);
    }

    #[test]
    fn checked_absolute_addition_and_extreme_ingestion_roundtrip() {
        let mut rec = EventRec { event: Key { hi: 0, lo: 1 }, user: Key { hi: 0, lo: 2 },
            ts: 2000, ingest: 0, payload: 1 };
        assert!(EventMid::pack(&rec, i64::MAX - 1000).is_none());
        for cws in [i64::MIN, i64::MIN + 1000, i64::MAX - 1000, i64::MAX] {
            rec.ts = 0;
            rec.ingest = cws / 1000 * 1000;
            roundtrip(rec, cws);
        }
    }

    #[test]
    fn event_hash_and_partition_do_not_depend_on_validity_or_storage_mode() {
        let events = Domain::with_prefix(b'e');
        for event in [events.encode(b"e~~~~~~~~"), events.encode(b"e000000001"),
            events.encode(b"e0123456789abcdef0123456789abcdef"), events.encode(b"opaque event")] {
            let base = EventRec { event, user: Key { hi: 0, lo: id::RAW_MASK }, ts: 1234, ingest: 1000, payload: 17 };
            for rec in [base, EventRec { user: Key { hi: id::ODD, lo: 9 }, ..base },
                EventRec { user: Key::default(), ts: INVALID, ingest: -1000, payload: 0, ..base }] {
                if let Some(mid) = EventMid::pack(&rec, 0) {
                    for bits in 4..=14 {
                        assert_eq!(mid.hash() >> (64 - bits), event16::hash(event) >> (64 - bits));
                    }
                    assert_eq!(mid.decode(0), rec);
                }
            }
        }
    }
}
