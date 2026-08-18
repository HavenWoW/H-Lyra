//! Bounds-checked sequential reader over an in-memory DB2 file.
//!
//! Every read reports the stage it failed in, so a truncated file names the
//! block that ran out instead of surfacing a generic end-of-file error.

use crate::db2::format::error::{Db2Error, Db2Result};

pub struct ByteReader<'a> {
    data: &'a [u8],
    position: usize,
    stage: &'static str,
}

impl<'a> ByteReader<'a> {
    pub fn new(data: &'a [u8]) -> Self {
        Self {
            data,
            position: 0,
            stage: "header",
        }
    }

    /// Names the block currently being read, used in truncation errors.
    pub fn enter(&mut self, stage: &'static str) {
        self.stage = stage;
    }

    pub fn position(&self) -> usize {
        self.position
    }

    pub fn seek(&mut self, position: usize) -> Db2Result<()> {
        if position > self.data.len() {
            return Err(self.truncated(position, 0));
        }
        self.position = position;
        Ok(())
    }

    pub fn take(&mut self, count: usize) -> Db2Result<&'a [u8]> {
        let end = self
            .position
            .checked_add(count)
            .ok_or_else(|| self.truncated(self.position, count))?;
        if end > self.data.len() {
            return Err(self.truncated(self.position, count));
        }
        let slice = &self.data[self.position..end];
        self.position = end;
        Ok(slice)
    }

    pub fn skip(&mut self, count: usize) -> Db2Result<()> {
        self.take(count).map(|_| ())
    }

    pub fn u16(&mut self) -> Db2Result<u16> {
        let bytes = self.take(2)?;
        Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
    }

    pub fn i16(&mut self) -> Db2Result<i16> {
        self.u16().map(|value| value as i16)
    }

    pub fn u32(&mut self) -> Db2Result<u32> {
        let bytes = self.take(4)?;
        Ok(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    pub fn u64(&mut self) -> Db2Result<u64> {
        let bytes = self.take(8)?;
        let mut buffer = [0u8; 8];
        buffer.copy_from_slice(bytes);
        Ok(u64::from_le_bytes(buffer))
    }

    /// Reads `count` little-endian `u32` values.
    pub fn u32_vec(&mut self, count: usize) -> Db2Result<Vec<u32>> {
        let bytes = self.take(count.saturating_mul(4))?;
        Ok(bytes
            .chunks_exact(4)
            .map(|chunk| u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
            .collect())
    }

    fn truncated(&self, offset: usize, needed: usize) -> Db2Error {
        Db2Error::Truncated {
            stage: self.stage,
            offset,
            needed,
            available: self.data.len().saturating_sub(offset.min(self.data.len())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_little_endian_scalars() {
        let bytes = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06];
        let mut reader = ByteReader::new(&bytes);
        assert_eq!(reader.u16().unwrap(), 0x0201);
        assert_eq!(reader.u32().unwrap(), 0x0605_0403);
        assert_eq!(reader.position(), 6);
    }

    #[test]
    fn truncation_names_the_current_stage() {
        let bytes = [0x01, 0x02];
        let mut reader = ByteReader::new(&bytes);
        reader.enter("column meta");
        let error = reader.u32().unwrap_err();
        match error {
            Db2Error::Truncated { stage, needed, .. } => {
                assert_eq!(stage, "column meta");
                assert_eq!(needed, 4);
            }
            other => panic!("unexpected error: {other}"),
        }
    }

    #[test]
    fn seek_past_the_end_is_rejected() {
        let bytes = [0u8; 4];
        let mut reader = ByteReader::new(&bytes);
        assert!(reader.seek(4).is_ok());
        assert!(reader.seek(5).is_err());
    }
}
