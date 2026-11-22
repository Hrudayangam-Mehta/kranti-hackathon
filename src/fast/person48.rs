use super::id::{self, Key};

pub(super) const KEY_BITS: u32 = id::RAW_BITS;
pub(super) const KEY_MASK: u64 = id::RAW_MASK;
pub(super) const TIME_BITS: u32 = 21;
pub(super) const TIME_MAX: u32 = (1 << TIME_BITS) - 1;
pub(super) const MIN_PARTITION_BITS: u32 = KEY_BITS + TIME_BITS - 64;
const MULTIPLIER: u64 = 0x9e37_79b9_7f4a_7c15;

const fn inverse_odd(value: u64) -> u64 {
    // Newton lifting doubles the known inverse bits on each step. Starting
    // from an odd inverse modulo 2, six steps recover all 64 bits.
    let mut inverse = 1u64;
    let mut step = 0;
    while step < 6 {
        inverse = inverse.wrapping_mul(2u64.wrapping_sub(value.wrapping_mul(inverse)));
        step += 1;
    }
    inverse
}

const INVERSE: u64 = inverse_odd(MULTIPLIER);
const _: () = {
    assert!(KEY_BITS == 48 && MIN_PARTITION_BITS == 5);
    assert!(MULTIPLIER & 1 == 1);
    assert!(MULTIPLIER.wrapping_mul(INVERSE) == 1);
    assert!(TIME_MAX as u64 * 1000 <= u32::MAX as u64);
};

// A separate P2 identity namespace. hi=0 stores the reversible H48, while
// every nonzero tag retains its exact raw Key. These identities never go to
// People, event hashing, Domain comparisons or output rendering.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(super) struct PersonIdentity(pub(super) Key);

impl PersonIdentity {
    #[inline(always)]
    pub(super) fn from_key(key: Key) -> Self {
        if key.hi == 0 {
            debug_assert!(key.lo <= KEY_MASK);
            Self(Key { hi: 0, lo: key.lo.wrapping_mul(MULTIPLIER) & KEY_MASK })
        } else {
            Self(key)
        }
    }

    #[inline(always)]
    pub(super) fn to_key(self) -> Key {
        if self.0.hi == 0 {
            Key { hi: 0, lo: self.0.lo.wrapping_mul(INVERSE) & KEY_MASK }
        } else {
            self.0
        }
    }

    #[inline(always)]
    pub(super) fn hash(self) -> u64 {
        if self.0.hi == 0 { self.0.lo << (64 - KEY_BITS) } else { self.0.hash() }
    }

    #[inline(always)]
    pub(super) fn part(self, bits: u32) -> usize {
        (self.hash() >> (64 - bits)) as usize
    }
}

#[inline(always)]
pub(super) fn person_hash48(key: Key) -> u64 {
    PersonIdentity::from_key(key).hash()
}

#[inline(always)]
pub(super) fn person_part(key: Key, bits: u32) -> usize {
    (person_hash48(key) >> (64 - bits)) as usize
}

#[derive(Clone, Copy)]
pub(super) struct PersonLayout {
    pub(super) remainder_bits: u32,
    pub(super) remainder_mask: u64,
}

impl PersonLayout {
    pub(super) fn new(bits: u32) -> Option<Self> {
        if !(MIN_PARTITION_BITS..=14).contains(&bits) {
            return None;
        }
        let remainder_bits = KEY_BITS - bits;
        Some(Self { remainder_bits, remainder_mask: (1 << remainder_bits) - 1 })
    }
}

#[derive(Clone, Copy)]
#[repr(transparent)]
pub struct PersonSmall {
    pub(super) value: u64,
}

impl PersonSmall {
    #[inline(always)]
    pub(super) fn new(identity: PersonIdentity, ts: u32, payload: u32, layout: Option<&PersonLayout>) -> Option<Self> {
        let layout = layout?;
        if payload != 0 || identity.0.hi != 0 || identity.0.lo == 0 || ts % 1000 != 0 {
            return None;
        }
        let seconds = ts / 1000;
        // P2 receives only valid events. The largest 21-bit second is valid
        // data, not a sentinel; milliseconds and larger times retain full fields.
        if seconds > TIME_MAX {
            return None;
        }
        Some(Self { value: (identity.0.lo & layout.remainder_mask) | (u64::from(seconds) << layout.remainder_bits) })
    }

    #[inline(always)]
    pub(super) fn identity(self, part: usize, layout: &PersonLayout) -> PersonIdentity {
        let hash = ((part as u64) << layout.remainder_bits) | (self.value & layout.remainder_mask);
        debug_assert!(hash <= KEY_MASK);
        PersonIdentity(Key { hi: 0, lo: hash })
    }

    #[inline(always)]
    pub(super) fn ts(self, layout: &PersonLayout) -> u32 {
        ((self.value >> layout.remainder_bits) as u32) * 1000
    }
}

const _: () = assert!(std::mem::size_of::<PersonSmall>() == 8);
