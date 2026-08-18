import { useCallback, useMemo, useState } from 'react';
import { api } from '../lib/ipc';

/**
 * Shared behaviour for a single-row SQL editor: the loaded snapshot, the edited
 * record, dirty tracking, and the copy / execute / reload actions.
 *
 * After a successful execute the row is re-read from the database, so the
 * editor shows what was actually stored rather than what was sent. That matters
 * whenever the column is narrower than the input (a truncated `char`) or the
 * server normalises the value.
 */
export interface SqlEditorRecord {
  [key: string]: unknown;
  _isNew?: boolean;
}

export interface UseSqlEditorStateOptions<T extends SqlEditorRecord> {
  /** Database the statements run against, e.g. `world`. */
  database: string;
  record: T;
  setRecord: (record: T) => void;
  original: T | null;
  setOriginal: (record: T | null) => void;
  generateDiffQuery: (original: T | null, current: T) => string;
  generateFullQuery: (current: T) => string;
  isModified: (original: T | null, current: T) => boolean;
  /** Re-reads the row after a successful execute; return null if it vanished. */
  reload: () => Promise<T | null>;
}

export function useSqlEditorState<T extends SqlEditorRecord>({
  database,
  record,
  setRecord,
  original,
  setOriginal,
  generateDiffQuery,
  generateFullQuery,
  isModified,
  reload,
}: UseSqlEditorStateOptions<T>) {
  const [queryMode, setQueryMode] = useState<'diff' | 'full'>('diff');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeQueryText = useMemo(
    () => (queryMode === 'diff' ? generateDiffQuery(original, record) : generateFullQuery(record)),
    [queryMode, original, record, generateDiffQuery, generateFullQuery]
  );

  const isDirty = useMemo(() => isModified(original, record), [original, record, isModified]);

  const flashCopied = useCallback(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleCopy = useCallback(() => {
    if (!activeQueryText) return;
    navigator.clipboard.writeText(activeQueryText);
    flashCopied();
  }, [activeQueryText, flashCopied]);

  /** Runs the active statement and adopts whatever the database ended up with. */
  const execute = useCallback(
    async (alsoCopy: boolean): Promise<boolean> => {
      if (!activeQueryText) return false;
      setSaving(true);
      setError(null);
      try {
        await api.executeSql(database, activeQueryText);
        if (alsoCopy) {
          navigator.clipboard.writeText(activeQueryText);
          flashCopied();
        }

        const stored = await reload();
        if (stored) {
          setRecord(stored);
          setOriginal(JSON.parse(JSON.stringify(stored)));
        } else {
          // The row could not be re-read; keep the edited values but treat them
          // as saved so the editor does not claim unsaved changes forever.
          const saved = { ...record, _isNew: false } as T;
          setRecord(saved);
          setOriginal(JSON.parse(JSON.stringify(saved)));
        }
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [activeQueryText, database, flashCopied, record, reload, setOriginal, setRecord]
  );

  const handleExecute = useCallback(() => execute(false), [execute]);
  const handleExecuteAndCopy = useCallback(() => execute(true), [execute]);

  /** Discards local edits and re-reads the row. */
  const handleReload = useCallback(async () => {
    setError(null);
    const stored = await reload();
    if (stored) {
      setRecord(stored);
      setOriginal(JSON.parse(JSON.stringify(stored)));
    } else if (original) {
      setRecord(JSON.parse(JSON.stringify(original)));
    }
  }, [original, reload, setOriginal, setRecord]);

  return {
    queryMode,
    setQueryMode,
    activeQueryText,
    isDirty,
    saving,
    copied,
    error,
    handleCopy,
    handleExecute,
    handleExecuteAndCopy,
    handleReload,
  };
}
