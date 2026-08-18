// One table column, rendered according to its editor kind from the schema
// module: text, number, enum, flags, bool or an entity picker.
//
// Table-agnostic: it renders any `TableColumn`, so every schema-driven editor
// shares one implementation of the null toggle, the unknown-flag-bit warning
// and the unrecognised-enum-value fallback.

import React from 'react';
import { InfoTooltip, SelectorButton } from './FieldAffordances';
import { IconNameSelect } from '../IconNameSelect';
import { SelectorModalState } from './types';
import { TableColumn } from '../../lib/tableSchema';
import { formatFlagHex, isAllBitsSet, parseFlagValue, unknownFlagBits } from '../../lib/flags';

interface FieldRowProps {
  column: TableColumn;
  value: unknown;
  onChange: (field: string, value: unknown) => void;
  openSelector?: (config: SelectorModalState) => void;
}

/** Grid width each editor kind gets, so the cards stay readable. */
const spanFor = (column: TableColumn): string => {
  if (column.editor === 'text') {
    return column.wide ? 'col-span-12 sm:col-span-5' : 'col-span-12 sm:col-span-4';
  }
  if (column.editor === 'flags') return 'col-span-12 sm:col-span-4';
  if (column.editor === 'enum') return 'col-span-6 sm:col-span-3';
  return 'col-span-6 sm:col-span-2';
};

const inputClass =
  'w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none';
const disabledInputClass =
  'w-full bg-slate-100 border border-slate-200 text-slate-500 text-xs px-2.5 py-1.5 rounded font-mono cursor-not-allowed';

export const FieldRow: React.FC<FieldRowProps> = ({ column, value, onChange, openSelector }) => {
  const isNull = value === null || value === undefined;

  const label = (
    <label className="text-xs font-bold text-slate-700 flex items-center flex-wrap gap-y-0.5">
      <span className="font-mono">{column.name}</span>
      {column.editor === 'entity' && openSelector && column.entityType && (
        <SelectorButton
          onClick={() =>
            openSelector({
              type: 'entity',
              entityType: column.entityType,
              title: `Select ${column.label}`,
              field: column.name,
            })
          }
        />
      )}
      {column.editor === 'flags' && openSelector && column.flags && (
        <SelectorButton
          onClick={() =>
            openSelector({
              type: 'flags',
              title: `${column.label} (${column.name})`,
              field: column.name,
              flags: column.flags,
              isBigInt: column.bigint,
            })
          }
        />
      )}
      {(column.hint || !column.coreLoaded) && (
        <InfoTooltip
          text={
            [
              column.hint,
              column.coreLoaded ? null : 'Stored in the table but not read by HavenCore.',
            ]
              .filter(Boolean)
              .join(' ') || column.label
          }
        />
      )}
      {!column.coreLoaded && (
        <span className="ml-1.5 text-[9px] uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-px font-sans">
          unused
        </span>
      )}
    </label>
  );

  // ---- primary key -------------------------------------------------------
  if (column.primaryKey) {
    return (
      <div className={`${spanFor(column)} space-y-1`}>
        {label}
        <input type="number" value={Number(value ?? 0)} disabled className={disabledInputClass} />
      </div>
    );
  }

  // ---- text --------------------------------------------------------------
  if (column.editor === 'text') {
    const useIconPicker = column.widget === 'iconName';
    return (
      <div className={`${spanFor(column)} space-y-1`}>
        <div className="flex items-center justify-between gap-2">
          {label}
          {column.nullable && (
            // NULL and the empty string are different values in the database,
            // so switching between them has to be an explicit action.
            <button
              type="button"
              onClick={() => onChange(column.name, isNull ? '' : null)}
              className={`text-[9px] uppercase tracking-wide font-bold px-1.5 py-px rounded border transition-colors cursor-pointer font-sans ${
                isNull
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
              }`}
              title={isNull ? 'Currently NULL. Click to store an empty string.' : 'Store NULL instead of text.'}
            >
              null
            </button>
          )}
        </div>
        {useIconPicker && !isNull ? (
          <IconNameSelect
            value={String(value ?? '')}
            onChange={(next) => onChange(column.name, next)}
          />
        ) : (
          <input
            type="text"
            value={isNull ? '' : String(value)}
            disabled={isNull}
            placeholder={isNull ? 'NULL' : undefined}
            onChange={(e) => onChange(column.name, e.target.value)}
            className={isNull ? disabledInputClass : inputClass.replace(' font-mono', '')}
          />
        )}
      </div>
    );
  }

  // ---- enum / bool -------------------------------------------------------
  if ((column.editor === 'enum' || column.editor === 'bool') && column.options) {
    const numeric = Number(value ?? column.default ?? 0);
    const known = column.options.some((option) => option.value === numeric);
    return (
      <div className={`${spanFor(column)} space-y-1`}>
        {label}
        <select
          value={numeric}
          onChange={(e) => onChange(column.name, Number(e.target.value))}
          className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded focus:border-blue-500 focus:outline-none"
        >
          {/* An unrecognised stored value is offered as-is so opening the
              dropdown cannot quietly change it. */}
          {!known && <option value={numeric}>{`Unknown (${numeric})`}</option>}
          {column.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ---- flags -------------------------------------------------------------
  if (column.editor === 'flags') {
    const width = column.bigint ? 64 : 32;
    const parsed = parseFlagValue(value as number | string, width);
    const preserved = column.flags ? unknownFlagBits(parsed, column.flags) : 0n;
    // A fully set mask is the "no restriction" sentinel, not unknown data.
    const allBits = isAllBitsSet(parsed, width);
    return (
      <div className={`${spanFor(column)} space-y-1`}>
        {label}
        <input
          type="text"
          inputMode="numeric"
          value={String(value ?? 0)}
          onChange={(e) => onChange(column.name, e.target.value.trim())}
          // Normalise on blur so a value that cannot fit the column — pasted, or
          // left behind by an earlier build — is folded into range here rather
          // than being rejected by the server on save.
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (raw === '') return;
            const normalised = parseFlagValue(raw, width).toString();
            if (normalised !== raw) onChange(column.name, normalised);
          }}
          className={inputClass}
        />
        {!allBits && preserved !== 0n && (
          <p className="text-[10px] text-amber-700 font-mono">
            includes unlabelled bits {formatFlagHex(preserved)}
          </p>
        )}
      </div>
    );
  }

  // ---- float -------------------------------------------------------------
  if (column.editor === 'float') {
    return (
      <div className={`${spanFor(column)} space-y-1`}>
        {label}
        <input
          type="number"
          step="any"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(column.name, e.target.value === '' ? 0 : Number(e.target.value))}
          className={inputClass}
        />
      </div>
    );
  }

  // ---- int / entity ------------------------------------------------------
  return (
    <div className={`${spanFor(column)} space-y-1`}>
      {label}
      <input
        type="number"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) =>
          onChange(column.name, e.target.value === '' ? 0 : Math.trunc(Number(e.target.value)))
        }
        className={inputClass}
      />
    </div>
  );
};
