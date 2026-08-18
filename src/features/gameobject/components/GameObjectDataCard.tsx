// The Data0..Data33 columns of gameobject_template.
//
// Their meaning depends on the object's `type`, so the card renders, for the
// selected type, each defined Data slot with its real HavenCore name and a
// typed control (bool / entity picker / enum / bounded int). Every slot the type
// does not describe is shown in a collapsible "Raw Data" section as a plain
// signed-int box, so unknown or unsupported values stay visible, editable and
// preserved. Metadata comes from gameObjectTypeData.ts.

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { InfoTooltip, SelectorButton } from './GameObjectTooltip';
import { SelectorModalState } from '../types';
import { GAMEOBJECT_TYPE_OPTIONS } from '../../../constants/gameObjectOptions';
import { DataFieldDef, dataFieldsForType } from '../schema/gameObjectTypeData';

const TOTAL_DATA = 34;

interface GameObjectDataCardProps {
  go: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  openSelector: (state: SelectorModalState) => void;
}

const typeName = (type: number): string =>
  GAMEOBJECT_TYPE_OPTIONS.find((o) => o.value === type)?.name ?? `Type ${type}`;

const num = (v: unknown): number => Number(v) || 0;

export const GameObjectDataCard: React.FC<GameObjectDataCardProps> = ({
  go,
  onChange,
  openSelector,
}) => {
  const [showRaw, setShowRaw] = useState(false);
  const type = num(go.type);
  const defined = dataFieldsForType(type);
  const definedIndices = new Set(defined.map((f) => f.index));
  const rawIndices = Array.from({ length: TOTAL_DATA }, (_, i) => i).filter(
    (i) => !definedIndices.has(i)
  );

  const rawFieldName = (index: number) => `Data${index}`;

  const renderTypedField = (field: DataFieldDef) => {
    const fieldName = `Data${field.index}`;
    const value = num(go[fieldName]);
    const label = (
      <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
        <span className="font-mono text-slate-400">D{field.index}</span>
        <span className="truncate">{field.name}</span>
        {field.hint && <InfoTooltip text={`Data${field.index} — ${field.name} (${field.hint})`} />}
      </label>
    );

    if (field.editor === 'bool') {
      return (
        <div key={field.index} className="col-span-6 sm:col-span-4 md:col-span-3">
          {label}
          <select
            value={value === 0 ? 0 : 1}
            onChange={(e) => onChange(fieldName, Number(e.target.value))}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1.5 rounded focus:border-blue-500 focus:outline-none"
          >
            <option value={0}>0 — No</option>
            <option value={1}>1 — Yes</option>
          </select>
        </div>
      );
    }

    if (field.editor === 'enum' && field.options) {
      const known = field.options.some((o) => o.value === value);
      return (
        <div key={field.index} className="col-span-6 sm:col-span-4 md:col-span-3">
          {label}
          <select
            value={value}
            onChange={(e) => onChange(fieldName, Number(e.target.value))}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1.5 rounded focus:border-blue-500 focus:outline-none"
          >
            {!known && <option value={value}>{`${value} (unknown)`}</option>}
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.editor === 'entity' && field.entityType) {
      return (
        <div key={field.index} className="col-span-6 sm:col-span-4 md:col-span-3">
          <div className="flex items-center justify-between mb-1">
            {label}
            <SelectorButton
              onClick={() =>
                openSelector({
                  type: 'entity',
                  title: `Select ${field.name}`,
                  field: fieldName,
                  entityType: field.entityType,
                })
              }
            />
          </div>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(fieldName, num(e.target.value))}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
      );
    }

    // int
    return (
      <div key={field.index} className="col-span-6 sm:col-span-4 md:col-span-3">
        {label}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(fieldName, num(e.target.value))}
          className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none"
        />
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs select-none">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span>Data Properties (Data0 – Data33)</span>
          <span className="text-xs font-normal text-blue-600 font-mono">[{typeName(type)}]</span>
        </h2>
      </div>

      {defined.length === 0 ? (
        <p className="text-xs text-slate-500">
          This GameObject type defines no named Data fields; all 34 slots are editable below as raw
          integers.
        </p>
      ) : (
        <div className="grid grid-cols-12 gap-3">{defined.map(renderTypedField)}</div>
      )}

      {rawIndices.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowRaw((s) => !s)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            {showRaw ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span>
              Raw Data ({rawIndices.length} slot{rawIndices.length === 1 ? '' : 's'} not used by this
              type)
            </span>
          </button>
          {showRaw && (
            <div className="grid grid-cols-12 gap-3 mt-3">
              {rawIndices.map((index) => (
                <div key={index} className="col-span-6 sm:col-span-3 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 font-mono mb-1 block">
                    Data{index}
                  </label>
                  <input
                    type="number"
                    value={num(go[rawFieldName(index)])}
                    onChange={(e) => onChange(rawFieldName(index), num(e.target.value))}
                    className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2 py-1.5 rounded font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
