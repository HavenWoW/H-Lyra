// Entity picker for id columns.
//
// Factions, faction templates and emotes resolve through the DB2 catalog so the
// client files are the source of truth; the remaining entity kinds fall back to
// a world-database query.

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Sparkles,
  Sword,
  Shield,
  Box,
  Users,
  Scroll,
  Volume2,
  RefreshCw,
  Eye,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { api } from '../lib/ipc';
import { escapeSqlString } from '../lib/sql';

export type SelectorType =
  | 'spell'
  | 'item'
  | 'creature'
  | 'gameobject'
  | 'quest'
  | 'currency'
  | 'faction'
  | 'faction_template'
  | 'display'
  | 'gameobject_display'
  | 'sound'
  | 'emote';

/** Rows added per scroll step; the picker lists every match, not a capped page. */
const ROW_PAGE_SIZE = 200;

interface EntitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: SelectorType;
  onSelect: (id: number, name?: string, rawData?: any) => void;
  title?: string;
  initialValue?: number;
}

export const EntitySelectorModal: React.FC<EntitySelectorModalProps> = ({
  isOpen,
  onClose,
  type,
  onSelect,
  title,
  initialValue = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number>(initialValue);
  const [sortColumn, setSortColumn] = useState<'id' | 'name'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleCount, setVisibleCount] = useState<number>(ROW_PAGE_SIZE);

  const toggleSort = (col: 'id' | 'name') => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Memoised: the result set is unbounded, so re-sorting on every render (including
  // each scroll tick that reveals more rows) would be needlessly expensive.
  const sortedResults = useMemo(
    () =>
      [...results].sort((a, b) => {
        if (sortColumn === 'id') {
          const idA = Number(a[0]) || 0;
          const idB = Number(b[0]) || 0;
          return sortDirection === 'asc' ? idA - idB : idB - idA;
        } else {
          const nameA = String(a[1] || '').toLowerCase();
          const nameB = String(b[1] || '').toLowerCase();
          const cmp = nameA.localeCompare(nameB);
          return sortDirection === 'asc' ? cmp : -cmp;
        }
      }),
    [results, sortColumn, sortDirection]
  );

  // Rows are added as the user scrolls, so listing a whole catalog does not
  // build tens of thousands of DOM nodes up front.
  const visibleResults = useMemo(
    () => sortedResults.slice(0, visibleCount),
    [sortedResults, visibleCount]
  );

  // A fresh result set starts at the top of the list again.
  useEffect(() => {
    setVisibleCount(ROW_PAGE_SIZE);
  }, [results]);

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      setVisibleCount((prev) => (prev >= sortedResults.length ? prev : prev + ROW_PAGE_SIZE));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedId(initialValue);
      fetchEntities('');
    }
  }, [isOpen, type, initialValue]);

  if (!isOpen) return null;

  const fetchEntities = async (term: string) => {
    setLoading(true);
    try {
      if (type === 'item') {
        try {
          const isNum = /^\d+$/.test(term.trim());
          const effectiveResults = await api.searchEffectiveItems({
            search_id: isNum ? term.trim() : undefined,
            search_name: !isNum && term.trim() ? term.trim() : undefined,
            // No limit: the picker lists every match. Rows are rendered
            // incrementally so a large catalog stays responsive.
          });

          if (effectiveResults && effectiveResults.length > 0) {
            const mapped = effectiveResults.map((r: any) => [
              r.entry,
              r.name,
              r.quality ?? 1,
              r.item_level ?? 0,
              r.required_level ?? 0,
            ]);
            setResults(mapped);
            return;
          }
        } catch (e) {
          console.warn('searchEffectiveItems failed, falling back to SQL:', e);
        }
      }

      if (type === 'faction') {
        try {
          const factions = await api.searchEffectiveFactions(term);
          if (factions) {
            const mapped = factions.map((f: any) => [
              f.id,
              f.name,
              f.description || '',
            ]);
            setResults(mapped);
            return;
          }
        } catch (e) {
          console.warn('searchEffectiveFactions failed, falling back to SQL:', e);
        }
      }

      if (type === 'faction_template') {
        try {
          const templates = await api.searchEffectiveFactionTemplates(term);
          if (templates) {
            const mapped = templates.map((t: any) => [
              t[0],
              t[1],
              t[2],
            ]);
            setResults(mapped);
            return;
          }
        } catch (e) {
          console.warn('searchEffectiveFactionTemplates failed, falling back to SQL:', e);
        }
      }

      if (type === 'emote') {
        try {
          const emotes = await api.searchEffectiveEmotes(term);
          if (emotes) {
            const mapped = emotes.map((em: any) => [
              em[0],
              em[1],
            ]);
            setResults(mapped);
            return;
          }
        } catch (e) {
          console.warn('searchEffectiveEmotes failed, falling back to SQL:', e);
        }
      }

      const query = buildQuery(type, term);
      if (!query) {
        setResults([]);
        return;
      }

      const res = await api.executeSql(query.db, query.sql);
      if (res.success && res.rows) {
        setResults(res.rows);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error('Entity selector query failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Builds the database query for the requested selector type across
   * world and hotfix tables.
   */
  const buildQuery = (
    selType: SelectorType,
    term: string,
  ): { db: 'hotfixes' | 'world'; sql: string } | null => {
    const isNum = /^\d+$/.test(term.trim());
    const safeTerm = escapeSqlString(term.trim());

    switch (selType) {
      case 'spell':
        return {
          db: 'hotfixes',
          sql: isNum
            ? `SELECT ID, Name FROM spell_name WHERE ID = ${parseInt(term)} OR CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR Name LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : `SELECT ID, Name FROM spell_name WHERE Name LIKE '%${safeTerm}%' ORDER BY ID ASC;`,
        };
      case 'item':
        return {
          db: 'hotfixes',
          sql: isNum
            ? `SELECT ID, Display, OverallQualityID, ItemLevel, RequiredLevel FROM item_sparse WHERE ID = ${parseInt(term)} OR CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR Display LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : `SELECT ID, Display, OverallQualityID, ItemLevel, RequiredLevel FROM item_sparse WHERE Display LIKE '%${safeTerm}%' ORDER BY ID ASC;`,
        };
      case 'creature':
        return {
          db: 'world',
          // `rank` is a reserved word in MySQL 8, so every identifier is quoted.
          sql: isNum
            ? `SELECT \`entry\`, \`name\`, \`subname\`, \`minlevel\`, \`maxlevel\`, \`rank\` FROM \`creature_template\` WHERE \`entry\` = ${parseInt(term)} OR CAST(\`entry\` AS CHAR) LIKE '%${safeTerm}%' OR \`name\` LIKE '%${safeTerm}%' ORDER BY \`entry\` ASC;`
            : `SELECT \`entry\`, \`name\`, \`subname\`, \`minlevel\`, \`maxlevel\`, \`rank\` FROM \`creature_template\` WHERE \`name\` LIKE '%${safeTerm}%' OR \`subname\` LIKE '%${safeTerm}%' ORDER BY \`entry\` ASC;`,
        };
      case 'gameobject':
        return {
          db: 'world',
          sql: isNum
            ? `SELECT entry, name, type, displayId FROM gameobject_template WHERE entry = ${parseInt(term)} OR CAST(entry AS CHAR) LIKE '%${safeTerm}%' OR name LIKE '%${safeTerm}%' ORDER BY entry ASC;`
            : `SELECT entry, name, type, displayId FROM gameobject_template WHERE name LIKE '%${safeTerm}%' ORDER BY entry ASC;`,
        };
      case 'quest':
        return {
          db: 'world',
          sql: isNum
            ? `SELECT ID, LogTitle, QuestLevel, MinLevel FROM quest_template WHERE ID = ${parseInt(term)} OR CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR LogTitle LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : `SELECT ID, LogTitle, QuestLevel, MinLevel FROM quest_template WHERE LogTitle LIKE '%${safeTerm}%' ORDER BY ID ASC;`,
        };
      case 'currency':
        return {
          db: 'hotfixes',
          sql: isNum
            ? `SELECT ID, Name, Description FROM currency_types WHERE ID = ${parseInt(term)} OR CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR Name LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : `SELECT ID, Name, Description FROM currency_types WHERE Name LIKE '%${safeTerm}%' ORDER BY ID ASC;`,
        };
      case 'faction':
        return {
          db: 'hotfixes',
          sql: isNum
            ? `SELECT ID, Name, Description FROM faction WHERE ID = ${parseInt(term)} OR CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR Name LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : term.trim()
            ? `SELECT ID, Name, Description FROM faction WHERE Name LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : `SELECT ID, Name, Description FROM faction ORDER BY ID ASC;`,
        };
      case 'faction_template':
        return {
          db: 'hotfixes',
          sql: isNum
            ? `SELECT ft.ID, COALESCE(f.Name, CONCAT('Faction ', ft.Faction)), ft.Faction FROM faction_template ft LEFT JOIN faction f ON f.ID = ft.Faction WHERE ft.ID = ${parseInt(term)} OR CAST(ft.ID AS CHAR) LIKE '%${safeTerm}%' OR ft.Faction = ${parseInt(term)} OR CAST(ft.Faction AS CHAR) LIKE '%${safeTerm}%' OR f.Name LIKE '%${safeTerm}%' ORDER BY ft.ID ASC;`
            : term.trim()
            ? `SELECT ft.ID, COALESCE(f.Name, CONCAT('Faction ', ft.Faction)), ft.Faction FROM faction_template ft LEFT JOIN faction f ON f.ID = ft.Faction WHERE f.Name LIKE '%${safeTerm}%' ORDER BY ft.ID ASC;`
            : `SELECT ft.ID, COALESCE(f.Name, CONCAT('Faction ', ft.Faction)), ft.Faction FROM faction_template ft LEFT JOIN faction f ON f.ID = ft.Faction ORDER BY ft.ID ASC;`,
        };
      case 'display':
        return {
          db: 'hotfixes',
          sql: isNum
            ? `SELECT ID, ModelID, SizeClass, CreatureModelScale FROM creature_display_info WHERE ID = ${parseInt(term)} OR CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR ModelID = ${parseInt(term)} OR CAST(ModelID AS CHAR) LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : term.trim()
            ? `SELECT ID, ModelID, SizeClass, CreatureModelScale FROM creature_display_info WHERE CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR CAST(ModelID AS CHAR) LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : `SELECT ID, ModelID, SizeClass, CreatureModelScale FROM creature_display_info ORDER BY ID ASC;`,
        };
      case 'gameobject_display':
        return {
          db: 'hotfixes',
          sql: isNum
            ? `SELECT ID, FileDataID, GeoBoxMinX, GeoBoxMaxX FROM gameobject_display_info WHERE ID = ${parseInt(term)} OR CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR FileDataID = ${parseInt(term)} OR CAST(FileDataID AS CHAR) LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : term.trim()
            ? `SELECT ID, FileDataID, GeoBoxMinX, GeoBoxMaxX FROM gameobject_display_info WHERE CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR CAST(FileDataID AS CHAR) LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : `SELECT ID, FileDataID, GeoBoxMinX, GeoBoxMaxX FROM gameobject_display_info ORDER BY ID ASC;`,
        };
      case 'sound':
        return {
          db: 'hotfixes',
          sql: isNum
            ? `SELECT ID, SoundType FROM sound_kit WHERE ID = ${parseInt(term)} OR CAST(ID AS CHAR) LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : term.trim()
            ? `SELECT ID, SoundType FROM sound_kit WHERE SoundType LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : `SELECT ID, SoundType FROM sound_kit ORDER BY ID ASC;`,
        };
      case 'emote':
        return {
          db: 'hotfixes',
          sql: isNum
            ? `SELECT ID, Name FROM emotes_text WHERE ID = ${parseInt(term)} OR CAST(ID AS CHAR) LIKE '%${safeTerm}%' OR Name LIKE '%${safeTerm}%' ORDER BY ID ASC;`
            : `SELECT ID, Name FROM emotes_text WHERE Name LIKE '%${safeTerm}%' ORDER BY ID ASC;`,
        };
      default:
        return null;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntities(searchTerm);
  };

  const modalTitle = title || `Select ${type.charAt(0).toUpperCase() + type.slice(1)}`;

  const getIcon = () => {
    switch (type) {
      case 'spell': return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'item': return <Sword className="w-4 h-4 text-blue-600" />;
      case 'creature': return <Users className="w-4 h-4 text-emerald-600" />;
      case 'gameobject':
      case 'gameobject_display': return <Box className="w-4 h-4 text-cyan-600" />;
      case 'quest': return <Scroll className="w-4 h-4 text-amber-600" />;
      case 'currency': return <Shield className="w-4 h-4 text-yellow-600" />;
      case 'faction':
      case 'faction_template': return <Shield className="w-4 h-4 text-blue-600" />;
      case 'sound': return <Volume2 className="w-4 h-4 text-blue-600" />;
      case 'emote': return <Eye className="w-4 h-4 text-rose-600" />;
      default: return <Search className="w-4 h-4 text-blue-600" />;
    }
  };

  const renderRowDetails = (row: any[]) => {
    const id = Number(row[0]);

    switch (type) {
      case 'item': {
        const name = String(row[1] || `Item #${id}`);
        const quality = row[2] ?? 1;
        const ilvl = row[3] ?? 0;
        const reqLvl = row[4] ?? 0;
        return (
          <div>
            <span className="font-semibold text-xs text-slate-900">{name}</span>
            <div className="text-[11px] text-slate-400 font-mono">
              Item Level: {ilvl}{reqLvl > 0 ? ` • Req Level: ${reqLvl}` : ''}
            </div>
          </div>
        );
      }
      case 'faction': {
        const name = String(row[1] || `Faction #${id}`);
        const desc = row[2] ? String(row[2]) : '';
        return (
          <div>
            <span className="font-semibold text-xs text-slate-900">{name}</span>
            {desc && <div className="text-[11px] text-slate-500 line-clamp-1">{desc}</div>}
          </div>
        );
      }
      case 'faction_template': {
        const name = String(row[1] || `FactionTemplate #${id}`);
        const factionId = row[2] !== undefined && row[2] !== null ? Number(row[2]) : null;
        return (
          <div>
            <span className="font-semibold text-xs text-slate-900">{name}</span>
            {factionId !== null && (
              <div className="text-[11px] text-slate-500 font-mono">Faction ID: {factionId}</div>
            )}
          </div>
        );
      }
      case 'gameobject_display': {
        const fileDataId = row[1] ? String(row[1]) : '0';
        const minX = row[2] !== undefined && row[2] !== null ? Number(row[2]).toFixed(2) : '-';
        const maxX = row[3] !== undefined && row[3] !== null ? Number(row[3]).toFixed(2) : '-';
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">FileDataID:</span>
              <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {fileDataId}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5">
              GeoBox: [{minX}, {maxX}]
            </span>
          </div>
        );
      }
      case 'display': {
        const modelId = row[1] ? String(row[1]) : '0';
        const scale = row[3] ? Number(row[3]).toFixed(2) : '1.00';
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs">Model ID:</span>
              <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {modelId}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Scale: {scale}</span>
          </div>
        );
      }
      case 'creature': {
        const name = String(row[1] || 'Unnamed Creature');
        const subname = row[2] ? String(row[2]) : '';
        const minLvl = row[3] ?? 1;
        const maxLvl = row[4] ?? 1;
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-900">{name}</span>
              {subname && <span className="text-[11px] text-slate-500 italic">&lt;{subname}&gt;</span>}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Level {minLvl === maxLvl ? minLvl : `${minLvl}-${maxLvl}`}</span>
          </div>
        );
      }
      case 'gameobject': {
        const name = String(row[1] || 'Unnamed GameObject');
        const goType = row[2] ?? 0;
        const dispId = row[3] ?? 0;
        return (
          <div>
            <span className="font-semibold text-xs text-slate-900">{name}</span>
            <div className="text-[11px] text-slate-400 font-mono">
              Type: {goType} • DisplayID: {dispId}
            </div>
          </div>
        );
      }
      case 'quest': {
        const title = String(row[1] || 'Unnamed Quest');
        const questLvl = row[2] ?? 0;
        const minLvl = row[3] ?? 0;
        return (
          <div>
            <span className="font-semibold text-xs text-slate-900">{title}</span>
            <div className="text-[11px] text-slate-400 font-mono">
              Quest Level: {questLvl} • Min Level: {minLvl}
            </div>
          </div>
        );
      }
      case 'sound': {
        const soundType = row[1] ?? 'Sound';
        return (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">Sound Type:</span>
            <span className="font-semibold text-xs text-slate-900">{soundType}</span>
          </div>
        );
      }
      case 'emote': {
        const emoteName = String(row[1] || 'Emote');
        const category = row[2] ? String(row[2]) : '';
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-slate-900">{emoteName}</span>
            {category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-rose-50 text-rose-700 border border-rose-200">
                {category}
              </span>
            )}
          </div>
        );
      }
      default: {
        const name = String(row[1] || 'Unknown');
        const extra = row[2] ? String(row[2]) : '';
        return (
          <div>
            <span className="font-semibold text-xs text-slate-900">{name}</span>
            {extra && <div className="text-[11px] text-slate-400 font-mono">{extra}</div>}
          </div>
        );
      }
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'display':
        return 'Filter by Display ID or Model ID';
      case 'gameobject_display':
        return 'Filter by Display ID or File Data ID';
      case 'sound':
        return 'Filter by Sound ID or Type';
      default:
        return 'Filter by ID or Name';
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'display':
        return 'Search Display ID or Model ID...';
      case 'gameobject_display':
        return 'Search Display ID or File Data ID...';
      case 'sound':
        return 'Search Sound ID or Type...';
      case 'faction_template':
        return 'Search Template ID or Faction...';
      default:
        return `Search ${type.replace(/_/g, ' ')} name or ID...`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">{modalTitle}</h3>
              <span className="text-[11px] text-slate-500 font-medium">{getSubtitle()}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex-shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs pl-9 pr-4 py-2 rounded focus:outline-none focus:border-blue-500 focus:bg-white transition-colors shadow-2xs"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </form>
        </div>

        {/* Table View */}
        <div
          onScroll={handleListScroll}
          className="flex-1 overflow-y-auto min-h-[260px] max-h-[420px] bg-white"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10 select-none">
                <th
                  onClick={() => toggleSort('id')}
                  className="py-2.5 px-4 w-28 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Click to sort by ID"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>ID / Entry</span>
                    {sortColumn === 'id' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-2.5 px-4 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Click to sort by Name"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Description / Details</span>
                    {sortColumn === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedResults.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-slate-400 italic">
                    {loading ? 'Searching database...' : 'No matching entries found.'}
                  </td>
                </tr>
              ) : (
                visibleResults.map((row, idx) => {
                  const id = Number(row[0]);
                  const name = String(row[1] || 'Unknown');
                  const isSelected = selectedId === id;

                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedId(id)}
                      onDoubleClick={() => {
                        onSelect(id, name, row);
                        onClose();
                      }}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 text-blue-900 font-semibold'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-slate-50/50 hover:bg-slate-100/60'
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center">
                        <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded border shadow-2xs inline-block ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-blue-700 border-slate-200'
                        }`}>
                          {id}
                        </span>
                      </td>

                      <td className="py-2.5 px-4">
                        {renderRowDetails(row)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs flex-shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            {visibleResults.length < sortedResults.length
              ? `Showing ${visibleResults.length} of ${sortedResults.length} results • Scroll for more`
              : `${sortedResults.length} results`}
            {' • Double click row to select'}
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-1.5 rounded shadow-2xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const found = results.find(r => Number(r[0]) === selectedId);
                onSelect(selectedId, found ? String(found[1]) : undefined, found);
                onClose();
              }}
              disabled={selectedId === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm Selection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
