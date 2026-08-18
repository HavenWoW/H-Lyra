// One card of a schema-driven editor: a titled group of columns from a schema
// module, rendered as a grid of FieldRow.

import React from 'react';
import { FieldRow } from './FieldRow';
import { SelectorModalState } from './types';
import { TableColumn } from '../../lib/tableSchema';

interface FieldCardProps {
  title: string;
  /** Shown under the title, used to flag columns HavenCore ignores. */
  note?: string;
  columns: TableColumn[];
  record: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  openSelector?: (config: SelectorModalState) => void;
}

/** One group of table columns, rendered from the schema. */
export const FieldCard: React.FC<FieldCardProps> = ({
  title,
  note,
  columns,
  record,
  onChange,
  openSelector,
}) => {
  if (columns.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs select-none">
      <div className="border-b border-slate-200 pb-2.5">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {note && <p className="text-[11px] text-slate-500 mt-0.5 font-sans">{note}</p>}
      </div>

      <div className="grid grid-cols-12 gap-3">
        {columns.map((column) => (
          <FieldRow
            key={column.name}
            column={column}
            value={record[column.name]}
            onChange={onChange}
            openSelector={openSelector}
          />
        ))}
      </div>
    </div>
  );
};
