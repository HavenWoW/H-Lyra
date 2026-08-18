// Bitmask helpers shared by every flag editor.
//
// All arithmetic is done with BigInt. JavaScript's bitwise operators coerce to
// 32 bits, which silently corrupts any flag above bit 31 — `npcflag` in
// particular is a 64-bit column whose highest defined flag is bit 43.
//
// The other rule enforced here is that a stored value may contain bits that the
// application has no label for, either because the column is newer than the
// flag table or because the data is custom. Those bits are preserved across an
// edit instead of being cleared.

import { FlagOption } from '../constants/itemOptions';

/** Storage width of the column being edited. */
export type FlagWidth = 16 | 32 | 64;

/**
 * Reads a stored flag value into a BigInt.
 *
 * A negative value is interpreted as the two's complement pattern for the
 * column width, so a `-1` sentinel becomes "all bits set" rather than an
 * out-of-range negative.
 */
export const parseFlagValue = (
  value: number | string | bigint | null | undefined,
  width: FlagWidth = 32
): bigint => {
  if (value === null || value === undefined || value === '') return 0n;

  let parsed: bigint;
  try {
    if (typeof value === 'bigint') {
      parsed = value;
    } else if (typeof value === 'number') {
      parsed = BigInt(Math.trunc(value));
    } else {
      const trimmed = value.trim();
      parsed = /^[+-]?\d+$/.test(trimmed) ? BigInt(trimmed) : BigInt(Math.trunc(Number(trimmed) || 0));
    }
  } catch {
    return 0n;
  }

  return BigInt.asUintN(width, parsed);
};

/** Mask of every bit the supplied options can represent. */
export const knownFlagMask = (flags: FlagOption[]): bigint =>
  flags.reduce((mask, flag) => mask | (1n << BigInt(flag.bit)), 0n);

/** Bits set in the value that no option describes. */
export const unknownFlagBits = (value: bigint, flags: FlagOption[]): bigint =>
  value & ~knownFlagMask(flags);

/**
 * True when every bit of the column width is set.
 *
 * Several cores use that pattern as an explicit "no restriction" sentinel
 * (`AllowableClass`, `AllowableRaces`). It is a meaningful value rather than
 * unknown data, so an editor should not report the bits it has no label for as
 * something unexpected.
 */
export const isAllBitsSet = (value: bigint, width: FlagWidth = 32): boolean =>
  value === (1n << BigInt(width)) - 1n;

/** True when a specific bit is set. */
export const isFlagBitSet = (value: bigint, bit: number): boolean =>
  (value & (1n << BigInt(bit))) !== 0n;

/**
 * Rebuilds a value from the selected labelled bits while keeping every bit the
 * options do not cover.
 *
 * A signed column stores the two's complement of the bit pattern, so a fully
 * set field is emitted as `-1` (HavenCore's "no restriction" sentinel) rather
 * than the unsigned maximum, which would overflow the column on save.
 */
export const composeFlagValue = (
  original: bigint,
  flags: FlagOption[],
  selectedBits: Iterable<number>,
  width: FlagWidth = 32,
  signed = false
): bigint => {
  let selected = 0n;
  for (const bit of selectedBits) {
    selected |= 1n << BigInt(bit);
  }
  const preserved = original & ~knownFlagMask(flags);
  const combined = preserved | selected;
  return signed ? BigInt.asIntN(width, combined) : BigInt.asUintN(width, combined);
};

/**
 * Converts a computed mask back into the shape the record holds.
 *
 * Values that fit exactly in a JavaScript number are returned as numbers so
 * existing editors keep comparing and rendering them as they always have;
 * anything larger is returned as a decimal string to stay exact.
 */
export const flagValueToRecord = (value: bigint): number | string =>
  value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();

/** Hexadecimal rendering used when surfacing preserved unknown bits. */
export const formatFlagHex = (value: bigint): string => `0x${value.toString(16).toUpperCase()}`;
