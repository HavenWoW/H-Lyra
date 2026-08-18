// Editor for quest_poi and quest_poi_points: the map blobs that guide the
// player, and the polygon points that outline each blob.
//
// Both tables are keyed by QuestID and written as a scoped DELETE + INSERT
// through the shared collection generator, so VerifiedBuild and every other
// column survive a save. The tab is titled "POI & Points" because it owns both.

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/ipc';
import { SqlQueryBar } from '../../../components/SqlQueryBar';
import { CollectionColumn, collectionChanged, generateCollectionReplace } from '../../../lib/collectionSql';
import {
  QUEST_POI_TABLE,
  QUEST_POI_SCOPE_COLUMN,
  QUEST_POI_COLUMNS,
} from '../schema/questPoiSchema';
import {
  QUEST_POI_POINTS_TABLE,
  QUEST_POI_POINTS_SCOPE_COLUMN,
  QUEST_POI_POINTS_COLUMNS,
} from '../schema/questPoiPointsSchema';

interface QuestPoiTabProps {
  questId: number;
}

const POI_COLUMNS: CollectionColumn[] = QUEST_POI_COLUMNS;
const POINT_COLUMNS: CollectionColumn[] = QUEST_POI_POINTS_COLUMNS;

type Row = Record<string, number>;

const num = (v: unknown): number => Number(v) || 0;

export const QuestPoiTab: React.FC<QuestPoiTabProps> = ({ questId }) => {
  const [pois, setPois] = useState<Row[]>([]);
  const [initialPois, setInitialPois] = useState<Row[]>([]);
  const [points, setPoints] = useState<Row[]>([]);
  const [initialPoints, setInitialPoints] = useState<Row[]>([]);
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [questId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [poiRes, ptRes] = await Promise.all([
        api.executeSql(
          'world',
          `SELECT ${POI_COLUMNS.map((c) => `\`${c.name}\``).join(', ')} FROM \`quest_poi\` WHERE \`QuestID\` = ${questId} ORDER BY \`BlobIndex\` ASC, \`Idx1\` ASC;`
        ),
        api.executeSql(
          'world',
          `SELECT ${POINT_COLUMNS.map((c) => `\`${c.name}\``).join(', ')} FROM \`quest_poi_points\` WHERE \`QuestID\` = ${questId} ORDER BY \`Idx1\` ASC, \`Idx2\` ASC;`
        ),
      ]);

      const mapRows = (res: any, cols: CollectionColumn[]): Row[] =>
        res && res.success && res.rows
          ? res.rows.map((r: any[]) => Object.fromEntries(cols.map((c, i) => [c.name, num(r[i])])) as Row)
          : [];

      const poiList = mapRows(poiRes, POI_COLUMNS);
      const ptList = mapRows(ptRes, POINT_COLUMNS);
      setPois(poiList);
      setInitialPois(JSON.parse(JSON.stringify(poiList)));
      setPoints(ptList);
      setInitialPoints(JSON.parse(JSON.stringify(ptList)));
    } catch {
      setPois([]);
      setPoints([]);
    } finally {
      setLoading(false);
    }
  };

  const addPoi = () => {
    const nextBlob = pois.length === 0 ? 0 : Math.max(...pois.map((p) => p.BlobIndex)) + 1;
    const row: Row = Object.fromEntries(POI_COLUMNS.map((c) => [c.name, 0])) as Row;
    setPois([...pois, { ...row, QuestID: questId, BlobIndex: nextBlob }]);
  };

  const addPoint = () => {
    const nextIdx2 = points.length === 0 ? 0 : Math.max(...points.map((p) => p.Idx2)) + 1;
    const row: Row = Object.fromEntries(POINT_COLUMNS.map((c) => [c.name, 0])) as Row;
    setPoints([...points, { ...row, QuestID: questId, Idx2: nextIdx2 }]);
  };

  const updatePoi = (index: number, field: string, value: number) =>
    setPois(pois.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  const updatePoint = (index: number, field: string, value: number) =>
    setPoints(points.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  const removePoi = (index: number) => setPois(pois.filter((_, i) => i !== index));
  const removePoint = (index: number) => setPoints(points.filter((_, i) => i !== index));

  const poiDirty = collectionChanged(POI_COLUMNS, initialPois, pois);
  const pointsDirty = collectionChanged(POINT_COLUMNS, initialPoints, points);
  const isDirty = poiDirty || pointsDirty;

  const fullQuery = () =>
    [
      generateCollectionReplace(
        QUEST_POI_TABLE,
        { column: QUEST_POI_SCOPE_COLUMN, value: questId },
        POI_COLUMNS,
        pois
      ),
      generateCollectionReplace(
        QUEST_POI_POINTS_TABLE,
        { column: QUEST_POI_POINTS_SCOPE_COLUMN, value: questId },
        POINT_COLUMNS,
        points
      ),
    ].join('\n\n');

  const activeQueryText = queryMode === 'diff' && !isDirty ? '' : fullQuery();

  const handleCopySql = () => {
    if (!activeQueryText) return;
    navigator.clipboard.writeText(activeQueryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    if (!activeQueryText) return;
    setSaving(true);
    setError(null);
    try {
      await api.executeSql('world', activeQueryText);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteAndCopy = async () => {
    await handleExecute();
    handleCopySql();
  };

  const handleReload = () => {
    setPois(JSON.parse(JSON.stringify(initialPois)));
    setPoints(JSON.parse(JSON.stringify(initialPoints)));
    setError(null);
  };

  const numCell = (row: Row, field: string, onChange: (v: number) => void, className = '') => (
    <input
      type="number"
      value={row[field]}
      onChange={(e) => onChange(num(e.target.value))}
      className={`w-20 px-2 py-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-xs font-mono ${className}`}
    />
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-y-auto p-4 space-y-4 font-sans select-none">
      <SqlQueryBar
        name="quest_poi"
        queryMode={queryMode}
        setQueryMode={setQueryMode}
        activeQueryText={activeQueryText}
        saving={saving}
        copied={copied}
        error={error}
        onCopy={handleCopySql}
        onExecute={handleExecute}
        onExecuteAndCopy={handleExecuteAndCopy}
        onReload={handleReload}
      />

      {/* quest_poi */}
      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base text-slate-800 font-semibold">POI Blobs</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">quest_poi</code> (Quest ID: {questId})
          </p>
        </div>
        <button
          type="button"
          onClick={addPoi}
          className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add POI Blob</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded p-8 text-center text-slate-500 text-sm">Loading…</div>
      ) : pois.length === 0 ? (
        <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 shadow-2xs">
          No POI blobs defined for quest {questId}
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Blob</th>
                <th className="py-2.5 px-3">Idx1</th>
                <th className="py-2.5 px-3">Obj Idx</th>
                <th className="py-2.5 px-3">Objective ID</th>
                <th className="py-2.5 px-3">Map</th>
                <th className="py-2.5 px-3">UiMap</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Flags</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pois.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3">{numCell(p, 'BlobIndex', (v) => updatePoi(idx, 'BlobIndex', v), 'text-blue-600 font-bold')}</td>
                  <td className="py-2 px-3">{numCell(p, 'Idx1', (v) => updatePoi(idx, 'Idx1', v))}</td>
                  <td className="py-2 px-3">{numCell(p, 'ObjectiveIndex', (v) => updatePoi(idx, 'ObjectiveIndex', v))}</td>
                  <td className="py-2 px-3">{numCell(p, 'QuestObjectiveID', (v) => updatePoi(idx, 'QuestObjectiveID', v), 'text-purple-600 font-bold')}</td>
                  <td className="py-2 px-3">{numCell(p, 'MapID', (v) => updatePoi(idx, 'MapID', v))}</td>
                  <td className="py-2 px-3">{numCell(p, 'UiMapID', (v) => updatePoi(idx, 'UiMapID', v))}</td>
                  <td className="py-2 px-3">{numCell(p, 'Priority', (v) => updatePoi(idx, 'Priority', v))}</td>
                  <td className="py-2 px-3">{numCell(p, 'Flags', (v) => updatePoi(idx, 'Flags', v))}</td>
                  <td className="py-2 px-3 text-right">
                    <button type="button" onClick={() => removePoi(idx)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* quest_poi_points */}
      <div className="bg-white border border-[#E2E8F0] rounded p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base text-slate-800 font-semibold">POI Points</h2>
          <p className="text-xs text-slate-500 font-mono">
            Table: <code className="text-blue-600 font-bold">quest_poi_points</code> — polygon vertices, grouped by Idx1
          </p>
        </div>
        <button
          type="button"
          onClick={addPoint}
          className="bg-[#198754] hover:bg-[#157347] text-white text-xs font-semibold px-3.5 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Point</span>
        </button>
      </div>

      {points.length === 0 ? (
        <div className="w-full bg-[#F1F3F5] border border-[#E2E8F0] rounded py-3 text-center text-[13px] text-slate-700 shadow-2xs">
          No POI points defined for quest {questId}
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Idx1 (blob)</th>
                <th className="py-2.5 px-3">Idx2 (point)</th>
                <th className="py-2.5 px-3">X</th>
                <th className="py-2.5 px-3">Y</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {points.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3">{numCell(p, 'Idx1', (v) => updatePoint(idx, 'Idx1', v), 'text-blue-600 font-bold')}</td>
                  <td className="py-2 px-3">{numCell(p, 'Idx2', (v) => updatePoint(idx, 'Idx2', v))}</td>
                  <td className="py-2 px-3">{numCell(p, 'X', (v) => updatePoint(idx, 'X', v))}</td>
                  <td className="py-2 px-3">{numCell(p, 'Y', (v) => updatePoint(idx, 'Y', v))}</td>
                  <td className="py-2 px-3 text-right">
                    <button type="button" onClick={() => removePoint(idx)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
