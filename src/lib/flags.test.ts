// Covers bitmask arithmetic, in particular that bits above 31 are handled with
// 64-bit precision and that unlabelled bits survive an edit.

import { describe, expect, it } from 'vitest';
import { FlagOption } from '../constants/itemOptions';
import {
  composeFlagValue,
  flagValueToRecord,
  isAllBitsSet,
  isFlagBitSet,
  knownFlagMask,
  parseFlagValue,
  unknownFlagBits,
} from './flags';

/** A deliberately sparse option set, so bits 2 and 5 have no label. */
const OPTIONS: FlagOption[] = [
  { bit: 0, name: 'Gossip' },
  { bit: 1, name: 'Quest Giver' },
  { bit: 3, name: 'Trainer' },
  { bit: 4, name: 'Vendor' },
];

describe('parseFlagValue', () => {
  it('reads numbers, strings and bigints', () => {
    expect(parseFlagValue(6)).toBe(6n);
    expect(parseFlagValue('6')).toBe(6n);
    expect(parseFlagValue(6n)).toBe(6n);
    expect(parseFlagValue(null)).toBe(0n);
    expect(parseFlagValue('')).toBe(0n);
  });

  it('reads a negative sentinel as the full mask for the column width', () => {
    expect(parseFlagValue(-1, 32)).toBe(0xffffffffn);
    expect(parseFlagValue(-1, 64)).toBe(0xffffffffffffffffn);
  });

  it('keeps 64-bit values exact', () => {
    // Bit 43 is the highest npcflag HavenCore defines.
    expect(parseFlagValue('8796093022208', 64)).toBe(1n << 43n);
  });
});

describe('bit arithmetic above 31', () => {
  it('does not wrap the way JavaScript bitwise operators do', () => {
    // 1 << 33 evaluates to 2 with the built-in operators; BigInt does not wrap.
    const value = 1n << 33n;
    expect(isFlagBitSet(value, 33)).toBe(true);
    expect(isFlagBitSet(value, 1)).toBe(false);
    expect(value).toBe(8589934592n);
  });

  it('composes high bits correctly', () => {
    const highOptions: FlagOption[] = [
      { bit: 33, name: 'Garrison Architect' },
      { bit: 38, name: 'Tradeskill NPC' },
    ];
    const composed = composeFlagValue(0n, highOptions, [33, 38], 64);
    expect(composed).toBe((1n << 33n) | (1n << 38n));
  });
});

describe('unknown bit preservation', () => {
  it('reports bits the options do not describe', () => {
    const value = parseFlagValue(0b101101); // bits 0, 2, 3, 5
    expect(knownFlagMask(OPTIONS)).toBe(0b011011n);
    expect(unknownFlagBits(value, OPTIONS)).toBe(0b100100n); // bits 2 and 5
  });

  it('keeps unlabelled bits when the labelled ones are edited', () => {
    // bits 0 (known), 2 and 5 (unknown) are set; the user turns bit 0 off and
    // bit 4 on. The unknown bits must survive untouched.
    const original = parseFlagValue(0b100101);
    const result = composeFlagValue(original, OPTIONS, [4]);
    expect(result).toBe(0b110100n); // bits 2, 4, 5
    expect(unknownFlagBits(result, OPTIONS)).toBe(0b100100n);
  });

  it('keeps unlabelled bits when everything labelled is cleared', () => {
    const original = parseFlagValue(0b100100 | 0b1011);
    const result = composeFlagValue(original, OPTIONS, []);
    expect(result).toBe(0b100100n);
  });

  it('round-trips a value whose labelled bits are unchanged', () => {
    const original = parseFlagValue(0b101101);
    const selected = OPTIONS.filter((o) => isFlagBitSet(original, o.bit)).map((o) => o.bit);
    expect(composeFlagValue(original, OPTIONS, selected)).toBe(original);
  });
});

describe('signed columns', () => {
  // Class options mirror item_sparse.AllowableClass: a signed smallint whose
  // "all classes" sentinel is -1.
  const CLASSES: FlagOption[] = Array.from({ length: 12 }, (_, i) => ({
    bit: i,
    name: `Class ${i + 1}`,
  }));

  it('reads the -1 sentinel to the full mask for a 16-bit column', () => {
    expect(parseFlagValue(-1, 16)).toBe(0xffffn);
  });

  it('emits -1 when every bit of a signed column is set', () => {
    for (const width of [16, 32, 64] as const) {
      const all = parseFlagValue(-1, width);
      const bits = Array.from({ length: width }, (_, i) => i);
      const composed = composeFlagValue(all, [], bits, width, true);
      expect(composed).toBe(-1n);
      expect(flagValueToRecord(composed)).toBe(-1);
    }
  });

  it('keeps the unsigned maximum when the column is unsigned (default)', () => {
    const all = parseFlagValue(-1, 32);
    const bits = Array.from({ length: 32 }, (_, i) => i);
    expect(composeFlagValue(all, [], bits, 32)).toBe(0xffffffffn);
  });

  it('emits a negative value for a signed int with bit 31 set', () => {
    // item_sparse.Flags1..4 are signed int; selecting bit 31 must not overflow.
    const composed = composeFlagValue(0n, [{ bit: 31, name: 'High' }], [31], 32, true);
    expect(composed).toBe(-2147483648n);
    expect(flagValueToRecord(composed)).toBe(-2147483648);
  });

  it('round-trips "all classes" through the signed 16-bit path as -1', () => {
    const original = parseFlagValue(-1, 16);
    const selected = CLASSES.map((c) => c.bit);
    const composed = composeFlagValue(original, CLASSES, selected, 16, true);
    // All 12 class bits plus the preserved unlabelled bits 12-15 -> -1.
    expect(composed).toBe(-1n);
  });

  it('emits a positive value when only some classes are selected', () => {
    // Warrior (bit 0) + Paladin (bit 1) on an otherwise empty field stays +3.
    const composed = composeFlagValue(0n, CLASSES, [0, 1], 16, true);
    expect(composed).toBe(3n);
    expect(flagValueToRecord(composed)).toBe(3);
  });
});

describe('isAllBitsSet', () => {
  it('recognises the full mask at each width', () => {
    expect(isAllBitsSet(parseFlagValue(-1, 16), 16)).toBe(true);
    expect(isAllBitsSet(parseFlagValue(-1, 32), 32)).toBe(true);
    expect(isAllBitsSet(parseFlagValue('18446744073709551615', 64), 64)).toBe(true);
  });

  it('is false for a partial mask or the wrong width', () => {
    expect(isAllBitsSet(0xffffn, 32)).toBe(false);
    expect(isAllBitsSet(0n, 32)).toBe(false);
    expect(isAllBitsSet(0b1011n, 32)).toBe(false);
  });
});

describe('flagValueToRecord', () => {
  it('returns a number while the value stays exact', () => {
    expect(flagValueToRecord(1n << 43n)).toBe(8796093022208);
    expect(typeof flagValueToRecord(3n)).toBe('number');
  });

  it('switches to a string beyond the exact integer range', () => {
    const huge = 1n << 60n;
    expect(flagValueToRecord(huge)).toBe('1152921504606846976');
    expect(typeof flagValueToRecord(huge)).toBe('string');
  });
});
