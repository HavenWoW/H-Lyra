// New-entity form shown on the select screens.
//
// Suggests the next free id for the target table and checks the chosen id is not
// already taken before handing off to the caller.

import React, { useState, useEffect, useRef } from 'react';
import { Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/ipc';

interface EntityCreateCardProps {
  entityTable: string;
  entityIdField: string;
  customStartingId: number;
  dbType?: string;
  onSelect: (newId: number) => void;
}

export const EntityCreateCard: React.FC<EntityCreateCardProps> = ({
  entityTable,
  entityIdField,
  customStartingId,
  dbType = 'world',
  onSelect,
}) => {
  const [idModel, setIdModel] = useState<number | string>(customStartingId);
  const [isIdFree, setIsIdFree] = useState<boolean | null>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const checkTimeoutRef = useRef<any>(null);

  // Calculate next free starting ID on mount
  useEffect(() => {
    const fetchNextId = async () => {
      try {
        setChecking(true);
        const query = `SELECT MAX(\`${entityIdField}\`) as max_id FROM \`${entityTable}\`;`;
        const res = await api.executeSql(dbType, query);
        if (res && res.success && res.rows && res.rows.length > 0) {
          const maxVal = Number(res.rows[0][0]) || 0;
          const nextId = maxVal < customStartingId ? customStartingId : maxVal + 1;
          setIdModel(nextId);
          checkAvailability(nextId);
        }
      } catch (e) {
        console.error('Failed to get max ID:', e);
      } finally {
        setChecking(false);
      }
    };

    fetchNextId();
  }, [entityTable, entityIdField, customStartingId, dbType]);

  // Real-time check if ID is free
  const checkAvailability = async (id: number | string) => {
    const num = Number(id);
    if (!id || isNaN(num) || num <= 0) {
      setIsIdFree(null);
      return;
    }
    setChecking(true);
    try {
      // Check SQL database
      const query = `SELECT 1 FROM \`${entityTable}\` WHERE \`${entityIdField}\` = ${num} LIMIT 1;`;
      const res = await api.executeSql(dbType, query);
      const isSqlInUse = res && res.success && res.rows && res.rows.length > 0;

      if (isSqlInUse) {
        setIsIdFree(false);
        return;
      }

      // If checking items, also check DB2 base catalog
      if (entityTable === 'item_sparse' || entityTable === 'item' || entityTable === 'item_template') {
        const db2Item = await api.getEffectiveItem(num);
        if (db2Item && (db2Item.db2_sparse_found || db2Item.db2_item_found)) {
          setIsIdFree(false);
          return;
        }
      }

      setIsIdFree(true);
    } catch {
      setIsIdFree(true);
    } finally {
      setChecking(false);
    }
  };

  const handleInputChange = (val: string) => {
    setIdModel(val);
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }
    checkTimeoutRef.current = setTimeout(() => {
      checkAvailability(val);
    }, 250);
  };

  const isNumericValid = typeof idModel === 'number' ? idModel > 0 : Boolean(idModel && Number(idModel) > 0);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded p-4 space-y-2 shadow-sm font-sans">
      <h2 className="text-base font-bold text-slate-900 font-sans">Create New</h2>
      <p className="text-xs text-slate-700 font-sans">
        Create a new <span className="font-bold">{entityTable}</span> by selecting an empty <span className="font-bold">{entityIdField}</span>:
      </p>

      <div className="flex items-center space-x-2 pt-1">
        <input
          type="number"
          value={idModel}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-36 px-2.5 py-1 text-sm border border-slate-300 rounded focus:border-blue-500 focus:outline-none font-sans font-mono"
        />
        <button
          type="button"
          disabled={isIdFree !== true || !isNumericValid || checking}
          onClick={() => onSelect(Number(idModel))}
          className={`text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1 shadow-sm transition-colors cursor-pointer ${
            isIdFree === true && isNumericValid && !checking
              ? 'bg-[#198754] hover:bg-[#157347] text-white'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>
      </div>

      <div className="flex items-center space-x-1.5 pt-1 text-xs font-medium min-h-[22px]">
        {checking ? (
          <div className="flex items-center space-x-1.5 text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            <span>Checking availability...</span>
          </div>
        ) : !isNumericValid ? (
          <div className="text-slate-400 text-xs">Please enter an entry ID</div>
        ) : isIdFree === true ? (
          <div className="flex items-center space-x-1.5 text-slate-900 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 fill-slate-900 text-white" />
            <span>The entry is free</span>
          </div>
        ) : isIdFree === false ? (
          <div className="flex items-center space-x-1.5 text-red-600 font-medium">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>The entry is already in use</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EntityCreateCard;
