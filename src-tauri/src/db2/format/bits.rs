//! Bit-level primitives for packed DB2 columns.
//!
//! Mirrors `DB2FileLoaderRegularImpl::RecordGetPackedValue`, which reads eight
//! bytes starting at the field's byte offset, discards the leading bits that
//! belong to the previous column, and keeps `bit_width` bits.

/// Reads `bit_width` bits out of `data`, skipping `bit_offset % 8` leading bits.
///
/// `data` must already start at the field's byte offset. Reads past the end of
/// `data` are treated as zero: the bits that belong to the field always lie
/// inside the record, so the padding is never part of the result.
pub fn packed_value(data: &[u8], bit_width: u32, bit_offset: u32) -> u64 {
    if bit_width == 0 {
        return 0;
    }

    let mut buffer = [0u8; 8];
    let copied = data.len().min(8);
    buffer[..copied].copy_from_slice(&data[..copied]);
    let raw = u64::from_le_bytes(buffer);

    let shift = bit_offset % 8;
    let shifted = raw >> shift;
    if bit_width >= 64 {
        shifted
    } else {
        shifted & ((1u64 << bit_width) - 1)
    }
}

/// Sign-extends a `bit_width`-wide two's complement value to a full 64 bits.
///
/// Mirrors HavenCore's `(value ^ mask) - mask` where `mask` is the sign bit.
pub fn sign_extend(value: u64, bit_width: u32) -> u64 {
    if bit_width == 0 || bit_width >= 64 {
        return value;
    }
    let mask = 1u64 << (bit_width - 1);
    (value ^ mask).wrapping_sub(mask)
}

/// Keeps only the low `byte_width` bytes of a decoded value.
///
/// HavenCore copies `min(sizeof(T), sizeof(source))` bytes into the destination
/// field, so a column whose declared type is narrower than the stored value
/// keeps only the low bytes. Pallet blocks in the shipped client data rely on
/// this: several columns store unrelated high bits alongside the real value.
pub fn truncate_to_width(value: u64, byte_width: usize) -> u64 {
    match byte_width {
        0 => 0,
        1 => value & 0xFF,
        2 => value & 0xFFFF,
        3 => value & 0x00FF_FFFF,
        4 => value & 0xFFFF_FFFF,
        _ => value,
    }
}

/// Reads a little-endian unsigned integer of `byte_width` bytes.
///
/// Returns `None` when the slice is shorter than the requested width, so the
/// caller can report a bounds error instead of fabricating a value.
pub fn read_uint_le(data: &[u8], byte_width: usize) -> Option<u64> {
    if byte_width == 0 || byte_width > 8 || data.len() < byte_width {
        return None;
    }
    let mut buffer = [0u8; 8];
    buffer[..byte_width].copy_from_slice(&data[..byte_width]);
    Some(u64::from_le_bytes(buffer))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packed_value_reads_within_a_single_byte() {
        // 0b1011_0100: bits 2..6 are 0b1101.
        let data = [0b1011_0100u8];
        assert_eq!(packed_value(&data, 4, 2), 0b1101);
    }

    #[test]
    fn packed_value_spans_byte_boundaries() {
        // Bits 4..24 of 0x01020304 read little-endian.
        let data = 0x0102_0304u32.to_le_bytes();
        let expected = (0x0102_0304u64 >> 4) & 0xFFFFF;
        assert_eq!(packed_value(&data, 20, 4), expected);
    }

    #[test]
    fn packed_value_uses_only_the_low_three_bits_of_the_offset() {
        // The caller has already advanced the slice by bit_offset / 8, so only
        // the remainder may be applied again.
        let data = [0xFFu8, 0x00, 0x00, 0x00];
        assert_eq!(packed_value(&data, 8, 16), 0xFF);
        assert_eq!(packed_value(&data, 4, 20), 0x0F);
    }

    #[test]
    fn packed_value_zero_pads_past_the_end() {
        let data = [0xABu8];
        assert_eq!(packed_value(&data, 8, 0), 0xAB);
        assert_eq!(packed_value(&data, 16, 0), 0x00AB);
    }

    #[test]
    fn packed_value_supports_the_full_width() {
        let data = u64::MAX.to_le_bytes();
        assert_eq!(packed_value(&data, 64, 0), u64::MAX);
        assert_eq!(packed_value(&data, 0, 0), 0);
    }

    #[test]
    fn sign_extend_handles_negative_and_positive_values() {
        assert_eq!(sign_extend(0b1111, 4) as i64, -1);
        assert_eq!(sign_extend(0b1000, 4) as i64, -8);
        assert_eq!(sign_extend(0b0111, 4) as i64, 7);
        // A 23-bit -1, the width Item.db2 uses for IconFileDataID.
        assert_eq!(sign_extend((1 << 23) - 1, 23) as i64, -1);
        assert_eq!(sign_extend(0x1234, 64), 0x1234);
    }

    #[test]
    fn truncate_to_width_keeps_the_low_bytes() {
        // Matches the shipped ItemEffect pallet layout, where the real
        // SpellCategoryID occupies only the low 16 bits.
        assert_eq!(truncate_to_width(0x00A4_001E, 2), 30);
        assert_eq!(truncate_to_width(0x0005_0066, 2), 102);
        assert_eq!(truncate_to_width(0xDEAD_BEEF, 1), 0xEF);
        assert_eq!(truncate_to_width(0xDEAD_BEEF, 4), 0xDEAD_BEEF);
        assert_eq!(truncate_to_width(u64::MAX, 8), u64::MAX);
    }

    #[test]
    fn read_uint_le_rejects_short_slices() {
        assert_eq!(read_uint_le(&[1, 0, 0, 0], 4), Some(1));
        assert_eq!(read_uint_le(&[1, 0], 4), None);
        assert_eq!(read_uint_le(&[1], 0), None);
    }
}
