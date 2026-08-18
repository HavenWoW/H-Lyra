// Shared SQL value formatting for every SQL-backed editor.
//
// Generated statements are executed against MySQL and are also copied out by
// users to be applied by hand, so they have to be correct on their own: fully
// escaped strings, real NULLs for nullable columns, and numbers that never
// depend on the machine's locale.

/**
 * Physical shape of a column, used to decide how a value is rendered.
 *
 * `text` covers CHAR/VARCHAR/TEXT, `int` every integer width including 64-bit,
 * and `float` the floating point columns.
 */
export type SqlValueKind = 'text' | 'int' | 'float';

export interface SqlColumnFormat {
  kind: SqlValueKind;
  /** When false, an empty or missing value is written as the empty string. */
  nullable: boolean;
}

/**
 * Escapes a string for inclusion in a single-quoted MySQL literal.
 *
 * The backslash has to be escaped first, otherwise the escapes added for the
 * other characters would themselves be re-escaped. NUL, newline, carriage
 * return and Ctrl-Z are escaped because MySQL treats them specially inside
 * string literals and because an embedded newline breaks copied-out SQL.
 */
export const escapeSqlString = (value: string): string =>
  (value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');

/** Wraps a value in quotes and escapes it. */
export const quoteSqlString = (value: string): string => `'${escapeSqlString(value)}'`;

/**
 * Renders an integer, preserving full 64-bit precision.
 *
 * Values arrive from the database as JSON numbers and from inputs as strings.
 * Anything that is already an exact integer string is passed through untouched
 * so that a 64-bit column such as `npcflag` never round-trips through a lossy
 * float.
 */
export const formatSqlInt = (value: unknown): string => {
  if (typeof value === 'bigint') return value.toString();

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return '0';
    // An exact integer literal is emitted verbatim, with no precision loss.
    if (/^[+-]?\d+$/.test(trimmed)) return String(BigInt(trimmed));
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : '0';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(Math.trunc(value)) : '0';
  }

  if (typeof value === 'boolean') return value ? '1' : '0';

  return '0';
};

/**
 * Renders a floating point value in a locale-independent form.
 *
 * `String(number)` in JavaScript is always locale-independent and switches to
 * exponent notation only outside 1e-7..1e21, which MySQL accepts. What must be
 * avoided is `toLocaleString`, which would emit a comma decimal separator on
 * many systems.
 */
export const formatSqlFloat = (value: unknown): string => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return '0';
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? String(parsed) : '0';
  }

  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'bigint') return value.toString();

  return '0';
};

/**
 * Renders a single column value as a SQL literal.
 *
 * NULL and the empty string are kept strictly distinct. Only an actual `null`
 * or `undefined` becomes `NULL`, and only on a nullable column; an empty string
 * always stays `''`. Collapsing the two would mean a row loaded with `''` came
 * back as `NULL` after an unchanged save, which is exactly the silent rewrite
 * the full query exists to avoid.
 *
 * A missing value on a non-nullable column falls back to the empty string for
 * text and zero for numbers, matching how the table defaults are declared.
 */
export const formatSqlValue = (value: unknown, column: SqlColumnFormat): string => {
  const isMissing = value === undefined || value === null;

  if (isMissing) {
    if (column.nullable) return 'NULL';
    return column.kind === 'text' ? "''" : '0';
  }

  if (column.kind === 'text') return quoteSqlString(String(value));

  return column.kind === 'float' ? formatSqlFloat(value) : formatSqlInt(value);
};

/**
 * Compares two loaded/edited values for equality, tolerating the type drift
 * between a value read from the database and the same value re-entered through
 * a form input.
 */
export const sqlValuesEqual = (left: unknown, right: unknown, column: SqlColumnFormat): boolean => {
  const leftMissing = left === undefined || left === null;
  const rightMissing = right === undefined || right === null;
  if (leftMissing && rightMissing) return true;

  if (column.kind === 'text') {
    // NULL and '' are different values on a nullable column, so changing one
    // into the other is a real edit. On a non-nullable column a missing value
    // can only mean the empty string.
    if (leftMissing || rightMissing) {
      if (column.nullable) return false;
      const present = leftMissing ? right : left;
      return String(present) === '';
    }
    return String(left) === String(right);
  }

  if (leftMissing || rightMissing) return false;

  return column.kind === 'float'
    ? formatSqlFloat(left) === formatSqlFloat(right)
    : formatSqlInt(left) === formatSqlInt(right);
};
