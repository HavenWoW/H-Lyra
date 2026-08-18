// Covers SQL escaping, NULL handling and numeric formatting.

import { describe, expect, it } from 'vitest';
import {
  escapeSqlString,
  formatSqlFloat,
  formatSqlInt,
  formatSqlValue,
  quoteSqlString,
  sqlValuesEqual,
} from './sql';

const nullableText = { kind: 'text', nullable: true } as const;
const requiredText = { kind: 'text', nullable: false } as const;
const requiredInt = { kind: 'int', nullable: false } as const;
const requiredFloat = { kind: 'float', nullable: false } as const;

describe('escapeSqlString', () => {
  it('escapes the backslash before anything else', () => {
    // Escaping the quote first would leave the added backslash unescaped and
    // terminate the literal early.
    expect(escapeSqlString("a\\'b")).toBe("a\\\\\\'b");
  });

  it('escapes a lone trailing backslash', () => {
    expect(quoteSqlString('path\\')).toBe("'path\\\\'");
  });

  it('escapes quotes, newlines and control characters', () => {
    expect(escapeSqlString("O'Brien")).toBe("O\\'Brien");
    expect(escapeSqlString('a\nb')).toBe('a\\nb');
    expect(escapeSqlString('a\r\nb')).toBe('a\\r\\nb');
    expect(escapeSqlString('a\0b')).toBe('a\\0b');
    expect(escapeSqlString('a\x1ab')).toBe('a\\Zb');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeSqlString('Thunderfury, Blessed Blade')).toBe('Thunderfury, Blessed Blade');
  });
});

describe('formatSqlValue', () => {
  it('keeps NULL and the empty string distinct on a nullable column', () => {
    // A row loaded with '' must save back as '' rather than becoming NULL.
    expect(formatSqlValue(null, nullableText)).toBe('NULL');
    expect(formatSqlValue(undefined, nullableText)).toBe('NULL');
    expect(formatSqlValue('', nullableText)).toBe("''");
    expect(formatSqlValue('Guild Master', nullableText)).toBe("'Guild Master'");
  });

  it('never emits NULL for a non-nullable column', () => {
    expect(formatSqlValue(null, requiredText)).toBe("''");
    expect(formatSqlValue(undefined, requiredInt)).toBe('0');
  });

  it('quotes and escapes text values', () => {
    expect(formatSqlValue("O'Brien\\Test", requiredText)).toBe("'O\\'Brien\\\\Test'");
  });
});

describe('formatSqlInt', () => {
  it('preserves 64-bit values exactly', () => {
    // npcflag is a bigint column; the highest flag HavenCore defines is bit 43.
    expect(formatSqlInt('8796093022208')).toBe('8796093022208');
    expect(formatSqlInt(8796093022208)).toBe('8796093022208');
    expect(formatSqlInt('18446744073709551615')).toBe('18446744073709551615');
  });

  it('truncates fractional input and handles blanks', () => {
    expect(formatSqlInt(5.9)).toBe('5');
    expect(formatSqlInt('')).toBe('0');
    expect(formatSqlInt(null)).toBe('0');
    expect(formatSqlInt(-3)).toBe('-3');
  });
});

describe('formatSqlFloat', () => {
  it('is locale independent', () => {
    // String() never uses a comma decimal separator, unlike toLocaleString.
    expect(formatSqlFloat(1.14286)).toBe('1.14286');
    expect(formatSqlFloat(0.1)).toBe('0.1');
    expect(formatSqlFloat('2.5')).toBe('2.5');
  });

  it('falls back to zero for non-finite input', () => {
    expect(formatSqlFloat(Number.NaN)).toBe('0');
    expect(formatSqlFloat(Number.POSITIVE_INFINITY)).toBe('0');
    expect(formatSqlFloat('')).toBe('0');
  });
});

describe('sqlValuesEqual', () => {
  it('treats NULL and the empty string as different on a nullable column', () => {
    expect(sqlValuesEqual(null, '', nullableText)).toBe(false);
    expect(sqlValuesEqual('', null, nullableText)).toBe(false);
    expect(sqlValuesEqual(null, null, nullableText)).toBe(true);
    expect(sqlValuesEqual('', '', nullableText)).toBe(true);
  });

  it('tolerates the string/number drift of form inputs', () => {
    expect(sqlValuesEqual(5, '5', requiredInt)).toBe(true);
    expect(sqlValuesEqual(1, 1.0, requiredFloat)).toBe(true);
    expect(sqlValuesEqual(5, 6, requiredInt)).toBe(false);
  });

  it('treats a missing value on a required text column as the empty string', () => {
    expect(sqlValuesEqual(undefined, '', requiredText)).toBe(true);
    expect(sqlValuesEqual(undefined, 'x', requiredText)).toBe(false);
  });
});
